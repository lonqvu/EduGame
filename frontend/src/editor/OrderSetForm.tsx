import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      <h2 className="m-0 font-display text-[26px] font-extrabold">{t('editor.kinds.ordering.noun')} {number}</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="order-text" className="font-extrabold">
          {t('editor.form.task')}
        </label>
        <input
          id="order-text"
          value={set.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder={t('editor.form.orderPlaceholder')}
          className={`${fieldClass} px-[18px] py-3 text-2xl`}
        />
      </div>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 p-0 font-extrabold">{t('editor.form.orderCards')}</legend>
        <span className="text-base text-ink-soft">
          {t('editor.form.orderHint')}
        </span>
        {entries.map((entry, i) => (
          <div key={entry.id} className="flex items-center gap-2">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-chip text-lg font-extrabold">{i + 1}</span>
            <input
              aria-label={t('editor.form.card', { number: i + 1 })}
              value={entry.text}
              onChange={(e) => setEntries(entries.map((x) => (x.id === entry.id ? { ...x, text: e.target.value } : x)))}
              placeholder={t('editor.form.card', { number: i + 1 })}
              className={`${fieldClass} min-w-0 flex-1 px-4 py-3 text-xl`}
            />
            <button type="button" aria-label={t('editor.form.cardUp', { number: i + 1 })} disabled={i === 0} onClick={() => move(i, i - 1)} className={iconButton}>
              <ChevronDownIcon size={22} className="rotate-180" />
            </button>
            <button
              type="button"
              aria-label={t('editor.form.cardDown', { number: i + 1 })}
              disabled={i === entries.length - 1}
              onClick={() => move(i, i + 1)}
              className={iconButton}
            >
              <ChevronDownIcon size={22} />
            </button>
            <button
              type="button"
              aria-label={t('editor.form.removeCard', { number: i + 1 })}
              disabled={entries.length <= MIN_ORDER_ENTRIES}
              onClick={() => setEntries(entries.filter((x) => x.id !== entry.id))}
              className={`${iconButton} hover:text-danger`}
            >
              <CloseIcon size={20} />
            </button>
          </div>
        ))}
        {entries.length < MAX_ORDER_ENTRIES && (
          <AddRowButton onClick={() => setEntries([...entries, { id: localId('e'), text: '' }])}>{t('editor.form.addCard')}</AddRowButton>
        )}
      </fieldset>

      {filled < MIN_ORDER_ENTRIES && <MissingNote>{t('editor.form.fewCards', { count: MIN_ORDER_ENTRIES })}</MissingNote>}

      <FormFooter
        deleteLabel={t('editor.form.deleteTask')}
        nextLabel={isLast ? t('editor.form.addTask') : t('editor.form.nextTask')}
        onDelete={onDelete}
        onNext={onNext}
      />
    </form>
  )
}
