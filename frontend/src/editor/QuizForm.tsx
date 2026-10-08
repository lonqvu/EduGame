import { CheckIcon, CloseIcon, PlusIcon } from '@/components/ui/icons'
import { fieldClass, ImagePicker } from '@/editor/QuestionForm'
import type { Draft, QuizQuestion } from '@/types/game'
import { MAX_OPTIONS, MIN_OPTIONS, nextOptionId, OPTION_LETTERS } from '@/utils/gameItems'

interface QuizFormProps {
  question: QuizQuestion
  number: number
  isLast: boolean
  /** Called on every edit (autosave). */
  onChange: (patch: Partial<Draft<QuizQuestion>>) => void
  onDelete: () => void
  onNext: () => void
}

/** Edit form of one quiz question: text, image, options and which option is right. */
export function QuizForm({ question, number, isLast, onChange, onDelete, onNext }: QuizFormProps) {
  const { options, correctId } = question

  const setOptionText = (id: string, text: string) =>
    onChange({ options: options.map((o) => (o.id === id ? { ...o, text } : o)) })

  const removeOption = (id: string) =>
    onChange({
      options: options.filter((o) => o.id !== id),
      correctId: correctId === id ? null : correctId,
    })

  const addOption = () => onChange({ options: [...options, { id: nextOptionId(options), text: '' }] })

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-[22px] rounded-[28px] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 font-display text-[26px] font-extrabold">Câu hỏi {number}</h2>
        <span className="rounded-full bg-chip px-3 py-1 text-[15px] font-bold text-ink-soft">
          {question.trueFalse ? 'Đúng / Sai' : 'Chọn một đáp án'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="quiz-text" className="font-extrabold">
          Nội dung câu hỏi
        </label>
        <textarea
          id="quiz-text"
          rows={2}
          value={question.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder={question.trueFalse ? 'Ví dụ: Mặt trời mọc ở đằng Đông.' : 'Ví dụ: Con vật nào biết bay?'}
          className={`${fieldClass} resize-y px-[18px] py-4 text-2xl`}
        />
      </div>

      <ImagePicker value={question.imageUrl} onChange={(imageUrl) => onChange({ imageUrl })} />

      {question.trueFalse ? (
        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 p-0 font-extrabold">Câu này đúng hay sai?</legend>
          <div className="flex flex-wrap gap-3">
            {options.map((o) => {
              const active = o.id === correctId
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ correctId: o.id })}
                  className={`flex min-h-14 min-w-36 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 px-6 font-[inherit] text-xl font-extrabold ${
                    active ? 'border-success bg-success text-white' : 'border-line bg-white text-ink hover:border-success'
                  }`}
                >
                  {active && <CheckIcon size={22} />}
                  {o.text}
                </button>
              )
            })}
          </div>
        </fieldset>
      ) : (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-1 p-0 font-extrabold">Các phương án</legend>
          <span className="text-base text-ink-soft">
            Bấm vào ô tròn để chọn đáp án đúng. Màn chiếu sẽ tự xáo trộn thứ tự các phương án.
          </span>
          {options.map((o, i) => {
            const active = o.id === correctId
            return (
              <div key={o.id} className="flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label={`Chọn phương án ${OPTION_LETTERS[i]} là đáp án đúng`}
                  aria-pressed={active}
                  onClick={() => onChange({ correctId: o.id })}
                  className={`flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 font-[inherit] text-lg font-extrabold ${
                    active ? 'border-success bg-success text-white' : 'border-line-strong bg-white text-ink hover:border-success'
                  }`}
                >
                  {active ? <CheckIcon size={22} /> : OPTION_LETTERS[i]}
                </button>
                <input
                  aria-label={`Phương án ${OPTION_LETTERS[i]}`}
                  value={o.text}
                  onChange={(e) => setOptionText(o.id, e.target.value)}
                  placeholder={`Phương án ${OPTION_LETTERS[i]}`}
                  className={`${fieldClass} min-w-0 flex-1 px-4 py-3 text-xl ${active ? 'border-success' : ''}`}
                />
                <button
                  type="button"
                  aria-label={`Xóa phương án ${OPTION_LETTERS[i]}`}
                  onClick={() => removeOption(o.id)}
                  disabled={options.length <= MIN_OPTIONS}
                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            )
          })}
          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={addOption}
              className="flex min-h-12 cursor-pointer items-center gap-2 self-start rounded-full border-2 border-dashed border-[#A9BDEB] bg-[#F5F8FF] px-5 font-[inherit] font-extrabold text-primary-ink hover:border-primary"
            >
              <PlusIcon size={20} />
              Thêm phương án
            </button>
          )}
        </fieldset>
      )}

      {!correctId && <span className="text-base font-bold text-[#9A4A00]">Cô chưa chọn đáp án đúng cho câu này.</span>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-line-soft pt-1.5">
        <button
          type="button"
          onClick={onDelete}
          className="min-h-12 cursor-pointer border-0 bg-transparent px-2 font-[inherit] font-bold text-danger hover:underline"
        >
          Xóa câu này
        </button>
        <button
          type="button"
          onClick={onNext}
          className="min-h-[52px] cursor-pointer rounded-full border-0 bg-sun px-7 py-3 font-[inherit] font-extrabold text-ink hover:brightness-95"
        >
          {isLast ? 'Thêm câu tiếp theo' : 'Câu tiếp theo'}
        </button>
      </div>
    </form>
  )
}
