import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClassStore } from '@/store/classStore'
import { apiErrorMessage } from '@/utils/apiError'
import { MAX_STUDENTS } from '@/utils/classrooms'
import { numberNames, parseNames, rememberedNames, rememberNames } from '@/utils/quickNames'

const MIN_NAMES = 2
const GRADES = [1, 2, 3, 4, 5]

/**
 * The name tools without a class: paste the class list (one name a line) or spin by roll number, and play at once.
 * Making a class of it is offered, never required. Drawn on the projector stage, so everything is big.
 */
export function QuickNames() {
  const { t } = useTranslation()
  const startQuickList = useClassStore((s) => s.startQuickList)
  const saveQuickList = useClassStore((s) => s.saveQuickList)
  const [text, setText] = useState(rememberedNames)
  const [count, setCount] = useState(30)
  const [save, setSave] = useState(false)
  const [className, setClassName] = useState('')
  const [grade, setGrade] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const names = parseNames(text)
  const enough = names.length >= MIN_NAMES

  const start = async () => {
    if (!enough) return
    rememberNames(names)
    startQuickList(names)
    if (!save || !className.trim()) return
    setSaving(true)
    setError(null)
    try {
      await saveQuickList(className.trim(), grade)
    } catch (e) {
      // The names are already on screen; only the class was not made.
      setError(t('classes.quick.saveFailed', { reason: apiErrorMessage(e) }))
    } finally {
      setSaving(false)
    }
  }

  const field =
    'rounded-[14px] border-2 border-line bg-white px-4 font-[inherit] text-[18px] text-ink outline-none focus:border-primary'
  const button =
    'h-[52px] cursor-pointer rounded-full border-0 px-7 font-[inherit] text-[20px] font-extrabold disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <section aria-label={t('classes.quick.label')} className="flex h-full items-center justify-center p-8">
      <div className="flex w-[900px] flex-col gap-4 rounded-[32px] bg-white px-10 py-8 shadow-[0_20px_50px_rgba(31,42,68,0.18)]">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[36px] leading-tight font-extrabold text-[#1A2440]">{t('classes.quick.title')}</h1>
          <p className="m-0 text-[18px] text-ink-soft">{t('classes.quick.text')}</p>
        </div>
        <textarea
          aria-label={t('classes.quick.names')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          autoFocus
          placeholder={t('classes.quick.placeholder')}
          className={`${field} resize-none py-3 leading-snug`}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-3 text-[17px] font-bold">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="size-5 accent-primary" />
            {t('classes.quick.save')}
          </label>
          <button type="button" onClick={() => void start()} disabled={!enough || saving} className={`${button} bg-primary text-white`}>
            {saving ? t('classes.quick.saving') : enough ? t('classes.quick.start', { count: names.length }) : t('classes.quick.needTwo')}
          </button>
        </div>
        {save && (
          <div className="flex flex-wrap items-center gap-3 text-[17px]">
            <input
              aria-label={t('classes.quick.className')}
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              maxLength={50}
              placeholder={t('classes.quick.classNamePlaceholder')}
              className={`${field} h-[48px] w-[240px]`}
            />
            <select aria-label={t('classes.quick.grade')} value={grade} onChange={(e) => setGrade(Number(e.target.value))} className={`${field} h-[48px]`}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {t('classes.grade', { grade: g })}
                </option>
              ))}
            </select>
            {!className.trim() && <span className="text-ink-muted">{t('classes.quick.nameToSave')}</span>}
          </div>
        )}
        {error && (
          <p role="alert" className="m-0 text-[16px] font-bold text-danger">
            {error}
          </p>
        )}
        <div className="flex items-center gap-4 border-t border-line-soft pt-4 text-[18px]">
          <span className="font-bold text-ink-soft">{t('classes.quick.numbers')}</span>
          <input
            type="number"
            aria-label={t('classes.quick.count')}
            min={MIN_NAMES}
            max={MAX_STUDENTS}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className={`${field} h-[48px] w-[100px] text-center`}
          />
          <button
            type="button"
            onClick={() => startQuickList(numberNames(Math.max(MIN_NAMES, count)))}
            disabled={!(count >= MIN_NAMES)}
            className={`${button} bg-primary-soft text-primary-ink`}
          >
            {t('classes.quick.useNumbers')}
          </button>
        </div>
      </div>
    </section>
  )
}
