import { App, Dropdown } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  HomeIcon,
} from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { editPath, gameRegistry, playPath, toolPath, type GameBadge } from '@/game-engine/registry'
import { useCatalogStore } from '@/store/catalogStore'
import { useClassStore } from '@/store/classStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { GameCategory, GameSummary, GameTemplate, GameType } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { relativeTimeLabel } from '@/utils/dateLabels'
import { gradeLabel } from '@/utils/gameMapping'

const ASSETS = '/assets/games'
const RECENT_LIMIT = 3

const FILE_NAMES: Record<GameType, string> = {
  GRID_BOARD: 'grid-board',
  QUIZ: 'quiz',
  MATCHING: 'matching',
  MEMORY: 'memory',
  SPIN_WHEEL: 'spin-wheel',
  NAME_RACE: 'name-race',
}
const cardArt = (type: GameType) => `${ASSETS}/card-${FILE_NAMES[type]}.png`
/** Square-ish picture for the "recent" row; games without one show their card art, cropped. */
const THUMBS: Partial<Record<GameType, string>> = { GRID_BOARD: 'grid-board', QUIZ: 'quiz', SPIN_WHEEL: 'spin-wheel' }
const recentThumb = (type: GameType) => (THUMBS[type] ? `${ASSETS}/thumb-${THUMBS[type]}.png` : cardArt(type))

type Filter = 'ALL' | GameCategory

const FILTERS: { key: Filter; label: string; icon: ReactNode }[] = [
  { key: 'ALL', label: 'Tất cả', icon: <GridIcon /> },
  { key: 'QUESTION', label: 'Hỏi đáp', icon: <img src={`${ASSETS}/cat-question.png`} alt="" className="size-[22px]" /> },
  { key: 'PUZZLE', label: 'Giải đố', icon: <img src={`${ASSETS}/cat-puzzle.png`} alt="" className="size-[22px]" /> },
  { key: 'RANDOM_TOOL', label: 'Ngẫu nhiên', icon: <img src={`${ASSETS}/cat-random.png`} alt="" className="size-[22px]" /> },
]

type Sort = 'popular' | 'name' | 'new'

const SORTS: Record<Sort, string> = { popular: 'Phổ biến nhất', name: 'Tên A–Z', new: 'Mới nhất' }

const BADGES: Record<GameBadge, { label: string; className: string }> = {
  POPULAR: { label: 'Phổ biến', className: 'bg-[#FFD866] text-[#5A4100]' },
  EASY: { label: 'Dễ sử dụng', className: 'bg-[#FFD3E2] text-[#B0285A]' },
  NEW: { label: 'Mới', className: 'bg-[#3E9B63] text-white' },
}

/** Lowercase without Vietnamese accents, for search ("lat o" finds "Lật ô"). */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()

