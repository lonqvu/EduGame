import { Button } from 'antd'
import type { ReactNode } from 'react'
import { BulbIcon, CheckIcon, ChevronDownIcon, DocumentIcon, PencilIcon, PlusIcon, TrashIcon } from '@/components/ui/icons'
import { QS_ASSETS } from '@/pages/question-sets/qsUi'
import type { QuestionResponse } from '@/types/api'
import { OPTION_LETTERS } from '@/utils/gameItems'
import { MAX_QUESTIONS } from '@/utils/questionSets'

interface SetQuestionsProps {
  questions: QuestionResponse[]
  /** A change is being saved: moving is paused so clicks do not cross. */
  busy: boolean
  onAdd: () => void
  onPaste: () => void
  onEdit: (question: QuestionResponse, number: number) => void
  onDelete: (question: QuestionResponse, number: number) => void
  onMove: (question: QuestionResponse, step: -1 | 1) => void
}

/** The questions of a set in order, with their answers; add, paste, edit, delete, move. */
export function SetQuestions({ questions, busy, onAdd, onPaste, onEdit, onDelete, onMove }: SetQuestionsProps) {
  const full = questions.length >= MAX_QUESTIONS
  return (
    <section aria-labelledby="questions-title" className="@container min-w-0 rounded-[20px] bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <h2 id="questions-title" className="m-0 mr-auto text-[19px] font-black">
          Câu hỏi <span className="font-bold text-ink-muted">({questions.length})</span>
        </h2>
        <Button icon={<DocumentIcon size={17} />} onClick={onPaste} disabled={full} className="h-10 rounded-full font-bold">
          Dán nhiều câu
        </Button>
        <Button
          type="primary"
          icon={<PlusIcon size={16} />}
          onClick={onAdd}
          disabled={full}
          title={full ? `Bộ đã đủ ${MAX_QUESTIONS} câu hỏi` : undefined}
          className="h-10 rounded-full font-extrabold"
        >
          Thêm câu hỏi
        </Button>
      </header>

      {questions.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-line px-6 py-10 text-center">
          <img src={`${QS_ASSETS}/tip.svg`} alt="" className="h-[110px]" />
          <p className="m-0 text-[17px] font-black">Bộ chưa có câu hỏi</p>
          <p className="m-0 max-w-[440px] text-[14.5px] text-ink-muted">
            Soạn từng câu, hoặc dán cả danh sách câu hỏi cùng đáp án một lần.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            <Button shape="round" icon={<DocumentIcon size={16} />} onClick={onPaste}>
              Dán nhiều câu
            </Button>
            <Button type="primary" shape="round" icon={<PlusIcon size={16} />} onClick={onAdd}>
              Thêm câu hỏi
            </Button>
          </div>
        </div>
      ) : (
        <ol className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
          {questions.map((q, i) => (
            <li key={q.id} className="group flex gap-3 rounded-[16px] border border-line-soft p-3.5 transition hover:border-[#C9D9F5] sm:gap-4 sm:p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[15px] font-black text-primary tabular-nums">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${
                      q.type === 'MULTIPLE_CHOICE' ? 'bg-[#F7E8FB] text-[#8A2BA8]' : 'bg-[#FFF0D9] text-[#B45F0A]'
                    }`}
                  >
                    {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận'}
                  </span>
                </div>
                <p className="m-0 text-[15.5px] leading-snug font-bold break-words whitespace-pre-line">{q.text}</p>
                {q.type === 'MULTIPLE_CHOICE' ? (
                  <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 @min-[560px]:grid-cols-2" aria-label="Đáp án">
                    {(q.options ?? []).map((option, k) => {
                      const right = k === q.correctOption
                      return (
                        <li
                          key={k}
                          className={`flex min-w-0 items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[14px] ${
                            right ? 'bg-[#E3F6EA] font-bold text-success' : 'bg-surface-soft text-ink-soft'
                          }`}
                        >
                          <span className="font-black">{OPTION_LETTERS[k]}.</span>
                          <span className="min-w-0 flex-1 break-words">{option}</span>
                          {right && (
                            <span className="flex items-center gap-1 text-[12px]">
                              <CheckIcon size={14} />
                              <span className="sr-only">đáp án đúng</span>
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="m-0 w-fit rounded-[10px] bg-[#E3F6EA] px-2.5 py-1.5 text-[14px] text-success">
                    Đáp án: <b>{q.answer}</b>
                  </p>
                )}
                {q.explanation && (
                  <p className="m-0 flex items-start gap-1.5 text-[13.5px] text-ink-muted">
                    <BulbIcon size={15} className="mt-0.5 shrink-0" /> {q.explanation}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-0.5 @min-[560px]:flex-row @min-[560px]:items-start">
                <IconButton label={`Đưa câu ${i + 1} lên`} disabled={busy || i === 0} onClick={() => onMove(q, -1)}>
                  <ChevronDownIcon size={18} className="rotate-180" />
                </IconButton>
                <IconButton label={`Đưa câu ${i + 1} xuống`} disabled={busy || i === questions.length - 1} onClick={() => onMove(q, 1)}>
                  <ChevronDownIcon size={18} />
                </IconButton>
                <IconButton label={`Sửa câu ${i + 1}`} onClick={() => onEdit(q, i + 1)}>
                  <PencilIcon size={17} />
                </IconButton>
                <IconButton label={`Xóa câu ${i + 1}`} danger onClick={() => onDelete(q, i + 1)}>
                  <TrashIcon size={17} />
                </IconButton>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function IconButton({
  label,
  onClick,
  danger,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-muted transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? 'enabled:hover:bg-[#FDECEC] enabled:hover:text-danger' : 'enabled:hover:bg-primary-soft enabled:hover:text-primary'
      }`}
    >
      {children}
    </button>
  )
}
