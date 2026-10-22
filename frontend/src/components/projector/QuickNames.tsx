import { useState } from 'react'
import { useClassStore } from '@/store/classStore'
import { apiErrorMessage } from '@/utils/apiError'
import { MAX_STUDENTS } from '@/utils/classrooms'
import { numberNames, parseNames, rememberedNames, rememberNames } from '@/utils/quickNames'

const MIN_NAMES = 2
const GRADES = [1, 2, 3, 4, 5]

/**
 * The name tools without a class: paste the class list (one name a line) or spin by roll number, and play at once.
 * Making a class of it is offered, never required. Drawn on the projector stage, so everything is big.
 */
export function QuickNames() {
  const startQuickList = useClassStore((s) => s.startQuickList)
  const saveQuickList = useClassStore((s) => s.saveQuickList)
  const [text, setText] = useState(rememberedNames)
  const [count, setCount] = useState(30)
  const [save, setSave] = useState(false)
  const [className, setClassName] = useState('')
  const [grade, setGrade] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const names = parseNames(text)
  const enough = names.length >= MIN_NAMES

  const start = async () => {
    if (!enough) return
    rememberNames(names)
    startQuickList(names)
    if (!save || !className.trim()) return
    setSaving(true)
    setError(null)
    try {
      await saveQuickList(className.trim(), grade)
    } catch (e) {
      // The names are already on screen; only the class was not made.
      setError(`Chưa lưu được lớp. ${apiErrorMessage(e)}`)
    } finally {
      setSaving(false)
    }
  }

  const field =
    'rounded-[14px] border-2 border-line bg-white px-4 font-[inherit] text-[18px] text-ink outline-none focus:border-primary'
  const button =
    'h-[52px] cursor-pointer rounded-full border-0 px-7 font-[inherit] text-[20px] font-extrabold disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <section aria-label="Nhập tên học sinh" className="flex h-full items-center justify-center p-8">
      <div className="flex w-[900px] flex-col gap-4 rounded-[32px] bg-white px-10 py-8 shadow-[0_20px_50px_rgba(31,42,68,0.18)]">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[36px] leading-tight font-extrabold text-[#1A2440]">Ai sẽ được gọi tên hôm nay?</h1>
          <p className="m-0 text-[18px] text-ink-soft">Dán danh sách lớp, mỗi dòng một bạn. Cô chưa cần tạo lớp.</p>
        </div>
        <textarea
          aria-label="Danh sách tên"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          autoFocus
          placeholder={'Nguyễn Minh Anh\nTrần Bảo Ngọc\nLê Hoàng Nam\n…'}
          className={`${field} resize-none py-3 leading-snug`}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-3 text-[17px] font-bold">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="size-5 accent-primary" />
            Lưu thành lớp để lần sau khỏi nhập
          </label>
          <button type="button" onClick={() => void start()} disabled={!enough || saving} className={`${button} bg-primary text-white`}>
            {saving ? 'Đang lưu lớp…' : enough ? `▶ Bắt đầu với ${names.length} bạn` : 'Nhập ít nhất 2 tên'}
          </button>
        </div>
        {save && (
          <div className="flex flex-wrap items-center gap-3 text-[17px]">
            <input
              aria-label="Tên lớp"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              maxLength={50}
              placeholder="Tên lớp, VD: 3A"
              className={`${field} h-[48px] w-[240px]`}
            />
            <select aria-label="Khối" value={grade} onChange={(e) => setGrade(Number(e.target.value))} className={`${field} h-[48px]`}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
            {!className.trim() && <span className="text-ink-muted">Nhập tên lớp để lưu.</span>}
          </div>
        )}
        {error && (
          <p role="alert" className="m-0 text-[16px] font-bold text-danger">
            {error}
          </p>
        )}
        <div className="flex items-center gap-4 border-t border-line-soft pt-4 text-[18px]">
          <span className="font-bold text-ink-soft">Hoặc gọi theo số thứ tự từ 1 đến</span>
          <input
            type="number"
            aria-label="Số học sinh"
            min={MIN_NAMES}
            max={MAX_STUDENTS}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className={`${field} h-[48px] w-[100px] text-center`}
          />
          <button
            type="button"
            onClick={() => startQuickList(numberNames(Math.max(MIN_NAMES, count)))}
            disabled={!(count >= MIN_NAMES)}
            className={`${button} bg-primary-soft text-primary-ink`}
          >
            Dùng số thứ tự
          </button>
        </div>
      </div>
    </section>
  )
}