export function ChooseGamePage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const templates = useCatalogStore((s) => s.templates)
  const status = useCatalogStore((s) => s.status)
  const loadTemplates = useCatalogStore((s) => s.load)
  const teacher = useTeacherStore((s) => s.teacher)
  const loadTeacher = useTeacherStore((s) => s.load)
  const className = useClassStore((s) => s.className)
  const grade = useClassStore((s) => s.grade)
  const loadClass = useClassStore((s) => s.load)
  const games = useGameLibraryStore((s) => s.games)
  const loadGames = useGameLibraryStore((s) => s.loadGames)
  const createGame = useGameLibraryStore((s) => s.createGame)

  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [sort, setSort] = useState<Sort>('popular')
  const [allRecent, setAllRecent] = useState(false)

  useEffect(() => {
    void loadTemplates()
    void loadClass()
    void loadTeacher()
    void loadGames()
  }, [loadTemplates, loadClass, loadTeacher, loadGames])

  const choose = async (template: GameTemplate) => {
    if (!gameRegistry[template.type].usesQuestions) {
      navigate(toolPath(template.type))
      return
    }
    if (!gameRegistry[template.type].hasEditor) {
      message.info(`Trò "${template.name}" đang được hoàn thiện.`)
      return
    }
    if (creating) return
    setCreating(true)
    try {
      // New games are for the teacher's class grade (there is one class for now).
      navigate(editPath(await createGame(template.type, grade)))
    } catch (error) {
      message.error(apiErrorMessage(error))
      setCreating(false)
    }
  }

  if (status === 'error') return <LoadError onRetry={() => void loadTemplates()} />
  if (status !== 'ready') return <PageLoading />

  const words = fold(query).split(/\s+/).filter(Boolean)
  const shown = templates
    .filter((t) => filter === 'ALL' || t.category === filter)
    .filter((t) => words.every((w) => fold(`${t.name} ${t.description}`).includes(w)))
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'vi')
      if (sort === 'new' && !!a.isNew !== !!b.isNew) return a.isNew ? -1 : 1
      return gameRegistry[a.type].popularity - gameRegistry[b.type].popularity
    })

  const recent = allRecent ? games : games.slice(0, RECENT_LIMIT)
  const templateName = (type: GameType) => templates.find((t) => t.type === type)?.name ?? ''
  const classLabel = (game: GameSummary) => (className && game.grade === grade ? className : gradeLabel(game.grade))
  /** "Lớp 3A • 10 câu"; tools say what they do instead. */
  const recentLine = (game: GameSummary) =>
    gameRegistry[game.type].usesQuestions
      ? `${classLabel(game)} • ${game.itemCount} ${gameRegistry[game.type].itemUnit}`
      : 'Chọn học sinh ngẫu nhiên'

  return (
    <div className="flex flex-col gap-[10px]">
      <header className="@container relative flex min-h-[146px] flex-col justify-between gap-4 sm:flex-row">
        {/* Drawn wider than the page (scripts/extend_banners.py), so it fills the space from the text to the bell. */}
        <div className="pointer-events-none absolute top-[-12px] right-[10px] left-[650px] hidden @min-[1400px]:right-[128px] h-[148px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_60px,black_90%,transparent)] @min-[1060px]:block">
          <img
            src={`${ASSETS}/choose-hero-wide.png`}
            alt=""
            className="absolute top-0 right-0 h-full w-auto max-w-none select-none"
          />
        </div>
        <div className="relative flex flex-col">
          <nav aria-label="Đường dẫn" className="flex items-center gap-3 pt-[2px] text-[14.5px] text-ink-soft">
            <Link to="/" aria-label="Trang chủ" className="flex text-[#8A93A8] hover:text-primary">
              <HomeIcon size={20} />
            </Link>
            <Link to="/" className="text-ink-soft hover:text-primary">
              Trang chủ
            </Link>
            <ChevronRightIcon size={15} strokeWidth={2.4} />
            <span className="font-semibold text-ink">Chọn trò chơi</span>
          </nav>
          <h1 className="m-0 mt-[24px] text-[34px] leading-[1.1] font-black tracking-[-0.01em] text-[#1A2440]">Chọn trò chơi</h1>
          <p className="m-0 mt-[10px] text-[14.5px] text-[#4A5470]">
            Chọn trò chơi phù hợp với tiết học. Mỗi trò chơi mang đến một cách tương tác thú vị và sinh động.
          </p>
        </div>
        <div className="relative shrink-0 self-start">
          <TopBar teacherName={teacher?.name ?? ''} initial={teacher?.shortName.charAt(0).toUpperCase() ?? ''} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-[17px] gap-y-3 rounded-[14px] bg-white/70 p-[10px] shadow-[0_1px_2px_rgba(31,42,68,0.04)]">
        <label className="flex h-[43px] min-w-[220px] flex-[1_1_380px] items-center gap-3 rounded-[11px] border border-[#D9E1EE] bg-white px-4 focus-within:border-primary xl:max-w-[548px]">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm trò chơi..."
            aria-label="Tìm kiếm trò chơi"
            className="min-w-0 flex-1 border-0 bg-transparent font-[inherit] text-[14.5px] text-ink outline-none placeholder:text-[#5A6788]"
          />
        </label>
        <div role="tablist" aria-label="Loại trò chơi" className="flex flex-wrap gap-[14px]">
          {FILTERS.map((f) => {
            const active = f.key === filter
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={`flex h-[43px] cursor-pointer items-center gap-[10px] rounded-[11px] border-0 px-[18px] font-[inherit] text-[14.5px] font-semibold ${
                  active ? 'bg-primary text-white' : 'bg-[#EEF2F8] text-ink hover:bg-[#E3E9F4]'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            )
          })}
        </div>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            selectable: true,
            selectedKeys: [sort],
            items: (Object.keys(SORTS) as Sort[]).map((key) => ({ key, label: SORTS[key] })),
            onClick: ({ key }) => setSort(key as Sort),
          }}
        >
          <button
            type="button"
            className="ml-auto flex h-[43px] cursor-pointer items-center gap-2 rounded-[11px] border border-[#E3E8F1] bg-white px-[13px] font-[inherit] text-[13.5px] text-ink-soft"
          >
            Sắp xếp:
            <span className="font-extrabold text-ink">{SORTS[sort]}</span>
            <ChevronDownIcon size={17} strokeWidth={2.4} className="ml-[18px] text-ink" />
          </button>
        </Dropdown>
      </div>

      {games.length > 0 && (
        <section className="@container rounded-[16px] bg-[#EAF2FC] px-[22px] pt-[14px] pb-[14px]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 flex items-center gap-2.5 text-[19px] font-black">
              <ClockIcon size={22} className="text-primary" />
              Trò chơi gần đây
            </h2>
            <button
              type="button"
              onClick={() => setAllRecent((v) => !v)}
              className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-[inherit] text-[14px] font-bold text-primary hover:text-primary-ink"
            >
              {allRecent ? 'Thu gọn' : 'Xem tất cả'}
              <ArrowRightIcon size={17} strokeWidth={2.4} />
            </button>
          </div>
          <ul className="m-0 mt-[12px] grid list-none grid-cols-1 gap-4 p-0 @min-[720px]:grid-cols-2 @min-[1080px]:grid-cols-3">
            {recent.map((game) => (
              <li key={game.id}>
                <Link
                  to={playPath(game)}
                  className="flex items-center gap-4 rounded-[14px] bg-white p-[14px] pr-[16px] text-ink shadow-[0_1px_3px_rgba(31,42,68,0.05)] hover:text-ink hover:shadow-[0_6px_18px_rgba(31,42,68,0.08)]"
                >
                  <img src={recentThumb(game.type)} alt="" className="h-[73px] w-[104px] shrink-0 rounded-[10px] object-cover" />
                  <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="truncate text-[15px] font-black">{templateName(game.type)}</span>
                    <span className="truncate text-[13.5px] text-ink-soft" title={game.title}>
                      {recentLine(game)}
                    </span>
                    <span className="mt-[6px] w-fit rounded-full bg-[#F1F3F7] px-[11px] py-[3px] text-[12px] text-ink-soft">
                      {relativeTimeLabel(game.updatedAt) || game.title}
                    </span>
                  </span>
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#EAF1FE] text-primary">
                    <ArrowRightIcon size={17} strokeWidth={2.4} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="@container rounded-[16px] bg-white/70 px-[10px] pt-[14px] pb-[10px]">
        <div className="flex items-center justify-between gap-3 px-[2px]">
          <h2 className="m-0 flex items-center gap-2.5 text-[19px] font-black">
            <img src={`${ASSETS}/icon-star.png`} alt="" className="size-[30px]" />
            Danh sách trò chơi
          </h2>
          <span className="pr-[12px] text-[13.5px] text-ink-soft">Tổng {shown.length} trò chơi</span>
        </div>

        {shown.length === 0 ? (
          <p className="m-0 py-12 text-center text-ink-soft">Không tìm thấy trò chơi nào phù hợp.</p>
        ) : (
          <ul className="m-0 mt-[12px] grid list-none grid-cols-1 gap-x-[18px] gap-y-[14px] p-0 @min-[640px]:grid-cols-2 @min-[1040px]:grid-cols-3">
            {shown.map((template) => (
              <li key={template.type}>
                <GameCard template={template} disabled={creating} onChoose={() => void choose(template)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

interface GameCardProps {
  template: GameTemplate
  disabled: boolean
  onChoose: () => void
}

function GameCard({ template, disabled, onChoose }: GameCardProps) {
  const def = gameRegistry[template.type]
  const badge = def.badge && BADGES[def.badge]
  return (
    <article className="flex h-full flex-col rounded-[14px] border border-[#EDF1F7] bg-white p-[6px] pb-[10px] shadow-[0_1px_3px_rgba(31,42,68,0.04)]">
      <div className="relative">
        <img src={cardArt(template.type)} alt="" className="block h-[115px] w-full rounded-[11px] object-cover" />
        {badge && (
          <span className={`absolute top-[8px] right-[8px] rounded-full px-[11px] py-[3px] text-[12.5px] font-bold ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-[6px]">
        <h3 className="m-0 mt-[10px] text-[17px] font-black">{template.name}</h3>
        <p className="m-0 mt-[4px] text-[13.5px] leading-[1.4] text-ink-soft">{template.description}</p>
        <div className="mt-[9px] flex flex-wrap gap-[7px]">
          <Chip icon={<PeopleIcon />}>{def.players}</Chip>
          <Chip icon={<ClockIcon size={16} strokeWidth={2.2} />}>{def.duration}</Chip>
          <Chip icon={<img src={`${ASSETS}/${def.usesQuestions ? 'chip-book' : 'chip-nobook'}.png`} alt="" className="size-[18px]" />}>
            {def.usesQuestions ? 'Cần bộ câu hỏi' : 'Không cần câu hỏi'}
          </Chip>
        </div>
        <div className="mt-auto pt-[10px]">
          <button
            type="button"
            onClick={onChoose}
            disabled={disabled}
            aria-label={`Chọn trò chơi ${template.name}`}
            className="flex h-[34px] w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border-0 bg-primary font-[inherit] text-[14.5px] font-semibold text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
          >
            Chọn trò chơi
            <ArrowRightIcon size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </article>
  )
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex h-[27px] items-center gap-[7px] rounded-[8px] bg-[#F1F3F8] px-[10px] text-[12.5px] text-ink">
      <span className="flex text-[#2F3A5A]">{icon}</span>
      {children}
    </span>
  )
}

function PeopleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="8" r="4" />
      <path d="M1.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5v.5h-15z" />
      <circle cx="17" cy="9" r="3" opacity=".75" />
      <path d="M17.5 13.5c2.9.3 5 2.3 5 5.5v1.5h-4.2c0-2.9-1-5.2-2.9-6.8.6-.1 1.3-.2 2.1-.2z" opacity=".75" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#3F4B68" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="M20.5 20.5l-5-5" />
    </svg>
  )
}
