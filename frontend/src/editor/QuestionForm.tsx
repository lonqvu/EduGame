import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { Question } from '@/types/game'

const POINT_OPTIONS = [10, 20, 30] as const

type QuestionValues = Omit<Question, 'id'>

interface QuestionFormProps {
  question: Question
  number: number
  isLast: boolean
  /** Called on every edit (autosave). */
  onChange: (patch: Partial<QuestionValues>) => void
  onDelete: () => void
  onNext: () => void
}

export const fieldClass =
  'w-full rounded-[18px] border-2 border-line bg-white font-[inherit] font-bold text-ink outline-none focus:border-primary'

/** Edit form of one question. Mount with `key={question.id}` so it resets when switching questions. */
export function QuestionForm({ question, number, isLast, onChange, onDelete, onNext }: QuestionFormProps) {
  const { register, control, subscribe } = useForm<QuestionValues>({
    defaultValues: { text: question.text, answer: question.answer, imageUrl: question.imageUrl, points: question.points },
  })

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ values }) => onChangeRef.current(values),
      }),
    [subscribe],
  )

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-[22px] rounded-[28px] bg-white p-5 sm:p-7"
    >
      <h2 className="m-0 font-display text-[26px] font-extrabold">Câu hỏi {number}</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="q-text" className="font-extrabold">
          Nội dung câu hỏi
        </label>
        <textarea
          id="q-text"
          rows={2}
          placeholder="Ví dụ: Con gì kêu meo meo?"
          {...register('text')}
          className={`${fieldClass} resize-y px-[18px] py-4 text-2xl`}
        />
      </div>

      <Controller
        control={control}
        name="imageUrl"
        render={({ field }) => <ImagePicker value={field.value} onChange={field.onChange} />}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="q-answer" className="font-extrabold">
          Đáp án đúng
        </label>
        <input id="q-answer" type="text" {...register('answer')} className={`${fieldClass} px-[18px] py-3.5 text-xl`} />
        <span className="text-base text-ink-soft">Chỉ hiện trên màn chiếu khi cô bấm “Hiện đáp án”.</span>
      </div>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-2.5 p-0 font-extrabold">Điểm của câu này</legend>
        <Controller
          control={control}
          name="points"
          render={({ field }) => (
            <div className="flex flex-wrap gap-3">
              {POINT_OPTIONS.map((p) => {
                const active = field.value === p
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() => field.onChange(p)}
                    className={`min-h-14 w-22 cursor-pointer rounded-2xl border-2 font-[inherit] text-xl font-extrabold ${
                      active ? 'border-primary bg-primary text-white' : 'border-line bg-white text-ink hover:border-primary'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          )}
        />
      </fieldset>

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

interface ImagePickerProps {
  value?: string
  onChange: (url: string | undefined) => void
}

/**
 * Local preview only: the image is kept as an object URL until the asset upload API exists.
 */
export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const pick = (file: File | undefined) => {
    if (file?.type.startsWith('image/')) onChange(URL.createObjectURL(file))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-extrabold">
        Hình ảnh <span className="font-semibold text-ink-soft">(không bắt buộc)</span>
      </span>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-wrap items-center gap-[18px] rounded-[18px] border-2 border-dashed p-[22px] ${
          dragging ? 'border-primary bg-primary-soft' : 'border-line-strong bg-[#FAFBFE]'
        }`}
      >
        {value ? (
          <img src={value} alt="Hình của câu hỏi" className="h-[90px] w-[120px] rounded-[14px] object-cover" />
        ) : (
          <div className="flex h-[90px] w-[120px] items-center justify-center rounded-[14px] bg-[#FFE3D8] text-center text-sm font-bold text-[#8A3A16]">
            Chưa có hình
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-ink-soft">Kéo ảnh vào đây hoặc</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="min-h-12 cursor-pointer self-start rounded-full border-2 border-line bg-white px-5 py-2.5 font-[inherit] font-extrabold text-ink hover:border-primary"
            >
              Chọn ảnh từ máy
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="min-h-12 cursor-pointer border-0 bg-transparent px-3 font-[inherit] font-bold text-danger hover:underline"
              >
                Bỏ hình
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            aria-label="Chọn ảnh từ máy"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  )
}
