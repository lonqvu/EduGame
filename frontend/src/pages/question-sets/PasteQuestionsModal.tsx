import { App, Input, Modal } from 'antd'
import { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { QuestionRequest } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { MAX_QUESTIONS, parsePastedQuestions } from '@/utils/questionSets'

interface PasteQuestionsModalProps {
  open: boolean
  /** Questions already in the set */
  questionCount: number
  onClose: () => void
  onAdd: (questions: QuestionRequest[]) => Promise<unknown>
}

/** Many questions at once, one per line; lines that cannot become a question are listed and skipped. */
export function PasteQuestionsModal(props: PasteQuestionsModalProps) {
  // Each opening starts empty.
  return props.open ? <PasteDialog {...props} /> : null
}

function PasteDialog({ questionCount, onClose, onAdd }: PasteQuestionsModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const lines = useMemo(() => parsePastedQuestions(text), [text])
  const questions = lines.flatMap((l) => (l.question ? [l.question] : []))
  const problems = lines.filter((l) => l.problem)
  const room = MAX_QUESTIONS - questionCount
  const tooMany = questions.length > room

  const add = async () => {
    setSaving(true)
    try {
      await onAdd(questions)
      message.success(t('questionSets.add.added', { count: questions.length }) + (problems.length ? t('questionSets.add.skipped', { count: problems.length }) : ''))
      onClose()
    } catch (error) {
      message.error(apiErrorMessage(error))
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={t('questionSets.paste.title')}
      okText={questions.length ? t('questionSets.add.submit', { count: questions.length }) : t('questionSets.question.add')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !questions.length || tooMany }}
      confirmLoading={saving}
      onOk={() => void add()}
      onCancel={onClose}
      width={640}
    >
      <div className="flex flex-col gap-3 pt-1">
        <div className="rounded-[14px] bg-surface-soft px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
          <Trans i18nKey="questionSets.paste.intro" components={{ b: <b /> }} />
          <ul className="my-1 pl-5">
            <li>
              <Trans i18nKey="questionSets.paste.multipleChoice" components={{ code: <code /> }} />
            </li>
            <li>
              <Trans i18nKey="questionSets.paste.shortAnswer" components={{ code: <code /> }} />
            </li>
            <li>
              <Trans i18nKey="questionSets.paste.trueFalse" components={{ code: <code /> }} />
            </li>
          </ul>
        </div>
        <Input.TextArea
          aria-label={t('questionSets.paste.label')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoSize={{ minRows: 7, maxRows: 14 }}
          placeholder={t('questionSets.paste.example')}
          autoFocus
        />
        <div role="status" className="flex flex-col gap-1.5 text-[14px]">
          {lines.length > 0 && (
            <span className={tooMany ? 'font-bold text-danger' : 'text-success'}>
              {tooMany
                ? t('questionSets.add.tooMany', { room, max: MAX_QUESTIONS, extra: questions.length - room })
                : t('questionSets.add.willAdd', { count: questions.length })}
            </span>
          )}
          {problems.length > 0 && (
            <ul className="m-0 flex max-h-[120px] list-none flex-col gap-1 overflow-y-auto rounded-[12px] bg-[#FFF6E5] p-3 text-sun-ink">
              {problems.map((p) => (
                <li key={p.line}>
                  {t('questionSets.add.skippedLine', { line: p.line, problem: p.problem })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
