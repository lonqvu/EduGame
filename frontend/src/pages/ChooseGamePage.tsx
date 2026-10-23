import { App, Dropdown } from 'antd'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, HomeIcon, MoreVerticalIcon, SearchIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { editPath, gameRegistry, playPath, startPath } from '@/game-engine/registry'
import {
  cardArt,
  GROUPS,
  groupEntries,
  popularCount,
  searchEntries,
  type ChooserEntry,
  type ChooserGroup,
} from '@/pages/choose-game/chooserEntries'
import { GameTile, PlayTriangle } from '@/pages/choose-game/GameTile'
import { usePlayNow } from '@/pages/choose-game/usePlayNow'
import { useCatalogStore } from '@/store/catalogStore'
import { useClassStore } from '@/store/classStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { GameCategory, GameSummary, GameType } from '@/types/game'
import { relativeTimeLabel } from '@/utils/dateLabels'
import { gradeLabel } from '@/utils/gameMapping'

const RECENT_LIMIT = 3
/** Cards of a group shown on a phone before "Xem thêm". */
const PHONE_LIMIT = 6
/** Height of the sticky bar: a group scrolled to starts below it. */
const BAR_OFFSET = 96
/** The time a smooth scroll to a group takes, from now. */
const soon = () => Date.now() + 1000

/**
 * /games/new: every game on one page, in groups by what the teacher prepares (questions, own content, the class
 * list, nothing), as small cards. The chips of the sticky bar jump to a group and light up with the group being
 * read; a search shows the matching games in one grid instead.
 */
