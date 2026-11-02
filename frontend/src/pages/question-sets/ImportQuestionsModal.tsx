import { App, Button, Modal, Spin, Upload } from 'antd'
import i18n from 'i18next'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { DocumentIcon, FileTextIcon } from '@/components/ui/icons'
import type { QuestionRequest } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { readSheetFile, SheetFileError } from '@/utils/classListFile'
import { type ImportedKind, type ImportedQuestion, KIND_LABELS, parseQuestionRows, QUESTION_TEMPLATE } from '@/utils/questionFile'
import { MAX_QUESTIONS } from '@/utils/questionSets'

interface ImportQuestionsModalProps {
  open: boolean
  /** Questions already in the set */
  questionCount: number
  onClose: () => void
  onAdd: (questions: QuestionRequest[]) => Promise<unknown>
}

const KIND_STYLES: Record<ImportedKind, string> = {
  MULTIPLE_CHOICE: 'bg-primary-soft text-primary-ink',
  SHORT_ANSWER: 'bg-[#EDE4FF] text-[#7448D6]',
  TRUE_FALSE: 'bg-[#E3F6EC] text-success',
}

/**
 * "Nhập từ file": the teacher picks an Excel or CSV file of questions (the template's columns), checks what each row
 * became, then adds them at the end of the set. Rows that cannot become a question are listed and skipped. The file
 * never leaves the browser: only the questions are sent.
 */
export function ImportQuestionsModal(props: ImportQuestionsModalProps) {
  // Each opening starts from choosing a file.
  return props.open ? <ImportDialog {...props} /> : null
}

