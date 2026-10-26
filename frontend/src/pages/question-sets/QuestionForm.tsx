import { App, Button, Input, Segmented } from 'antd'
import { useState } from 'react'
import { CloseIcon, PlusIcon } from '@/components/ui/icons'
import type { QuestionRequest, QuestionResponse, QuestionType } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { OPTION_LETTERS } from '@/utils/gameItems'
import {
  draftOf,
  draftProblem,
  draftToRequest,
  emptyDraft,
  MAX_ANSWER,
  MAX_OPTION_TEXT,
  MAX_OPTIONS,
  MAX_TEXT,
  MIN_OPTIONS,
  type QuestionDraft,
} from '@/utils/questionSets'

interface QuestionFormProps {
  /** The question being edited; none to write a new one. */
  question?: QuestionResponse
  /** Its number in the set, for the title ("Câu 3") */
  number: number
  /** Type a new question starts with (the last one written). */
  defaultType?: QuestionType
  onClose: () => void
  /** Saves; rejects with the API error to show. */
  onSave: (request: QuestionRequest) => Promise<unknown>
}

/**
 * Write or edit one question in place, in the list of the set: multiple choice with its right option, or short
 * answer. Ctrl+Enter saves (and starts the next new question). Mounted afresh for each question.
 */
export function QuestionForm({ question, number, defaultType, onClose, onSave }: QuestionFormProps) {
  const { message } = App.useApp()
  const [draft, setDraft] = useState<QuestionDraft>(() => (question ? draftOf(question) : emptyDraft(defaultType)))
  const [count, setCount] = useState(number)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const problem = draftProblem(draft)
  const editing = !!question

  const change = (patch: Partial<QuestionDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const setOption = (index: number, text: string) => change({ options: draft.options.map((o, i) => (i === index ? text : o)) })
  const removeOption = (index: number) =>
    change({
      options: draft.options.filter((_, i) => i !== index),
      correctOption: index < draft.correctOption ? draft.correctOption - 1 : index === draft.correctOption ? 0 : draft.correctOption,
    })

  /** Saves; "next" keeps the dialog open with an empty question of the same type. */
  const save = async (next: boolean) => {
    setTried(true)
    if (problem) return
    setSaving(true)
    try {
      await onSave(draftToRequest(draft))
      if (next) {
        message.success(`Đã thêm câu ${count}`)
        setDraft(emptyDraft(draft.type))
        setCount((c) => c + 1)
        setTried(false)
      } else {
        onClose()
      }
    } catch (error) {
      message.error(apiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const title = editing ? `Sửa câu ${number}` : `Câu hỏi mới (câu ${count})`

  return (
    <section
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          void save(!editing)
        }
        if (e.key === 'Escape') onClose()
      }}
      className="rounded-[16px] border-2 border-primary bg-white p-3.5 shadow-[0_8px_22px_rgba(53,99,233,0.15)] sm:p-4"
    >
      <h3 className="m-0 mb-3 flex items-center gap-2 text-[15px] font-black">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-[13px] text-primary tabular-nums">{editing ? number : count}</span>
        {title}
      </h3>
      <div className="flex flex-col gap-3.5">
        <Segmented<QuestionType>
          block
          value={draft.type}
          onChange={(type) => change({ type })}
          options={[
            { value: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm' },
            { value: 'SHORT_ANSWER', label: 'Tự luận (trả lời ngắn)' },
          ]}
          aria-label="Loại câu hỏi"
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-bold text-ink-soft">Câu hỏi</span>
          <Input.TextArea
            value={draft.text}
            onChange={(e) => change({ text: e.target.value })}
            autoSize={{ minRows: 2, maxRows: 5 }}
            maxLength={MAX_TEXT}
            placeholder="VD: 25 + 13 = ?"
            autoFocus
          />
        </label>

        {draft.type === 'MULTIPLE_CHOICE' ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 p-0 text-[14px] font-bold text-ink-soft">Đáp án (chọn ô tròn ở đáp án đúng)</legend>
            {draft.options.map((option, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="correct-option"
                  checked={draft.correctOption === i}
                  onChange={() => change({ correctOption: i })}
                  aria-label={`Đáp án ${OPTION_LETTERS[i]} đúng`}
                  className="size-5 shrink-0 cursor-pointer accent-[#1E9E62]"
                />
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[14px] font-black ${
                    draft.correctOption === i ? 'bg-[#1E9E62] text-white' : 'bg-chip text-ink-soft'
                  }`}
                >
                  {OPTION_LETTERS[i]}
                </span>
                <Input
                  value={option}
                  onChange={(e) => setOption(i, e.target.value)}
                  maxLength={MAX_OPTION_TEXT}
                  placeholder={draft.correctOption === i ? 'Đáp án đúng' : 'Đáp án sai'}
                  aria-label={`Đáp án ${OPTION_LETTERS[i]}`}
                  className={draft.correctOption === i ? 'border-[#1E9E62]' : ''}
                />
                <button
                  type="button"
                  aria-label={`Bỏ đáp án ${OPTION_LETTERS[i]}`}
                  disabled={draft.options.length <= MIN_OPTIONS}
                  onClick={() => removeOption(i)}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-muted hover:bg-[#FDECEC] hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            ))}
            {draft.options.length < MAX_OPTIONS && (
              <Button
                type="dashed"
                icon={<PlusIcon size={15} />}
                onClick={() => change({ options: [...draft.options, ''] })}
                className="mt-1 w-fit rounded-full"
              >
                Thêm đáp án
              </Button>
            )}
          </fieldset>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-ink-soft">Câu trả lời đúng</span>
            <Input
              value={draft.answer}
              onChange={(e) => change({ answer: e.target.value })}
              maxLength={MAX_ANSWER}
              placeholder="Cô dùng để chấm khi học sinh trả lời"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-bold text-ink-soft">Giải thích (không bắt buộc)</span>
          <Input.TextArea
            value={draft.explanation}
            onChange={(e) => change({ explanation: e.target.value })}
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={500}
            placeholder="Hiện sau khi trả lời, giúp các em hiểu vì sao"
          />
        </label>

        {tried && problem && (
          <p role="alert" className="m-0 rounded-[12px] bg-[#FDECEC] px-3.5 py-2.5 text-[14px] font-bold text-danger">
            {problem}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto hidden text-[12.5px] text-ink-muted sm:inline">Ctrl + Enter để lưu · Esc để hủy</span>
          <Button onClick={onClose} className="rounded-full">
            Hủy
          </Button>
          {!editing && (
            <Button loading={saving} onClick={() => void save(true)} className="rounded-full font-bold">
              Thêm và soạn câu tiếp
            </Button>
          )}
          <Button type="primary" loading={saving} onClick={() => void save(false)} className="rounded-full font-extrabold">
            {editing ? 'Lưu câu hỏi' : 'Thêm câu hỏi'}
          </Button>
        </div>
      </div>
    </section>
  )
}
