import { ChevronDownIcon, CloseIcon } from '@/components/ui/icons'
import { AddRowButton, FormFooter, formClass, MissingNote } from '@/editor/FormParts'
import { fieldClass } from '@/editor/QuestionForm'
import type { Draft, OrderSet, TextEntry } from '@/types/game'
import { localId, MAX_ORDER_ENTRIES, MIN_ORDER_ENTRIES } from '@/utils/gameItems'

interface OrderSetFormProps {
  set: OrderSet
  number: number
  isLast: boolean
  onChange: (patch: Partial<Draft<OrderSet>>) => void
  onDelete: () => void
  onNext: () => void
}

const iconButton =
  'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-soft hover:text-primary-ink disabled:cursor-not-allowed disabled:opacity-30'

/** Edit form of one ordering: what to order, and the cards written in the right order. */
export function OrderSetForm({ set, number, isLast, onChange, onDelete, onNext }: OrderSetFormProps) {
  const { entries } = set
  const filled = entries.filter((e) => e.text.trim()).length

  const setEntries = (next: TextEntry[]) => onChange({ entries: next })
  const move = (from: number, to: number) => {
    const next = [...entries]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setEntries(next)
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className={formClass}>
      <h2 className="m-0 font-display text-[26px] font-extrabold">Bài sắp xếp {number}</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="order-text" className="font-extrabold">
          Đề bài
        </label>
        <input
          id="order-text"
          value={set.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Ví dụ: Xếp các số theo thứ tự từ bé đến lớn"
          className={`${fieldClass} px-[18px] py-3 text-2xl`}
        />
      </div>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 p-0 font-extrabold">Các thẻ, theo đúng thứ tự</legend>
        <span className="text-base text-ink-soft">
          Cô nhập theo thứ tự đúng từ trên xuống. Màn chiếu sẽ xáo trộn các thẻ để học sinh xếp lại.
        </span>
        {entries.map((entry, i) => (
          <div key={entry.id} className="flex items-center gap-2">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-chip text-lg font-extrabold">{i + 1}</span>
            <input
              aria-label={`Thẻ ${i + 1}`}
              value={entry.text}
              onChange={(e) => setEntries(entries.map((x) => (x.id === entry.id ? { ...x, text: e.target.value } : x)))}
              placeholder={`Thẻ ${i + 1}`}
              className={`${fieldClass} min-w-0 flex-1 px-4 py-3 text-xl`}
            />
            <button type="button" aria-label={`Đưa thẻ ${i + 1} lên`} disabled={i === 0} onClick={() => move(i, i - 1)} className={iconButton}>
              <ChevronDownIcon size={22} className="rotate-180" />
            </button>
            <button
              type="button"
              aria-label={`Đưa thẻ ${i + 1} xuống`}
              disabled={i === entries.length - 1}
              onClick={() => move(i, i + 1)}
              className={iconButton}
            >
              <ChevronDownIcon size={22} />
            </button>
            <button
              type="button"
              aria-label={`Xóa thẻ ${i + 1}`}
              disabled={entries.length <= MIN_ORDER_ENTRIES}
              onClick={() => setEntries(entries.filter((x) => x.id !== entry.id))}
              className={`${iconButton} hover:text-danger`}
            >
              <CloseIcon size={20} />
            </button>
          </div>
        ))}
        {entries.length < MAX_ORDER_ENTRIES && (
          <AddRowButton onClick={() => setEntries([...entries, { id: localId('e'), text: '' }])}>Thêm thẻ</AddRowButton>
        )}
      </fieldset>

      {filled < MIN_ORDER_ENTRIES && <MissingNote>Cần ít nhất {MIN_ORDER_ENTRIES} thẻ có chữ để chơi được.</MissingNote>}

      <FormFooter
        deleteLabel="Xóa bài này"
        nextLabel={isLast ? 'Thêm bài mới' : 'Bài tiếp theo'}
        onDelete={onDelete}
        onNext={onNext}
      />
    </form>
  )
}
