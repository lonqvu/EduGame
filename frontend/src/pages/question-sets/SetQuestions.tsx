import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button, Dropdown } from 'antd'
import { useState, type ReactNode } from 'react'
import { BulbIcon, CheckIcon, DocumentIcon, MoreVerticalIcon, PencilIcon, PlusIcon } from '@/components/ui/icons'
import { QuestionForm } from '@/pages/question-sets/QuestionForm'
import { QS_ASSETS } from '@/pages/question-sets/qsUi'
import type { QuestionRequest, QuestionResponse, QuestionType } from '@/types/api'
import { OPTION_LETTERS } from '@/utils/gameItems'
import { useHoverPointer } from '@/utils/pointer'
import { MAX_QUESTIONS } from '@/utils/questionSets'

type Filter = 'ALL' | QuestionType

interface SetQuestionsProps {
  questions: QuestionResponse[]
  /** A change is being saved: moving is paused so clicks do not cross. */
  busy: boolean
  onPaste: () => void
  /** Saves a new question (at the end) or an edited one; rejects with the API error. */
  onSave: (request: QuestionRequest, question?: QuestionResponse) => Promise<unknown>
  onDelete: (question: QuestionResponse, number: number) => void
  /** The questions in their new order (every id once). */
  onReorder: (ids: number[]) => void
}

/**
 * The questions of a set in order, compact: text and answers on a line or two. Written and edited in place;
 * dragged to another place with a mouse, moved up or down from their menu on a touch screen.
 */
