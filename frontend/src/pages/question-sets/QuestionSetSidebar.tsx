import { Button } from 'antd'
import { useState, type ReactNode } from 'react'
import { BulbIcon, ChartIcon, ChevronRightIcon, FileTextIcon, GamepadIcon, HelpIcon, PlayIcon, PlusIcon } from '@/components/ui/icons'
import { QS_ASSETS } from '@/pages/question-sets/qsUi'
import type { SubjectCode } from '@/types/api'
import { type BankTotals, compactNumber, subjectArt, SUBJECTS } from '@/utils/questionSets'

export function CreateSetButton({ onCreate, disabled }: { onCreate: () => void; disabled: boolean }) {
  return (
    <Button
      type="primary"
      size="large"
      icon={<PlusIcon size={18} />}
      onClick={onCreate}
      disabled={disabled}
      title={disabled ? 'Cô đã có 200 bộ câu hỏi, là số bộ tối đa' : undefined}
      className="h-[52px] w-full rounded-[14px] text-[16px] font-extrabold shadow-[0_8px_18px_rgba(53,99,233,0.25)]"
    >
      Tạo bộ câu hỏi mới
    </Button>
  )
}

/** "Thống kê nhanh": sets, questions, games made from them, times played with a class. */
export function QuickStats({ totals }: { totals: BankTotals | null }) {
  const value = (n: number) => (totals ? compactNumber(n) : '–')
  return (
    <section aria-labelledby="quick-stats" className="rounded-[20px] bg-white p-4 sm:p-5">
      <h2 id="quick-stats" className="m-0 mb-3.5 flex items-center gap-2 text-[17px] font-black">
        <ChartIcon size={20} className="text-ink-soft" /> Thống kê nhanh
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        <Tile icon={<FileTextIcon size={22} />} value={value(totals?.sets ?? 0)} label="Bộ câu hỏi" bg="#EAF1FE" ink="#3563E9" />
        <Tile icon={<HelpIcon size={22} />} value={value(totals?.questions ?? 0)} label="Câu hỏi" bg="#E5F6EC" ink="#1E9E62" />
        <Tile icon={<GamepadIcon size={22} />} value={value(totals?.uses ?? 0)} label="Lượt sử dụng" bg="#F1ECFD" ink="#7B4FE0" />
        <Tile icon={<PlayIcon size={20} />} value={value(totals?.plays ?? 0)} label="Lượt chơi với lớp" bg="#FFF4DD" ink="#C77700" />
      </div>
    </section>
  )
}

function Tile({ icon, value, label, bg, ink }: { icon: ReactNode; value: string; label: string; bg: string; ink: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[16px] p-3.5" style={{ background: bg }}>
      <span style={{ color: ink }}>{icon}</span>
      <span className="text-[22px] leading-tight font-black tabular-nums">{value}</span>
      <span className="truncate text-[12.5px] text-ink-muted">{label}</span>
    </div>
  )
}

/** "Chủ đề phổ biến": subjects with most sets; a click filters the list by it. */
export function PopularTopics({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<SubjectCode, number>
  selected: SubjectCode | 'ALL'
  onSelect: (subject: SubjectCode | 'ALL') => void
}) {
  const topics = SUBJECTS.filter((s) => counts[s.code] > 0).sort((a, b) => counts[b.code] - counts[a.code])
  return (
    <section aria-labelledby="popular-topics" className="rounded-[20px] bg-white p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="popular-topics" className="m-0 text-[17px] font-black">
          Chủ đề phổ biến
        </h2>
        {selected !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelect('ALL')}
            className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[13.5px] font-bold text-primary hover:underline"
          >
            Xem tất cả
          </button>
        )}
      </div>
      {topics.length === 0 ? (
        <p className="m-0 py-3 text-[14px] text-ink-muted">Chưa có chủ đề nào. Tạo bộ câu hỏi để bắt đầu nhé.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {topics.map((s) => (
            <li key={s.code} className="border-b border-line-soft last:border-b-0">
              <button
                type="button"
                aria-pressed={selected === s.code}
                onClick={() => onSelect(selected === s.code ? 'ALL' : s.code)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-[12px] border-0 px-1.5 py-2 text-left font-[inherit] text-ink transition ${
                  selected === s.code ? 'bg-primary-soft' : 'bg-transparent hover:bg-surface-soft'
                }`}
              >
                <img src={subjectArt(s.code)} alt="" className="h-8 w-9 rounded-[9px] object-cover" />
                <span className="flex-1 text-[14.5px] font-bold">{s.label}</span>
                <span className="text-[13.5px] text-ink-muted tabular-nums">{counts[s.code]}</span>
                <ChevronRightIcon size={16} className="text-ink-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const TIPS = [
  'Cô có thể tạo nhiều bộ câu hỏi khác nhau và sử dụng trong nhiều trò chơi khác nhau.',
  'Dán nhiều câu một lúc: “Câu hỏi = Đáp án đúng | Đáp án sai | …”. Chỉ một đáp án là câu tự luận.',
  'Câu trắc nghiệm dùng được cho Trắc nghiệm, Rung chuông vàng, Đua thuyền; Lật ô dùng được mọi câu.',
  'Sửa bộ câu hỏi không làm đổi các trò chơi đã tạo: mỗi trò giữ bản câu hỏi riêng.',
]

/** "Mẹo nhỏ": one tip at a time; the arrow shows the next. */
export function QuestionTips() {
  const [index, setIndex] = useState(0)
  return (
    <section aria-label="Mẹo nhỏ" className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(160deg,#EEF5FF,#E2EDFD)] p-4 pb-0 sm:p-5 sm:pb-0">
      <div className="flex items-center gap-2">
        <BulbIcon size={20} className="text-primary" />
        <h2 className="m-0 flex-1 text-[16px] font-black text-primary-ink">Mẹo nhỏ</h2>
        <button
          type="button"
          aria-label="Mẹo tiếp theo"
          onClick={() => setIndex((i) => (i + 1) % TIPS.length)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-primary hover:bg-white/70"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
      <p aria-live="polite" className="m-0 mt-2 min-h-[64px] text-[13.5px] leading-relaxed text-ink-soft">
        {TIPS[index]}
      </p>
      <img src={`${QS_ASSETS}/tip.svg`} alt="" className="mx-auto mt-1 block h-[120px]" />
    </section>
  )
}
