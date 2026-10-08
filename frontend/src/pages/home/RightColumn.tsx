import { App, Dropdown } from 'antd'
import { Link } from 'react-router'
import {
  BellIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentIcon,
  MoreVerticalIcon,
  PlusIcon,
} from '@/components/ui/icons'
import { editPath, playPath } from '@/game-engine/registry'
import { Art, Panel, PanelHeader, TextAction } from '@/pages/home/homeUi'
import type { GameSummary, GameType } from '@/types/game'
import { dayLabel } from '@/utils/dateLabels'

/** Bell + the teacher's chip. */
export function TopBar({ teacherName, initial }: { teacherName: string; initial: string }) {
  const { message } = App.useApp()
  return (
    <div className="flex h-[48px] items-center justify-end gap-[22px] pr-1">
      <button
        type="button"
        aria-label="Thông báo"
        onClick={() => message.info('Chưa có thông báo mới.')}
        className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#3F4B68] hover:bg-white"
      >
        <BellIcon size={25} />
      </button>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: [
            { key: 'profile', label: 'Hồ sơ của tôi', onClick: () => message.info('Trang hồ sơ đang được hoàn thiện.') },
            { key: 'logout', label: 'Đăng xuất', disabled: true },
          ],
        }}
      >
        <button type="button" className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 font-[inherit] text-ink">
          <span className="flex size-[37px] items-center justify-center rounded-full bg-[#FFCBB7] text-[16px] font-extrabold">{initial}</span>
          <span className="flex h-[37px] items-center gap-3 rounded-full bg-white pr-3.5 pl-4 text-[15px] font-bold">
            {teacherName}
            <ChevronDownIcon size={17} strokeWidth={2.6} />
          </span>
        </button>
      </Dropdown>
    </div>
  )
}

interface TodayPanelProps {
  games: GameSummary[]
  /** "Lớp 3A - Lật ô thi đua" */
  subtitle: (game: GameSummary) => string
}

/** Today's date and the games to pick up again, then a button to start a new one. */
export function TodayPanel({ games, subtitle }: TodayPanelProps) {
  return (
    <Panel className="flex flex-col gap-[10px] px-[15px] pt-[17px] pb-[15px]">
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
          to={playPath(game)}
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
        className="mt-[2px] flex h-[40px] items-center justify-center gap-3 rounded-[11px] bg-primary text-[15px] font-bold text-white hover:text-white hover:brightness-110"
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

const DOC_TINTS = [
  'bg-[#ECEFFE] text-[#3D63E6]',
  'bg-[#EFE9FD] text-[#7A55E0]',
  'bg-[#E3F5EC] text-[#1E8C5A]',
]

interface QuestionSetsProps {
  games: GameSummary[]
  expanded: boolean
  onToggleExpanded: () => void
  /** "Toán lớp 3 - Bảng nhân" */
  title: (game: GameSummary) => string
  /** "10 câu hỏi" */
  count: (game: GameSummary) => string
}

/** The teacher's question sets (games with questions), to edit or play. */
export function QuestionSets({ games, expanded, onToggleExpanded, title, count }: QuestionSetsProps) {
  return (
    <Panel className="flex flex-col gap-[12px] px-[15px] pt-[17px] pb-[15px]">
      <PanelHeader
        icon={<Art name="icon-folder" className="h-[29px] w-[31px]" />}
        title="Mẫu bộ câu hỏi"
        action={games.length > 0 && <TextAction label={expanded ? 'Thu gọn' : 'Xem thêm'} onClick={onToggleExpanded} />}
      />
      <div className="h-px" />
      {games.length === 0 && <p className="m-0 px-1 text-[14px] text-ink-soft">Chưa có bộ câu hỏi nào.</p>}
      <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
        {games.map((game, i) => (
          <li
            key={game.id}
            className="flex items-center gap-3.5 rounded-[13px] border border-[#EDF1F7] bg-white py-[11px] pr-1.5 pl-[11px] shadow-[0_1px_3px_rgba(31,42,68,0.04)]"
          >
            <span className={`flex size-[40px] shrink-0 items-center justify-center rounded-[11px] ${DOC_TINTS[i % DOC_TINTS.length]}`}>
              <DocumentIcon size={23} />
            </span>
            <Link to={editPath(game.id)} className="flex min-w-0 flex-1 flex-col gap-[3px] text-ink hover:text-ink">
              <span className="truncate text-[15px] font-bold">{title(game)}</span>
              <span className="text-[13px] text-ink-soft">{count(game)}</span>
            </Link>
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  { key: 'edit', label: <Link to={editPath(game.id)}>Soạn câu hỏi</Link> },
                  { key: 'play', label: <Link to={playPath(game)}>Trình chiếu</Link> },
                ],
              }}
            >
              <button
                type="button"
                aria-label={`Tùy chọn cho ${game.title}`}
                className="flex h-10 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#3F4B68] hover:bg-surface-soft"
              >
                <MoreVerticalIcon size={20} />
              </button>
            </Dropdown>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
