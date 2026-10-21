import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon, BoltIcon, BulbIcon, RefreshIcon, UsersFilledIcon, UsersIcon } from '@/components/ui/icons'
import { ClassSwitcher, type ClassChoice } from '@/pages/home/ClassSwitcher'
import { Art, Panel, PanelHeader } from '@/pages/home/homeUi'
import type { GameType } from '@/types/game'

interface ClassInfoProps {
  className: string
  studentCount: number
  classes: ClassChoice[]
  currentCode: string | null
  onPickClass: (code: string) => void
  onManageClasses: () => void
}

/** The class being taught, a button to switch, and a tip that fits how many classes the teacher has. */
export function ClassInfo({ className, studentCount, ...switcher }: ClassInfoProps) {
  const count = switcher.classes.length
  const tip =
    count === 0
      ? 'Tạo lớp để cộng sao cho từng bạn và xem báo cáo sau mỗi trò chơi.'
      : count === 1
        ? 'Cô có thể tạo thêm lớp để quản lý học sinh từng lớp dễ dàng hơn.'
        : 'Trò chơi, sao và báo cáo được tính cho lớp đang chọn. Bấm "Đổi lớp" khi sang tiết khác.'
  return (
    <Panel className="flex flex-col gap-3.5 px-4 pt-[18px] pb-4">
      <PanelHeader icon={<BoltIcon size={21} className="text-primary" />} title="Thông tin lớp" />
      <div className="relative flex items-center gap-3 overflow-hidden rounded-[16px] bg-[#F3F7FF] py-3.5 pr-3 pl-3.5">
        <span className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-[#DCEAFE] text-primary">
          <UsersIcon size={22} strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[16px] font-extrabold">{className || 'Chưa có lớp'}</span>
          <span className="text-[13.5px] text-ink-soft">{count ? `${studentCount} học sinh` : 'Chơi được cả khi chưa có lớp'}</span>
        </span>
        {count > 0 ? (
          <ClassSwitcher {...switcher}>
            <button
              type="button"
              className="flex h-[34px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#BFD3F7] bg-white px-3 font-[inherit] text-[13px] font-extrabold text-primary-ink hover:border-primary"
            >
              Đổi lớp
              <RefreshIcon size={14} />
            </button>
          </ClassSwitcher>
        ) : (
          <button
            type="button"
            onClick={switcher.onManageClasses}
            className="flex h-[34px] shrink-0 cursor-pointer items-center rounded-full border-0 bg-primary px-3.5 font-[inherit] text-[13px] font-extrabold text-white hover:brightness-110"
          >
            Tạo lớp
          </button>
        )}
      </div>
      <p className="m-0 flex gap-2.5 rounded-[14px] bg-[#F7F9FC] px-3.5 py-3 text-[13px] leading-snug text-[#3F4B68]">
        <BulbIcon size={20} className="shrink-0 text-[#3467F4]" />
        <span>
          <strong className="block text-[12.5px] text-primary-ink">Mẹo nhỏ</strong>
          {tip}
        </span>
      </p>
    </Panel>
  )
}

interface PopularGame {
  type: GameType
  label: string
  hint: string
  art: ReactNode
  tint: string
}

const POPULAR: PopularGame[] = [
  { type: 'GRID_BOARD', label: 'Lật ô thi đua', hint: 'Ôn tập kiến thức', art: <Art name="featured-grid" className="h-[52px] w-auto" />, tint: 'bg-[#EEF5FF] hover:bg-[#E2EEFF]' },
  { type: 'SPIN_WHEEL', label: 'Vòng quay may mắn', hint: 'Gọi tên ngẫu nhiên', art: <Art name="featured-wheel" className="h-[52px] w-auto" />, tint: 'bg-[#EEFBF3] hover:bg-[#E0F6E9]' },
  { type: 'QUIZ', label: 'Trắc nghiệm', hint: 'Kiểm tra nhanh', art: <Art name="featured-quiz" className="h-[52px] w-auto" />, tint: 'bg-[#FDEFF6] hover:bg-[#FBE2EF]' },
  { type: 'TEAM_MAKER', label: 'Chia nhóm', hint: 'Làm việc nhóm', art: <UsersFilledIcon size={52} className="text-[#3E8BF5]" />, tint: 'bg-[#EEF3FB] hover:bg-[#E2EAF8]' },
]

/** Four games to start in one tap: question games with their sample questions, tools as they are. */
export function PopularGames({ busy, onStart }: { busy: string | null; onStart: (type: GameType) => void }) {
  return (
    <Panel className="flex flex-col gap-3.5 px-4 pt-[18px] pb-4">
      <PanelHeader
        icon={<Art name="icon-crown" className="h-[26px] w-[29px]" />}
        title="Trò chơi phổ biến"
        action={
          <Link to="/games/new" className="flex items-center gap-1.5 text-[13.5px] font-bold text-primary hover:text-primary-ink">
            Xem tất cả
            <ArrowRightIcon size={15} strokeWidth={2.4} />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-2.5">
        {POPULAR.map((g) => (
          <button
            key={g.type}
            type="button"
            onClick={() => onStart(g.type)}
            disabled={!!busy}
            aria-label={`Chơi ngay ${g.label}`}
            className={`flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-0 px-2 py-3 font-[inherit] text-ink transition hover:-translate-y-0.5 disabled:cursor-wait motion-reduce:hover:translate-y-0 ${g.tint}`}
          >
            {g.art}
            <span className="mt-1 text-center text-[14px] leading-tight font-extrabold">{busy === g.type ? 'Đang mở…' : g.label}</span>
            <span className="text-center text-[12px] text-ink-soft">{g.hint}</span>
          </button>
        ))}
      </div>
    </Panel>
  )
}