function ImportDialog({ questionCount, onClose, onAdd }: ImportQuestionsModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [loaded, setLoaded] = useState<{ fileName: string; rows: ImportedQuestion[] }>()
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const read = async (file: File) => {
    setReading(true)
    setError('')
    try {
      const rows = parseQuestionRows(await readSheetFile(file))
      if (!rows.length) throw new SheetFileError(t('questionSets.import.noQuestions'))
      setLoaded({ fileName: file.name, rows })
    } catch (e) {
      setError(e instanceof SheetFileError ? e.message : t('questionSets.import.unreadable'))
    } finally {
      setReading(false)
    }
  }

  const found = (loaded?.rows ?? []).flatMap(({ row, question, kind }) => (question && kind ? [{ row, question, kind }] : []))
  const problems = loaded?.rows.filter((r) => r.problem) ?? []
  const room = MAX_QUESTIONS - questionCount
  const tooMany = found.length > room

  const add = async () => {
    setSaving(true)
    try {
      await onAdd(found.map((r) => r.question))
      message.success(t('questionSets.add.added', { count: found.length }) + (problems.length ? t('questionSets.add.skipped', { count: problems.length }) : ''))
      onClose()
    } catch (e) {
      message.error(apiErrorMessage(e))
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={t('questionSets.import.title')}
      onCancel={onClose}
      width={680}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        loaded && (
          <Button key="add" type="primary" loading={saving} disabled={!found.length || tooMany} onClick={() => void add()}>
            {found.length ? t('questionSets.add.submit', { count: found.length }) : t('questionSets.question.add')}
          </Button>
        ),
      ]}
    >
      {!loaded ? (
        <div className="flex flex-col gap-3 pt-2">
          <Upload.Dragger
            accept=".xlsx,.csv,.txt"
            showUploadList={false}
            disabled={reading}
            beforeUpload={(file) => {
              void read(file)
              return false
            }}
          >
            <div className="flex flex-col items-center gap-2 px-4 py-6">
              {reading ? (
                <Spin />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <FileTextIcon size={28} />
                </span>
              )}
              <span className="text-[16px] font-extrabold text-ink">{reading ? t('questionSets.import.reading') : t('questionSets.import.drop')}</span>
              <span className="text-[13.5px] text-ink-muted">{t('questionSets.import.hint')}</span>
            </div>
          </Upload.Dragger>
          {error && (
            <p role="alert" className="m-0 rounded-[12px] bg-[#FDECEC] px-3.5 py-2.5 text-[14px] font-bold text-danger">
              {error}
            </p>
          )}
          <Columns />
          <a href={QUESTION_TEMPLATE} download="mau-cau-hoi.xlsx" className="inline-flex items-center gap-1.5 self-start text-[14px] font-bold">
            <DocumentIcon size={16} /> {t('questionSets.import.template')}
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-surface-soft px-3.5 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-[14px] font-bold">
              <FileTextIcon size={18} className="shrink-0 text-primary" />
              <span className="truncate">{loaded.fileName}</span>
            </span>
            <Button size="small" type="link" onClick={() => setLoaded(undefined)} className="px-0 font-bold">
              {t('questionSets.import.otherFile')}
            </Button>
          </div>

          {found.length > 0 && (
            <ol aria-label={t('questionSets.import.inFile')} className="m-0 flex max-h-[320px] list-none flex-col overflow-y-auto rounded-[12px] border border-line-soft p-0">
              {found.map(({ row, question: q, kind }) => (
                <li key={row} className="flex items-start gap-3 border-b border-line-soft px-3 py-2.5 last:border-b-0">
                  <span className="w-[54px] shrink-0 pt-0.5 text-[12.5px] text-ink-muted tabular-nums">{t('questionSets.import.row', { row })}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[14.5px] font-bold break-words">{q.text}</span>
                    <span className="text-[13px] break-words text-ink-muted">{answersOf(q, kind)}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-extrabold ${KIND_STYLES[kind]}`}>{KIND_LABELS[kind]}</span>
                </li>
              ))}
            </ol>
          )}

          {problems.length > 0 && (
            <ul aria-label={t('questionSets.import.skippedRows')} className="m-0 flex max-h-[120px] list-none flex-col gap-1 overflow-y-auto rounded-[12px] bg-[#FFF6E5] p-3 text-[14px] text-sun-ink">
              {problems.map((p) => (
                <li key={p.row}>
                  {t('questionSets.add.skippedLine', { line: p.row, problem: p.problem })}
                </li>
              ))}
            </ul>
          )}

          <p role="status" className={`m-0 text-[14px] ${tooMany ? 'font-bold text-danger' : found.length ? 'text-success' : 'text-ink-muted'}`}>
            {tooMany
              ? t('questionSets.import.tooMany', { room, max: MAX_QUESTIONS, extra: found.length - room })
              : found.length
                ? t('questionSets.add.willAdd', { count: found.length })
                : t('questionSets.import.nothing')}
          </p>
        </div>
      )}
    </Modal>
  )
}

/** The template's columns and how a row becomes each kind of question. */
const COLUMNS = ['question', 'correct', 'wrong1', 'wrong2', 'wrong3', 'explanation'] as const

function Columns() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 rounded-[14px] bg-surface-soft px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
      <span className="font-bold text-ink">{t('questionSets.import.columnsTitle')}</span>
      <div className="flex flex-wrap gap-1.5">
        {COLUMNS.map((c) => (
          <span key={c} className={`rounded-[8px] px-2 py-0.5 text-[12.5px] font-bold ${c === 'correct' ? 'bg-[#E3F6EC] text-success' : 'bg-white text-ink'}`}>
            {t(`questionSets.import.columns.${c}`)}
          </span>
        ))}
      </div>
      <ul className="m-0 pl-5">
        <li>
          <Trans i18nKey="questionSets.import.multipleChoice" components={{ b: <b /> }} />
        </li>
        <li>
          <Trans i18nKey="questionSets.import.shortAnswer" components={{ b: <b /> }} />
        </li>
        <li>
          <Trans i18nKey="questionSets.import.trueFalse" components={{ b: <b /> }} />
        </li>
      </ul>
    </div>
  )
}

/** "✓ Hà Nội · Huế · Đà Nẵng", "Đáp án: Con mèo", "✓ Đúng". */
function answersOf(q: QuestionRequest, kind: ImportedKind): string {
  if (kind === 'SHORT_ANSWER') return i18n.t('questionSets.import.answer', { answer: q.answer })
  if (kind === 'TRUE_FALSE') return `✓ ${q.options?.[q.correctOption ?? 0]}`
  return (q.options ?? []).map((o, i) => (i === q.correctOption ? `✓ ${o}` : o)).join(' · ')
}