export function SetQuestions({ questions, busy, onPaste, onSave, onDelete, onReorder }: SetQuestionsProps) {
  const [filter, setFilter] = useState<Filter>('ALL')
  /** The question open in the form: an existing one, or a new one of this type. */
  const [writing, setWriting] = useState<{ question?: QuestionResponse; type?: QuestionType } | null>(null)
  const [lastType, setLastType] = useState<QuestionType>('MULTIPLE_CHOICE')
  const hover = useHoverPointer()
  const full = questions.length >= MAX_QUESTIONS
  const counts = {
    MULTIPLE_CHOICE: questions.filter((q) => q.type === 'MULTIPLE_CHOICE').length,
    SHORT_ANSWER: questions.filter((q) => q.type === 'SHORT_ANSWER').length,
  }
  const shown = questions.map((q, i) => ({ q, number: i + 1 })).filter(({ q }) => filter === 'ALL' || q.type === filter)
  // Dragging only makes sense on the whole, unfiltered list.
  const sortable = hover && filter === 'ALL' && !busy && !writing

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = questions.map((q) => q.id)
    onReorder(arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))))
  }
  const move = (index: number, step: -1 | 1) => {
    const ids = questions.map((q) => q.id)
    onReorder(arrayMove(ids, index, index + step))
  }

  const add = (type: QuestionType) => {
    setFilter('ALL')
    setWriting({ type })
  }
  const form = (question?: QuestionResponse) => (
    <QuestionForm
      key={question?.id ?? 'new'}
      question={question}
      number={question ? questions.indexOf(question) + 1 : questions.length + 1}
      defaultType={writing?.type ?? lastType}
      onClose={() => setWriting(null)}
      onSave={async (request) => {
        setLastType(request.type)
        await onSave(request, question)
      }}
    />
  )

  return (
    <section aria-labelledby="questions-title" className="@container min-w-0 rounded-[20px] bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <h2 id="questions-title" className="m-0 text-[19px] font-black">
          Câu hỏi <span className="font-bold text-ink-muted">({questions.length})</span>
        </h2>
        {counts.MULTIPLE_CHOICE > 0 && counts.SHORT_ANSWER > 0 && (
          <div role="radiogroup" aria-label="Lọc câu hỏi" className="flex rounded-full bg-chip p-1">
            {(
              [
                ['ALL', 'Tất cả'],
                ['MULTIPLE_CHOICE', `Trắc nghiệm ${counts.MULTIPLE_CHOICE}`],
                ['SHORT_ANSWER', `Tự luận ${counts.SHORT_ANSWER}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={filter === key}
                onClick={() => setFilter(key)}
                className={`h-7 cursor-pointer rounded-full border-0 px-3 font-[inherit] text-[13px] font-extrabold ${
                  filter === key ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-ink-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <Button icon={<DocumentIcon size={17} />} onClick={onPaste} disabled={full} className="ml-auto h-10 rounded-full font-bold">
          Dán nhiều câu
        </Button>
      </header>

      {questions.length === 0 && !writing ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-line px-6 py-10 text-center">
          <img src={`${QS_ASSETS}/tip.svg`} alt="" className="h-[110px]" />
          <p className="m-0 text-[17px] font-black">Bộ chưa có câu hỏi</p>
          <p className="m-0 max-w-[440px] text-[14.5px] text-ink-muted">
            Soạn từng câu, hoặc dán cả danh sách câu hỏi cùng đáp án một lần (từ Word, Excel...).
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            <Button shape="round" icon={<DocumentIcon size={16} />} onClick={onPaste}>
              Dán nhiều câu
            </Button>
            <Button type="primary" shape="round" icon={<PlusIcon size={16} />} onClick={() => add(lastType)}>
              Thêm câu hỏi
            </Button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={shown.map(({ q }) => q.id)} strategy={verticalListSortingStrategy}>
            <ol className="m-0 mt-3 flex list-none flex-col p-0">
              {shown.map(({ q, number }) =>
                writing?.question?.id === q.id ? (
                  <li key={q.id} className="py-1.5">
                    {form(q)}
                  </li>
                ) : (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    number={number}
                    sortable={sortable}
                    menu={{
                      items: [
                        { key: 'up', label: 'Đưa lên', disabled: busy || number === 1, onClick: () => move(number - 1, -1) },
                        { key: 'down', label: 'Đưa xuống', disabled: busy || number === questions.length, onClick: () => move(number - 1, 1) },
                        { type: 'divider' },
                        { key: 'delete', label: 'Xóa câu hỏi', danger: true, onClick: () => onDelete(q, number) },
                      ],
                    }}
                    onEdit={() => setWriting({ question: q })}
                  />
                ),
              )}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {writing && !writing.question && <div className="mt-3">{form()}</div>}

      {!writing && questions.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2.5 @min-[520px]:grid-cols-2">
          <AddButton disabled={full} onClick={() => add('MULTIPLE_CHOICE')}>
            + Thêm câu trắc nghiệm
          </AddButton>
          <AddButton disabled={full} onClick={() => add('SHORT_ANSWER')}>
            + Thêm câu tự luận
          </AddButton>
        </div>
      )}
    </section>
  )
}

interface QuestionRowProps {
  question: QuestionResponse
  number: number
  /** Can be dragged (a mouse, the whole list, nothing being saved). */
  sortable: boolean
  menu: { items: NonNullable<Parameters<typeof Dropdown>[0]['menu']>['items'] }
  onEdit: () => void
}

/** One question: number, text, its answers as chips (the right one green), the hint; edit and menu on hover. */
function QuestionRow({ question: q, number, sortable, menu, onEdit }: QuestionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id, disabled: !sortable })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }}
      className={`group flex items-start gap-2.5 border-b border-line-soft px-1.5 py-2.5 last:border-b-0 hover:rounded-[14px] hover:bg-[#F6F9FF] ${
        isDragging ? 'relative z-10 rounded-[14px] bg-white shadow-[0_8px_22px_rgba(31,42,68,0.15)]' : ''
      }`}
    >
      {sortable && (
        <button
          type="button"
          aria-label={`Kéo để đổi chỗ câu ${number}`}
          {...attributes}
          {...listeners}
          className="mt-0.5 flex h-7 w-4 shrink-0 cursor-grab items-center justify-center border-0 bg-transparent p-0 text-[#C2C9D6] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
            {[2, 8, 14].flatMap((y) => [<circle key={`a${y}`} cx="2.5" cy={y} r="1.6" />, <circle key={`b${y}`} cx="7.5" cy={y} r="1.6" />])}
          </svg>
        </button>
      )}
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-black text-primary tabular-nums">
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="m-0 text-[15px] leading-snug font-bold break-words whitespace-pre-line">{q.text}</p>
        {q.type === 'MULTIPLE_CHOICE' ? (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Đáp án">
            {(q.options ?? []).map((option, k) => {
              const right = k === q.correctOption
              return (
                <li
                  key={k}
                  className={`flex max-w-full items-center gap-1 rounded-[8px] px-2.5 py-0.5 text-[13.5px] ${
                    right ? 'bg-[#E3F6EA] font-extrabold text-success' : 'bg-surface-soft text-ink-soft'
                  }`}
                >
                  <span className="font-black">{OPTION_LETTERS[k]}.</span>
                  <span className="min-w-0 break-words">{option}</span>
                  {right && (
                    <>
                      <CheckIcon size={13} />
                      <span className="sr-only">đáp án đúng</span>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="m-0 w-fit rounded-[8px] bg-[#E3F6EA] px-2.5 py-0.5 text-[13.5px] text-success">
            Đáp án: <b>{q.answer}</b>
          </p>
        )}
        {q.explanation && (
          <p className="m-0 flex items-start gap-1.5 text-[12.5px] text-ink-muted">
            <BulbIcon size={14} className="mt-px shrink-0" /> {q.explanation}
          </p>
        )}
      </div>
      <span
        className={`mt-0.5 hidden shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-black @min-[560px]:inline ${
          q.type === 'MULTIPLE_CHOICE' ? 'bg-[#F3E8FF] text-[#7A3FC9]' : 'bg-[#FFF0D9] text-[#B45F0A]'
        }`}
      >
        {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận'}
      </span>
      {/* With a mouse the actions show on hover; on a touch screen they are always there. */}
      <span className="flex shrink-0 flex-col gap-1 @min-[560px]:flex-row [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
        <RowButton label={`Sửa câu ${number}`} onClick={onEdit}>
          <PencilIcon size={15} />
        </RowButton>
        <Dropdown trigger={['click']} placement="bottomRight" menu={menu}>
          <button
            type="button"
            aria-label={`Thao tác với câu ${number}`}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink-muted hover:text-ink"
          >
            <MoreVerticalIcon size={16} />
          </button>
        </Dropdown>
      </span>
    </li>
  )
}

function RowButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink-muted hover:text-primary"
    >
      {children}
    </button>
  )
}

function AddButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? `Bộ đã đủ ${MAX_QUESTIONS} câu hỏi` : undefined}
      onClick={onClick}
      className="h-11 cursor-pointer rounded-[14px] border-2 border-dashed border-[#C9D6EA] bg-transparent font-[inherit] text-[14.5px] font-black text-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}