export function ChooseGamePage() {
  const { message } = App.useApp()
  const templates = useCatalogStore((s) => s.templates)
  const status = useCatalogStore((s) => s.status)
  const loadTemplates = useCatalogStore((s) => s.load)
  const loadTeacher = useTeacherStore((s) => s.load)
  const loadClass = useClassStore((s) => s.load)
  const games = useGameLibraryStore((s) => s.games)
  const loadGames = useGameLibraryStore((s) => s.loadGames)

  const [query, setQuery] = useState('')
  const [current, setCurrent] = useState<GameCategory>('QUESTION')
  /** Groups opened past PHONE_LIMIT on a phone. */
  const [opened, setOpened] = useState<GameCategory[]>([])
  const groupRefs = useRef<Partial<Record<GameCategory, HTMLElement | null>>>({})
  /** Until then the page is scrolling to the group a chip jumped to, which stays lit. */
  const jumpingUntil = useRef(0)
  const { playNow, busy } = usePlayNow()

  useEffect(() => {
    void loadTemplates()
    void loadClass()
    void loadTeacher()
    void loadGames()
  }, [loadTemplates, loadClass, loadTeacher, loadGames])

  const searching = query.trim() !== ''

  // The chip of the group being read: the last one whose top went under the bar, the last group at the bottom of
  // the page (it may never reach the bar).
  useEffect(() => {
    if (searching || status !== 'ready') return
    const onScroll = () => {
      if (Date.now() < jumpingUntil.current) return
      let reading: GameCategory = 'QUESTION'
      for (const g of GROUPS) {
        const top = groupRefs.current[g.key]?.getBoundingClientRect().top
        if (top !== undefined && top < BAR_OFFSET + 40) reading = g.key
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) reading = GROUPS[GROUPS.length - 1].key
      setCurrent(reading)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [searching, status])

  /** "Chơi ngay": the sample game, or the tool, on the projector at once. */
  const play = ({ template, pickMode }: ChooserEntry) => {
    if (!gameRegistry[template.type].playable) {
      message.info(`Trò "${template.name}" đang được hoàn thiện.`)
      return
    }
    void playNow(template.type, pickMode ? `/tools/pick/${pickMode}` : undefined)
  }

  const jump = (key: GameCategory) => {
    setQuery('')
    setCurrent(key)
    jumpingUntil.current = soon()
    const el = groupRefs.current[key]
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - BAR_OFFSET, behavior: 'smooth' })
  }

  if (status === 'error') return <LoadError onRetry={() => void loadTemplates()} />
  if (status !== 'ready') return <PageLoading />

  const groups = groupEntries(templates)
  const found = searching ? searchEntries(templates, query) : []
  const tile = (entry: ChooserEntry, popular: boolean) => (
    <GameTile entry={entry} popular={popular} opening={busy === entry.template.type && !entry.pickMode} onPlay={() => play(entry)} />
  )

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <nav aria-label="Đường dẫn" className="hidden items-center gap-2.5 text-[14px] text-ink-soft sm:flex">
            <Link to="/" aria-label="Trang chủ" className="flex text-[#8A93A8] hover:text-primary">
              <HomeIcon size={18} />
            </Link>
            <Link to="/" className="text-ink-soft hover:text-primary">
              Trang chủ
            </Link>
            <ChevronRightIcon size={14} strokeWidth={2.4} />
            <span className="font-semibold text-ink">Chọn trò chơi</span>
          </nav>
          <h1 className="m-0 mt-1 text-[28px] leading-tight font-black text-[#1A2440] sm:mt-3 sm:text-[32px]">Chọn trò chơi</h1>
          <p className="m-0 mt-1 text-[14px] text-[#4A5470]">
            Bấm vào trò để chơi ngay với câu hỏi mẫu, đổi sang câu hỏi của cô ở màn bắt đầu.
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <TopBar />
        </div>
      </header>

      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-[16px] bg-white/95 p-2 shadow-[0_4px_14px_rgba(31,42,68,0.07)] backdrop-blur">
        <label className="flex h-10 min-w-0 flex-[1_1_100%] items-center gap-2.5 rounded-full bg-[#F2F5FA] px-4 focus-within:ring-2 focus-within:ring-primary/40 md:flex-[0_1_300px]">
          <SearchIcon size={17} className="shrink-0 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trò chơi…"
            aria-label="Tìm kiếm trò chơi"
            className="min-w-0 flex-1 border-0 bg-transparent font-[inherit] text-[14.5px] text-ink outline-none placeholder:text-[#8A93A8]"
          />
        </label>
        <span className="ml-1 hidden text-[13px] font-bold text-[#8A93A8] md:inline">Đi tới:</span>
        <nav aria-label="Nhóm trò chơi" className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] md:flex-none">
          {GROUPS.map((g) => {
            const on = !searching && current === g.key
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => jump(g.key)}
                aria-current={on ? 'true' : undefined}
                className={`h-10 shrink-0 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-[14px] font-extrabold whitespace-nowrap transition ${
                  on ? 'bg-primary text-white' : 'bg-[#F2F5FA] text-[#3D4766] hover:text-primary'
                }`}
              >
                <span aria-hidden="true">{g.icon} </span>
                {g.key === 'CLASS_TOOL' ? 'Công cụ' : g.title}
                <span className="ml-1 font-bold opacity-65">{groups[g.key].length}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {searching ? (
        <section aria-label="Kết quả tìm kiếm" className="rounded-[20px] bg-white px-4 pt-3.5 pb-4">
          <h2 className="m-0 mb-3 text-[18px] font-black">Tìm thấy {found.length} trò</h2>
          {found.length === 0 ? (
            <p className="m-0 py-10 text-center text-ink-soft">Không tìm thấy trò chơi nào phù hợp.</p>
          ) : (
            <TileGrid>{found.map((e) => <li key={e.key}>{tile(e, false)}</li>)}</TileGrid>
          )}
        </section>
      ) : (
        <>
          {games.length > 0 && <RecentGames games={games} templateName={(t) => templates.find((x) => x.type === t)?.name ?? ''} />}
          {GROUPS.map((g) => (
            <GroupSection key={g.key} group={g} count={groups[g.key].length} sectionRef={(el) => (groupRefs.current[g.key] = el)}>
              {g.key === 'CLASS_TOOL' ? (
                <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                  {groups[g.key].map((e) => (
                    <li key={e.key}>
                      <button
                        type="button"
                        onClick={() => play(e)}
                        aria-label={`Chơi ngay ${e.name}`}
                        title={e.description}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-[14px] border-2 border-transparent bg-[#F6F8FC] p-1.5 pr-2.5 text-left font-[inherit] text-[13.5px] font-extrabold text-ink transition hover:border-[#C9D9F5]"
                      >
                        <img src={e.art} alt="" loading="lazy" className="h-[34px] w-[52px] shrink-0 rounded-[9px] object-cover" />
                        <span className="line-clamp-2 min-w-0 leading-tight">{e.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <TileGrid>
                    {groups[g.key].map((e, i) => (
                      <li key={e.key} className={i >= PHONE_LIMIT && !opened.includes(g.key) ? 'max-sm:hidden' : ''}>
                        {tile(e, i < popularCount(groups[g.key].length))}
                      </li>
                    ))}
                  </TileGrid>
                  {groups[g.key].length > PHONE_LIMIT && !opened.includes(g.key) && (
                    <button
                      type="button"
                      onClick={() => setOpened((o) => [...o, g.key])}
                      className="mt-3 h-10 w-full cursor-pointer rounded-[12px] border-0 bg-[#F2F5FA] font-[inherit] text-[14px] font-extrabold text-primary sm:hidden"
                    >
                      Xem thêm {groups[g.key].length - PHONE_LIMIT} trò ▾
                    </button>
                  )}
                </>
              )}
            </GroupSection>
          ))}
        </>
      )}
    </div>
  )
}

function TileGrid({ children }: { children: ReactNode }) {
  return <ul className="m-0 grid list-none grid-cols-3 gap-x-3 gap-y-4 p-0 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{children}</ul>
}

interface GroupSectionProps {
  group: ChooserGroup
  count: number
  sectionRef: (el: HTMLElement | null) => void
  children: ReactNode
}

function GroupSection({ group, count, sectionRef, children }: GroupSectionProps) {
  return (
    <section ref={sectionRef} aria-label={group.title} className="rounded-[20px] bg-white px-4 pt-3.5 pb-4">
      <div className="mb-3 flex items-center gap-2.5">
        <h2 className="m-0 text-[18px] font-black whitespace-nowrap">
          <span aria-hidden="true">{group.icon} </span>
          {group.title}
        </h2>
        <span className="rounded-full bg-[#EEF2F8] px-2.5 py-0.5 text-[12.5px] font-extrabold whitespace-nowrap text-[#5B6580]">{count} trò</span>
        <span className="hidden truncate text-[13.5px] text-[#8A93A8] sm:inline">{group.hint}</span>
      </div>
      {children}
    </section>
  )
}

/** The last games the teacher made or played, to play again; the menu edits them. */
function RecentGames({ games, templateName }: { games: GameSummary[]; templateName: (type: GameType) => string }) {
  const className = useClassStore((s) => s.className)
  const grade = useClassStore((s) => s.grade)
  const [all, setAll] = useState(false)
  const shown = all ? games : games.slice(0, RECENT_LIMIT)
  /** "Trắc nghiệm · Lớp 3A · 10 câu · 5 ngày trước"; tools say what they do instead. */
  const line = (game: GameSummary) =>
    [
      templateName(game.type),
      gameRegistry[game.type].usesQuestions
        ? `${className && game.grade === grade ? className : gradeLabel(game.grade)} · ${game.itemCount} ${gameRegistry[game.type].itemUnit}`
        : 'Chọn học sinh ngẫu nhiên',
      relativeTimeLabel(game.updatedAt),
    ]
      .filter(Boolean)
      .join(' · ')

  return (
    <section aria-label="Chơi lại" className="rounded-[20px] bg-white px-4 pt-3.5 pb-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2 text-[18px] font-black">
          <ClockIcon size={21} className="text-primary" />
          Chơi lại
        </h2>
        {games.length > RECENT_LIMIT && (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-[inherit] text-[14px] font-bold text-primary hover:text-primary-ink"
          >
            {all ? 'Thu gọn' : 'Xem tất cả'}
            {all ? <ChevronDownIcon size={16} className="rotate-180" /> : <ArrowRightIcon size={16} strokeWidth={2.4} />}
          </button>
        )}
      </div>
      <ul className="-mx-1 m-0 flex list-none gap-3 overflow-x-auto p-0 px-1 pb-1 [scrollbar-width:none] md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
        {shown.map((game) => (
          <li key={game.id} className="flex min-w-[280px] items-center gap-3 rounded-[16px] border-2 border-[#EDF1F7] p-[7px] md:min-w-0">
            <Link to={playPath(game)} aria-label={`Chơi lại ${game.title}`} className="flex min-w-0 flex-1 items-center gap-3 text-ink hover:text-ink">
              <img src={cardArt(game.type)} alt="" className="aspect-[2/1] w-[76px] shrink-0 rounded-[10px] object-cover" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14.5px] font-black">{game.title}</span>
                <span className="truncate text-[12.5px] text-ink-soft">{line(game)}</span>
              </span>
              <span aria-hidden="true" className="ml-auto flex size-[34px] shrink-0 items-center justify-center rounded-full border-2 border-[#DCE5F5] text-primary">
                <PlayTriangle size={12} />
              </span>
            </Link>
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  ...(gameRegistry[game.type].hasEditor ? [{ key: 'edit', label: <Link to={editPath(game.id)}>Soạn câu hỏi</Link> }] : []),
                  { key: 'start', label: <Link to={startPath(game)}>Luật chơi & cài đặt</Link> },
                ],
              }}
            >
              <button
                type="button"
                aria-label={`Tùy chọn cho ${game.title}`}
                className="flex h-9 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[#3F4B68] hover:bg-surface-soft"
              >
                <MoreVerticalIcon size={18} />
              </button>
            </Dropdown>
          </li>
        ))}
      </ul>
    </section>
  )
}
