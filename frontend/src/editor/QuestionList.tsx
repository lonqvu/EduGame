import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { PlusIcon } from '@/components/ui/icons'
import type { Question } from '@/types/game'

interface QuestionListProps {
  questions: Question[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onReorder: (orderedIds: string[]) => void
}

/** Sidebar of questions; drag to reorder. */
export function QuestionList({ questions, selectedId, onSelect, onAdd, onReorder }: QuestionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = questions.map((q) => q.id)
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  return (
    <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5 rounded-[28px] bg-white p-5">
      <span className="px-1.5 font-display text-[22px] font-extrabold">Câu hỏi ({questions.length})</span>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <ol className="m-0 flex max-h-[560px] list-none flex-col gap-2.5 overflow-y-auto p-0">
            {questions.map((q, i) => (
              <SortableQuestion
                key={q.id}
                question={q}
                number={i + 1}
                selected={q.id === selectedId}
                onSelect={() => onSelect(q.id)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={onAdd}
        className="mt-1.5 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#A9BDEB] bg-[#F5F8FF] font-[inherit] font-extrabold text-primary-ink hover:border-primary"
      >
        <PlusIcon size={22} />
        Thêm câu hỏi
      </button>
    </aside>
  )
}

interface SortableQuestionProps {
  question: Question
  number: number
  selected: boolean
  onSelect: () => void
}

function SortableQuestion({ question, number, selected, onSelect }: SortableQuestionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }}
      className={isDragging ? 'relative z-10 opacity-80' : undefined}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        {...attributes}
        {...listeners}
        className={`flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left font-[inherit] text-ink ${
          selected ? 'border-primary bg-primary-soft' : 'border-transparent bg-surface-soft hover:border-line'
        }`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-white text-base font-extrabold">
          {number}
        </span>
        <span className={`truncate text-base font-semibold ${question.text ? '' : 'text-ink-soft italic'}`}>
          {question.text || 'Câu hỏi chưa có nội dung'}
        </span>
      </button>
    </li>
  )
}
