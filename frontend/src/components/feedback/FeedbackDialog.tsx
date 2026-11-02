import { App, Checkbox, Input, Modal } from 'antd'
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { sendFeedback } from '@/api/feedbackApi'
import { CameraIcon, CheckIcon, ImageIcon, TrashIcon } from '@/components/ui/icons'
import { useFeedbackStore } from '@/store/feedbackStore'
import { useProfileStore } from '@/store/profileStore'
import { apiErrorMessage } from '@/utils/apiError'
import { FEEDBACK_KINDS, feedbackRequest, MAX_FEEDBACK_MESSAGE, prepareScreenshot, RATINGS } from '@/utils/feedback'
import { captureScreen } from '@/utils/screenshot'

/**
 * "Góp ý cho Lớp Vui": what about (bug, idea, praise), how happy the teacher is, their words, a screenshot (taken of
 * the page, picked, pasted or dropped) and whether the team may write back. The page, browser window and app build
 * go with it. What is typed stays when the dialog closes, until it is sent.
 */
export function FeedbackDialog() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const open = useFeedbackStore((s) => s.open)
  const draft = useFeedbackStore((s) => s.draft)
  const change = useFeedbackStore((s) => s.change)
  const close = useFeedbackStore((s) => s.close)
  const clear = useFeedbackStore((s) => s.clear)
  const profile = useProfileStore((s) => s.profile)
  const loadProfile = useProfileStore((s) => s.load)
  const location = useLocation()
  const [sending, setSending] = useState(false)
  const [preparing, setPreparing] = useState<'capture' | 'file' | null>(null)
  /** Sent: the thanks are shown until the dialog closes. */
  const [sent, setSent] = useState<{ willReply: boolean } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && !profile) void loadProfile()
  }, [open, profile, loadProfile])

  const preview = useMemo(() => (draft.screenshot ? URL.createObjectURL(draft.screenshot) : null), [draft.screenshot])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const email = profile?.email
  const kind = FEEDBACK_KINDS.find((k) => k.kind === draft.kind) ?? FEEDBACK_KINDS[0]
  const busy = sending || preparing !== null
  const canSend = draft.message.trim().length > 0 && !busy

  const attach = async (file: File) => {
    setPreparing('file')
    try {
      change({ screenshot: await prepareScreenshot(file) })
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : t('feedback.imageUnreadable'))
    } finally {
      setPreparing(null)
    }
  }

  const capture = async () => {
    setPreparing('capture')
    try {
      change({ screenshot: await prepareScreenshot(await captureScreen()) })
    } catch {
      message.error(t('feedback.captureFailed'))
    } finally {
      setPreparing(null)
    }
  }

  const pastedOrDropped = (files: FileList | undefined) => [...(files ?? [])].find((f) => f.type.startsWith('image/'))

  const onPaste = (e: ClipboardEvent) => {
    const file = pastedOrDropped(e.clipboardData?.files)
    if (!file || busy) return
    e.preventDefault()
    void attach(file)
  }

  const onDrop = (e: DragEvent) => {
    const file = pastedOrDropped(e.dataTransfer?.files)
    if (!file) return
    e.preventDefault()
    if (!busy) void attach(file)
  }

  const submit = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const where = { pathname: location.pathname, search: location.search, width: window.innerWidth, height: window.innerHeight }
      const request = feedbackRequest(draft, where, Boolean(email))
      await sendFeedback(request, draft.screenshot)
      setSent({ willReply: request.contactOk })
      clear()
    } catch (e) {
      message.error(apiErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const footer = sent ? (
    <button type="button" onClick={close} className={PRIMARY_BUTTON}>
      {t('common.done')}
    </button>
  ) : (
    <div className="flex flex-wrap items-center justify-end gap-2.5">
      <button type="button" onClick={close} disabled={sending} className={SECONDARY_BUTTON}>
        {t('common.later')}
      </button>
      <button type="button" onClick={() => void submit()} disabled={!canSend} aria-busy={sending} className={PRIMARY_BUTTON}>
        {sending ? t('feedback.sending') : t('feedback.send')}
      </button>
    </div>
  )

  return (
    <Modal
      open={open}
      title={t('feedback.title')}
      onCancel={close}
      closable={!sending}
      mask={{ closable: !sending }}
      keyboard={!sending}
      afterClose={() => setSent(null)}
      footer={footer}
      width={580}
    >
      {sent ? (
        <div role="status" className="flex flex-col items-center px-2 pt-6 pb-2 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-[#E3F6EC] text-success">
            <CheckIcon size={34} strokeWidth={2.6} />
          </span>
          <h3 className="m-0 mt-4 text-[22px] font-black text-ink">{t('feedback.thanksTitle')}</h3>
          <p className="m-0 mt-2 max-w-[400px] text-[15px] leading-[1.55] text-ink-soft">
            {sent.willReply ? t('feedback.thanksWillReply') : t('feedback.thanks')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-1" onPaste={onPaste} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <p className="m-0 text-[14.5px] text-ink-soft">{t('feedback.intro')}</p>

          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 p-0 text-[14.5px] font-bold text-ink">{t('feedback.kindLegend')}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FEEDBACK_KINDS.map((k) => (
                <label key={k.kind} className={`${CHIP} ${draft.kind === k.kind ? CHIP_ON : CHIP_OFF}`}>
                  <input
                    type="radio"
                    name="feedback-kind"
                    value={k.kind}
                    checked={draft.kind === k.kind}
                    onChange={() => change({ kind: k.kind })}
                    className="sr-only"
                  />
                  <span aria-hidden="true">{k.emoji}</span>
                  {k.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 p-0 text-[14.5px] font-bold text-ink">
              {t('feedback.ratingLegend')} <span className="font-semibold text-ink-muted">({t('common.optional')})</span>
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              {RATINGS.map((r) => (
                <label
                  key={r.value}
                  title={r.label}
                  className={`flex size-11 cursor-pointer items-center justify-center rounded-full border-2 text-[24px] transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 ${
                    draft.rating === r.value
                      ? 'scale-110 border-primary bg-primary-soft'
                      : `border-transparent bg-[#F4F6FA] hover:scale-105 ${draft.rating ? 'opacity-50 hover:opacity-100' : ''}`
                  }`}
                >
                  <input
                    type="radio"
                    name="feedback-rating"
                    value={r.value}
                    aria-label={r.label}
                    checked={draft.rating === r.value}
                    onChange={() => change({ rating: r.value })}
                    // Clicking the chosen face again clears it.
                    onClick={() => {
                      if (draft.rating === r.value) change({ rating: null })
                    }}
                    className="sr-only"
                  />
                  <span aria-hidden="true">{r.emoji}</span>
                </label>
              ))}
              <span className="ml-1 text-[14px] font-semibold text-ink-soft">{RATINGS.find((r) => r.value === draft.rating)?.label}</span>
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor="feedback-message" className="text-[14.5px] font-bold text-ink">
              {t('feedback.message')}
            </label>
            <Input.TextArea
              id="feedback-message"
              autoFocus
              value={draft.message}
              onChange={(e) => change({ message: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  void submit()
                }
              }}
              placeholder={kind.placeholder}
              maxLength={MAX_FEEDBACK_MESSAGE}
              showCount
              autoSize={{ minRows: 3, maxRows: 8 }}
              className="text-[15px]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[14.5px] font-bold text-ink">
              {t('feedback.screenshot')} <span className="font-semibold text-ink-muted">({t('common.optional')})</span>
            </span>
            {preview && draft.screenshot ? (
              <div className="flex items-center gap-3 rounded-[14px] border border-line p-2">
                <a href={preview} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={preview} alt={t('feedback.screenshotAlt')} className="block h-[72px] w-[128px] rounded-[10px] border border-line-soft object-cover object-top" />
                </a>
                <span className="min-w-0 flex-1 text-[14px] text-ink-soft">
                  {t('feedback.attached', { size: Math.max(1, Math.round(draft.screenshot.size / 1024)) })}
                </span>
                <button type="button" onClick={() => change({ screenshot: null })} disabled={sending} className={SMALL_BUTTON}>
                  <TrashIcon size={16} />
                  {t('feedback.removeScreenshot')}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void capture()} disabled={busy} aria-busy={preparing === 'capture'} className={SMALL_BUTTON}>
                  <CameraIcon size={17} />
                  {preparing === 'capture' ? t('feedback.capturing') : t('feedback.capture')}
                </button>
                <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} aria-busy={preparing === 'file'} className={SMALL_BUTTON}>
                  <ImageIcon size={17} />
                  {preparing === 'file' ? t('feedback.readingImage') : t('feedback.pickImage')}
                </button>
                <span className="text-[13px] text-ink-muted">{t('feedback.orPaste')}</span>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void attach(file)
                // The same file can be picked again after a refusal.
                e.target.value = ''
              }}
            />
          </div>

          {email ? (
            <Checkbox checked={draft.contactOk} onChange={(e) => change({ contactOk: e.target.checked })}>
              <span className="text-[14.5px]">
                <Trans i18nKey="feedback.contactOk" values={{ email }} components={{ b: <b /> }} />
              </span>
            </Checkbox>
          ) : (
            profile && <p className="m-0 text-[13.5px] text-ink-muted">{t('feedback.noEmail')}</p>
          )}
          <p className="m-0 -mt-2 text-[13px] text-ink-muted">{t('feedback.context')}</p>
        </div>
      )}
    </Modal>
  )
}

const CHIP =
  'flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[12px] border text-[14.5px] font-bold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2'
const CHIP_ON = 'border-primary bg-primary-soft text-primary'
const CHIP_OFF = 'border-line bg-white text-ink hover:border-primary'
const PRIMARY_BUTTON =
  'flex h-11 cursor-pointer items-center rounded-[12px] border-0 bg-primary px-6 font-[inherit] text-[15px] font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100'
const SECONDARY_BUTTON =
  'flex h-11 cursor-pointer items-center rounded-[12px] border border-line bg-white px-5 font-[inherit] text-[15px] font-bold text-ink-soft hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
const SMALL_BUTTON =
  'flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 font-[inherit] text-[14px] font-bold text-ink hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60'
