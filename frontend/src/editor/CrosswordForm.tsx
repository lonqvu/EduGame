import { useTranslation } from 'react-i18next'
import { fieldClass } from '@/editor/QuestionForm'
import { FormFooter, formClass, MissingNote } from '@/editor/FormParts'
import { answerLetters, isPlayableRow } from '@/game-engine/crossword/letters'
import type { CrosswordRow, Draft, GameItem } from '@/types/game'
import { MAX_ANSWER_LETTERS } from '@/utils/gameItems'

interface CrosswordFormProps {
  row: CrosswordRow
  /** Every row of the game, for the keyword preview. */
  rows: GameItem[]
  number: number
  isLast: boolean
  onChange: (patch: Partial<Draft<CrosswordRow>>) => void
  onDelete: () => void
  onNext: () => void
}

/** Edit form of one crossword row: the clue, the answer, and which of its letters is in the keyword column. */
export function CrosswordForm({ row, rows, number, isLast, onChange, onDelete, onNext }: CrosswordFormProps) {
  const { t } = useTranslation()
  const letters = answerLetters(row.answer)
  const tooLong = letters.length > MAX_ANSWER_LETTERS

  const setAnswer = (answer: string) => {
    const count = answerLetters(answer).length
    // Keep the key letter when it is still inside the answer.
    onChange({ answer, keyIndex: row.keyIndex !== null && row.keyIndex < count ? row.keyIndex : null })
  }

  const all = rows as CrosswordRow[]

  return (
    <form onSubmit={(e) => e.preventDefault()} className={formClass}>
      <h2 className="m-0 font-display text-[26px] font-extrabold">{t('editor.kinds.crossword.noun')} {number}</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="cw-clue" className="font-extrabold">
          {t('editor.form.clue')}
        </label>
        <textarea
          id="cw-clue"
          rows={2}
          value={row.clue}
          onChange={(e) => onChange({ clue: e.target.value })}
          placeholder={t('editor.form.cluePlaceholder')}
          className={`${fieldClass} resize-y px-[18px] py-4 text-2xl`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="cw-answer" className="font-extrabold">
          {t('editor.form.answer')}
        </label>
        <input
          id="cw-answer"
          value={row.answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t('editor.form.answerPlaceholder')}
          className={`${fieldClass} px-[18px] py-3 text-2xl uppercase`}
        />
        <span className={`text-base ${tooLong ? 'font-bold text-danger' : 'text-ink-soft'}`}>
          {t('editor.form.letters', { count: letters.length, max: MAX_ANSWER_LETTERS })}
        </span>
      </div>

      {letters.length > 0 && !tooLong && (
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-1 p-0 font-extrabold">{t('editor.form.keyLetter')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {letters.map((letter, i) => {
              const active = i === row.keyIndex
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={active}
                  aria-label={t('editor.form.letter', { number: i + 1, letter })}
                  onClick={() => onChange({ keyIndex: i })}
                  className={`flex size-12 cursor-pointer items-center justify-center rounded-xl border-2 font-[inherit] text-2xl font-extrabold ${
                    active ? 'border-[#D99A12] bg-sun text-ink' : 'border-line bg-white text-ink hover:border-[#D99A12]'
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-2 rounded-[18px] bg-sun-pale px-5 py-4">
        <span className="font-extrabold">{t('editor.form.keyword')}</span>
        <div className="flex flex-wrap gap-1.5" aria-label={t('editor.form.keywordLabel')}>
          {all.map((r, i) => {
            const playable = isPlayableRow(r)
            const letter = playable ? answerLetters(r.answer)[r.keyIndex as number] : '?'
            return (
              <span
                key={r.id}
                title={t('editor.form.row', { number: i + 1 })}
                className={`flex size-10 items-center justify-center rounded-lg text-xl font-extrabold ${
                  r.id === row.id ? 'bg-sun ring-2 ring-[#D99A12]' : playable ? 'bg-white' : 'bg-white/60 text-ink-soft'
                }`}
              >
                {letter}
              </span>
            )
          })}
        </div>
        <span className="text-[15px] text-ink-soft">{t('editor.form.keywordHint')}</span>
      </div>

      {!row.clue.trim() ? (
        <MissingNote>{t('editor.form.noClue')}</MissingNote>
      ) : letters.length === 0 ? (
        <MissingNote>{t('editor.form.noAnswer')}</MissingNote>
      ) : tooLong ? (
        <MissingNote>{t('editor.form.answerTooLong', { max: MAX_ANSWER_LETTERS })}</MissingNote>
      ) : row.keyIndex === null ? (
        <MissingNote>{t('editor.form.noKeyLetter')}</MissingNote>
      ) : null}

      <FormFooter
        deleteLabel={t('editor.form.deleteRow')}
        nextLabel={isLast ? t('editor.form.addNextRow') : t('editor.form.nextRow')}
        onDelete={onDelete}
        onNext={onNext}
      />
    </form>
  )
}
