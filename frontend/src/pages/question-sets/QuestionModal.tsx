import { App, Button, Input, Modal, Segmented } from 'antd'
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

interface QuestionModalProps {
  open: boolean
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

/** Write or edit one question: multiple choice with its right option, or short answer. */
export function QuestionModal(props: QuestionModalProps) {
  // Each opening starts from the question (or an empty one).
  return props.open ? <QuestionDialog {...props} /> : null
}

function QuestionDialog({ question, number, defaultType, onClose, onSave }: QuestionModalProps) {
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

  return (
    <Modal
      open
      title={editing ? `Sửa câu ${number}` : `Câu hỏi mới (câu ${count})`}
      onCancel={onClose}
      width={620}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        !editing && (
          <Button key="next" loading={saving} onClick={() => void save(true)}>
            Thêm và soạn câu tiếp
          </Button>
        ),
        <Button key="save" type="primary" loading={saving} onClick={() => void save(false)}>
          {editing ? 'Lưu câu hỏi' : 'Thêm câu hỏi'}
        </Button>,
      ]}
    >
      <div className="flex flex-col gap-4 pt-2">
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
      </div>
    </Modal>
  )
}
