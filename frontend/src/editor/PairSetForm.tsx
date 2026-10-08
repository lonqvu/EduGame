import { CloseIcon, PlusIcon } from '@/components/ui/icons'
import { fieldClass } from '@/editor/QuestionForm'
import type { Draft, PairSet, TextPair } from '@/types/game'
import { localId, MAX_PAIRS } from '@/utils/gameItems'

export interface PairSetLabels {
  /** "Bộ nối cặp", "Bộ thẻ" */
  noun: string
  sideA: string
  sideB: string
  placeholderA: string
  placeholderB: string
  hint: string
}

interface PairSetFormProps {
  set: PairSet
  number: number
  isLast: boolean
  labels: PairSetLabels
  /** Called on every edit (autosave). */
  onChange: (patch: Partial<Draft<PairSet>>) => void
  onDelete: () => void
  onNext: () => void
}

/** Edit form of a set of pairs: MATCHING (left ↔ right) or MEMORY (card ↔ matching card). */
export function PairSetForm({ set, number, isLast, labels, onChange, onDelete, onNext }: PairSetFormProps) {
  const { pairs } = set

  const update = (id: string, patch: Partial<TextPair>) =>
    onChange({ pairs: pairs.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  const remove = (id: string) => onChange({ pairs: pairs.filter((p) => p.id !== id) })
  const add = () => onChange({ pairs: [...pairs, { id: localId('p'), a: '', b: '' }] })

  const complete = pairs.filter((p) => p.a.trim() && p.b.trim()).length

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-[22px] rounded-[28px] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 font-display text-[26px] font-extrabold">
          {labels.noun} {number}
        </h2>
        <span className="text-base font-bold text-ink-soft">
          {complete} / {MAX_PAIRS} cặp
        </span>
      </div>
      <span className="text-base text-ink-soft">{labels.hint}</span>

      <div className="flex flex-col gap-3">
        <div className="hidden grid-cols-[1fr_1fr_44px] gap-2.5 px-1 font-extrabold sm:grid">
          <span>{labels.sideA}</span>
          <span>{labels.sideB}</span>
        </div>
        {pairs.map((p, i) => (
          <div key={p.id} className="grid grid-cols-[1fr_44px] gap-2.5 sm:grid-cols-[1fr_1fr_44px]">
            <input
              aria-label={`${labels.sideA} ${i + 1}`}
              value={p.a}
              onChange={(e) => update(p.id, { a: e.target.value })}
              placeholder={labels.placeholderA}
              className={`${fieldClass} min-w-0 px-4 py-3 text-xl`}
            />
            <input
              aria-label={`${labels.sideB} ${i + 1}`}
              value={p.b}
              onChange={(e) => update(p.id, { b: e.target.value })}
              placeholder={labels.placeholderB}
              className={`${fieldClass} col-start-1 min-w-0 px-4 py-3 text-xl sm:col-start-auto`}
            />
            <button
              type="button"
              aria-label={`Xóa cặp ${i + 1}`}
              onClick={() => remove(p.id)}
              disabled={pairs.length <= 1}
              className="col-start-2 row-span-2 row-start-1 flex size-11 cursor-pointer items-center justify-center self-center rounded-full border-0 bg-transparent text-ink-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 sm:col-start-3 sm:row-span-1"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        ))}
        {pairs.length < MAX_PAIRS && (
          <button
            type="button"
            onClick={add}
            className="flex min-h-12 cursor-pointer items-center gap-2 self-start rounded-full border-2 border-dashed border-[#A9BDEB] bg-[#F5F8FF] px-5 font-[inherit] font-extrabold text-primary-ink hover:border-primary"
          >
            <PlusIcon size={20} />
            Thêm cặp
          </button>
        )}
      </div>

      {complete < 2 && (
        <span className="text-base font-bold text-[#9A4A00]">Cần ít nhất 2 cặp điền đủ hai bên để chơi được.</span>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-line-soft pt-1.5">
        <button
          type="button"
          onClick={onDelete}
          className="min-h-12 cursor-pointer border-0 bg-transparent px-2 font-[inherit] font-bold text-danger hover:underline"
        >
          Xóa {labels.noun.toLowerCase()} này
        </button>
        <button
          type="button"
          onClick={onNext}
          className="min-h-[52px] cursor-pointer rounded-full border-0 bg-sun px-7 py-3 font-[inherit] font-extrabold text-ink hover:brightness-95"
        >
          {isLast ? `Thêm ${labels.noun.toLowerCase()} mới` : `${labels.noun} tiếp theo`}
        </button>
      </div>
    </form>
  )
}
