import { Link } from 'react-router'
import {
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
} from '@/components/ui/icons'
import { startPath } from '@/game-engine/registry'
import { Art, Panel, PanelHeader } from '@/pages/home/homeUi'
import type { QuestionSetSummaryResponse } from '@/types/api'
import type { GameSummary, GameType } from '@/types/game'
import { dayLabel } from '@/utils/dateLabels'
import { subjectArt, subjectInfo } from '@/utils/questionSets'

interface TodayPanelProps {
  games: GameSummary[]
  /** "Lớp 3A - Lật ô thi đua" */
  subtitle: (game: GameSummary) => string
}

/** Today's date and the games to pick up again, then a button to start a new one. */
export function TodayPanel({ games, subtitle }: TodayPanelProps) {
  return (
    // Stretches to the height of the banner beside it; the button stays at the bottom.
    <Panel className="flex h-full flex-col gap-[10px] px-[15px] pt-[17px] pb-[15px]">
      <PanelHeader
        icon={<CalendarIcon size={22} className="text-ink" />}
        title="Hôm nay"
        action={<span className="text-[13px] text-ink-soft">{dayLabel()}</span>}
      />
      <div className="h-[2px]" />
      {games.length === 0 && <p className="m-0 px-1 text-[14px] text-ink-soft">Chưa có hoạt động nào. Cô tạo một trò chơi nhé!</p>}
      {games.map((game, i) => (
        <Link
          key={game.id}
          to={startPath(game)}
          className={`flex items-center gap-3.5 rounded-[13px] px-3.5 py-[12px] text-ink hover:text-ink hover:brightness-[0.98] ${
            i === 0 ? 'bg-[#FEF3DF]' : 'bg-[#F4F6FA]'
          }`}
        >
          <span className={`flex size-[26px] shrink-0 items-center justify-center rounded-full ${i === 0 ? 'bg-[#F9A825] text-white' : 'bg-[#AEB6C8] text-white'}`}>
            <ClockIcon size={17} strokeWidth={2.4} />
          </span>
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span className="truncate text-[15px] font-extrabold">{game.title}</span>
            <span className="truncate text-[13.5px] text-[#3F4B68]">{subtitle(game)}</span>
          </span>
        </Link>
      ))}
      <Link
        to="/games/new"
        className="mt-auto flex h-[40px] shrink-0 items-center justify-center gap-3 rounded-[11px] bg-primary text-[15px] font-bold text-white hover:text-white hover:brightness-110"
      >
        Tạo hoạt động mới
        <PlusIcon size={18} strokeWidth={2.4} />
      </Link>
    </Panel>
  )
}

const FEATURED: { type: GameType; label: string; art: string; tint: string }[] = [
  { type: 'GRID_BOARD', label: 'Lật ô thi đua', art: 'featured-grid', tint: 'bg-[#EEF7FF]' },
  { type: 'NAME_RACE', label: 'Đua ngựa', art: 'featured-horse', tint: 'bg-[#FDF5EB]' },
  { type: 'QUIZ', label: 'Trắc nghiệm', art: 'featured-quiz', tint: 'bg-[#FDEFF6]' },
  { type: 'SPIN_WHEEL', label: 'Vòng quay\nmay mắn', art: 'featured-wheel', tint: 'bg-[#F3F4F9]' },
]

/** Four games to start in one tap; question games are created, tools open directly. */
export function FeaturedGames({ onStart }: { onStart: (type: GameType) => void }) {
  return (
    <Panel className="flex flex-col gap-[13px] px-[15px] pt-[16px] pb-[15px]">
      <PanelHeader
        icon={<Art name="icon-crown" className="h-[29px] w-[32px]" />}
        title="Trò chơi nổi bật"
        action={
          <Link to="/games/new" aria-label="Xem tất cả trò chơi" className="flex text-primary hover:text-primary-ink">
            <ChevronRightIcon size={20} strokeWidth={2.6} />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-[10px]">
        {FEATURED.map((f) => (
          <button
            key={f.type}
            type="button"
            onClick={() => onStart(f.type)}
            className={`flex h-[120px] cursor-pointer flex-col items-center justify-center gap-[9px] rounded-[14px] border-0 px-2 font-[inherit] text-ink transition-transform hover:-translate-y-0.5 ${f.tint}`}
          >
            <Art name={f.art} className="h-[54px] w-auto" />
            <span className="text-center text-[14.5px] leading-[1.2] font-extrabold whitespace-pre-line">{f.label}</span>
          </button>
        ))}
      </div>
    </Panel>
  )
}

/** The teacher's last changed question sets, to open; "Xem tất cả" goes to the bank. */
export function QuestionSets({ sets }: { sets: QuestionSetSummaryResponse[] }) {
  return (
    <Panel className="flex flex-col gap-[12px] px-[15px] pt-[17px] pb-[15px]">
      <PanelHeader
        icon={<Art name="icon-folder" className="h-[29px] w-[31px]" />}
        title="Bộ câu hỏi"
        action={
          <Link to="/question-sets" className="text-[14px] font-bold text-primary hover:text-primary-ink">
            Xem tất cả
          </Link>
        }
      />
      <div className="h-px" />
      {sets.length === 0 && (
        <p className="m-0 px-1 text-[14px] text-ink-soft">
          Chưa có bộ câu hỏi nào. <Link to="/question-sets">Tạo bộ câu hỏi</Link>
        </p>
      )}
      <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
        {sets.map((set) => (
          <li key={set.code}>
            <Link
              to={`/question-sets/${encodeURIComponent(set.code)}`}
              className="flex items-center gap-3.5 rounded-[13px] border border-[#EDF1F7] bg-white py-[9px] pr-2.5 pl-[9px] text-ink shadow-[0_1px_3px_rgba(31,42,68,0.04)] hover:border-[#C9D9F5] hover:text-ink"
            >
              <img src={subjectArt(set.subject)} alt="" className="h-[40px] w-[46px] shrink-0 rounded-[11px] object-cover" />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="truncate text-[15px] font-bold">{set.title}</span>
                <span className="text-[13px] text-ink-soft">
                  {set.questionCount} câu hỏi · {subjectInfo(set.subject).label}
                </span>
              </span>
              <ChevronRightIcon size={18} className="shrink-0 text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
