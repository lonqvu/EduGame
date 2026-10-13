import { App, Input, Modal } from 'antd'
import { useMemo, useState } from 'react'
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

const EXAMPLE = `Thủ đô của Việt Nam? = Hà Nội | Huế | Đà Nẵng
Con gì kêu meo meo? = Con mèo
Mặt trời mọc ở đằng Đông = Đúng`

/** Many questions at once, one per line; lines that cannot become a question are listed and skipped. */
export function PasteQuestionsModal(props: PasteQuestionsModalProps) {
  // Each opening starts empty.
  return props.open ? <PasteDialog {...props} /> : null
}

function PasteDialog({ questionCount, onClose, onAdd }: PasteQuestionsModalProps) {
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
      message.success(`Đã thêm ${questions.length} câu hỏi${problems.length ? `, bỏ qua ${problems.length} dòng lỗi` : ''}`)
      onClose()
    } catch (error) {
      message.error(apiErrorMessage(error))
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title="Dán nhiều câu hỏi"
      okText={questions.length ? `Thêm ${questions.length} câu hỏi` : 'Thêm câu hỏi'}
      cancelText="Hủy"
      okButtonProps={{ disabled: !questions.length || tooMany }}
      confirmLoading={saving}
      onOk={() => void add()}
      onCancel={onClose}
      width={640}
    >
      <div className="flex flex-col gap-3 pt-1">
        <div className="rounded-[14px] bg-surface-soft px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
          Mỗi dòng một câu, đáp án sau dấu <b>=</b>:
          <ul className="my-1 pl-5">
            <li>
              Trắc nghiệm: <code>Câu hỏi = Đáp án đúng | Đáp án sai | …</code> (đáp án đúng đứng đầu, khi chơi được xáo trộn)
            </li>
            <li>
              Tự luận: <code>Câu hỏi = Câu trả lời</code>
            </li>
            <li>
              Đúng / sai: <code>Câu hỏi = Đúng</code> hoặc <code>= Sai</code>
            </li>
          </ul>
        </div>
        <Input.TextArea
          aria-label="Các câu hỏi"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoSize={{ minRows: 7, maxRows: 14 }}
          placeholder={EXAMPLE}
          autoFocus
        />
        <div role="status" className="flex flex-col gap-1.5 text-[14px]">
          {lines.length > 0 && (
            <span className={tooMany ? 'font-bold text-danger' : 'text-success'}>
              {tooMany
                ? `Bộ còn chỗ cho ${room} câu (tối đa ${MAX_QUESTIONS}), cô bớt ${questions.length - room} câu nhé.`
                : `Sẽ thêm ${questions.length} câu hỏi vào cuối bộ.`}
            </span>
          )}
          {problems.length > 0 && (
            <ul className="m-0 flex max-h-[120px] list-none flex-col gap-1 overflow-y-auto rounded-[12px] bg-[#FFF6E5] p-3 text-sun-ink">
              {problems.map((p) => (
                <li key={p.line}>
                  Dòng {p.line}: {p.problem} (bỏ qua)
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
