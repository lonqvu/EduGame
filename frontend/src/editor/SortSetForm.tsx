import { CloseIcon } from '@/components/ui/icons'
import { AddRowButton, FormFooter, formClass, MissingNote } from '@/editor/FormParts'
import { fieldClass } from '@/editor/QuestionForm'
import { GROUP_COLORS } from '@/game-engine/sorting/groupColors'
import type { Draft, SortCard, SortSet } from '@/types/game'
import { localId, MAX_GROUPS, MAX_SORT_CARDS, MIN_GROUPS } from '@/utils/gameItems'

interface SortSetFormProps {
  set: SortSet
  number: number
  isLast: boolean
  onChange: (patch: Partial<Draft<SortSet>>) => void
  onDelete: () => void
  onNext: () => void
}

const removeButton =
  'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-30'

/** Edit form of one sorting: the groups (baskets), and each card with the group it belongs in. */
export function SortSetForm({ set, number, isLast, onChange, onDelete, onNext }: SortSetFormProps) {
  const { groups, cards } = set
  const named = groups.filter((g) => g.text.trim()).length
  const ready = cards.filter((c) => c.text.trim() && c.groupId).length
  const unsorted = cards.filter((c) => c.text.trim() && !c.groupId).length

  const setCard = (id: string, patch: Partial<SortCard>) => onChange({ cards: cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  const removeGroup = (id: string) =>
    onChange({
      groups: groups.filter((g) => g.id !== id),
      cards: cards.map((c) => (c.groupId === id ? { ...c, groupId: null } : c)),
    })

  return (
    <form onSubmit={(e) => e.preventDefault()} className={formClass}>
      <h2 className="m-0 font-display text-[26px] font-extrabold">Bộ phân loại {number}</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="sort-text" className="font-extrabold">
          Đề bài
        </label>
        <input
          id="sort-text"
          value={set.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Ví dụ: Con vật này ăn gì?"
          className={`${fieldClass} px-[18px] py-3 text-2xl`}
        />
      </div>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 p-0 font-extrabold">Các giỏ</legend>
        {groups.map((group, i) => (
          <div key={group.id} className="flex items-center gap-2">
            <span className="size-11 shrink-0 rounded-full" style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }} />
            <input
              aria-label={`Tên giỏ ${i + 1}`}
              value={group.text}
              onChange={(e) => onChange({ groups: groups.map((g) => (g.id === group.id ? { ...g, text: e.target.value } : g)) })}
              placeholder={i === 0 ? 'Ví dụ: Ăn cỏ' : i === 1 ? 'Ví dụ: Ăn thịt' : `Giỏ ${i + 1}`}
              className={`${fieldClass} min-w-0 flex-1 px-4 py-3 text-xl`}
            />
            <button
              type="button"
              aria-label={`Xóa giỏ ${i + 1}`}
              disabled={groups.length <= MIN_GROUPS}
              onClick={() => removeGroup(group.id)}
              className={removeButton}
            >
              <CloseIcon size={20} />
            </button>
          </div>
        ))}
        {groups.length < MAX_GROUPS && (
          <AddRowButton onClick={() => onChange({ groups: [...groups, { id: localId('g'), text: '' }] })}>Thêm giỏ</AddRowButton>
        )}
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 p-0 font-extrabold">Các thẻ và giỏ đúng của thẻ</legend>
        {cards.map((card, i) => (
          <div key={card.id} className="flex flex-wrap items-center gap-2">
            <input
              aria-label={`Thẻ ${i + 1}`}
              value={card.text}
              onChange={(e) => setCard(card.id, { text: e.target.value })}
              placeholder={`Thẻ ${i + 1}`}
              className={`${fieldClass} min-w-[180px] flex-1 px-4 py-3 text-xl`}
            />
            <div role="radiogroup" aria-label={`Giỏ của thẻ ${i + 1}`} className="flex flex-wrap gap-1.5">
              {groups.map((group, g) => {
                const active = card.groupId === group.id
                const color = GROUP_COLORS[g % GROUP_COLORS.length]
                return (
                  <button
                    key={group.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCard(card.id, { groupId: group.id })}
                    className="min-h-11 cursor-pointer rounded-full border-2 px-4 font-[inherit] text-base font-extrabold"
                    style={{ borderColor: color, background: active ? color : '#FFFFFF', color: active ? '#FFFFFF' : '#1F2A44' }}
                  >
                    {group.text.trim() || `Giỏ ${g + 1}`}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              aria-label={`Xóa thẻ ${i + 1}`}
              disabled={cards.length <= 1}
              onClick={() => onChange({ cards: cards.filter((c) => c.id !== card.id) })}
              className={removeButton}
            >
              <CloseIcon size={20} />
            </button>
          </div>
        ))}
        {cards.length < MAX_SORT_CARDS && (
          <AddRowButton onClick={() => onChange({ cards: [...cards, { id: localId('c'), text: '', groupId: null }] })}>Thêm thẻ</AddRowButton>
        )}
      </fieldset>

      {named < groups.length ? (
        <MissingNote>Cô đặt tên cho tất cả các giỏ nhé.</MissingNote>
      ) : unsorted > 0 ? (
        <MissingNote>Còn {unsorted} thẻ chưa chọn giỏ đúng.</MissingNote>
      ) : ready < 2 ? (
        <MissingNote>Cần ít nhất 2 thẻ có chữ và có giỏ để chơi được.</MissingNote>
      ) : null}

      <FormFooter
        deleteLabel="Xóa bộ này"
        nextLabel={isLast ? 'Thêm bộ mới' : 'Bộ tiếp theo'}
        onDelete={onDelete}
        onNext={onNext}
      />
    </form>
  )
}
