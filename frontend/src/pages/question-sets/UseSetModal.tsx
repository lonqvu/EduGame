import { App, Button, Input, Modal, Select } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import * as questionSetApi from '@/api/questionSetApi'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, SearchIcon } from '@/components/ui/icons'
import { playPath } from '@/game-engine/registry'
import { gameThumb } from '@/pages/home/homeAssets'
import { useSettingsStore } from '@/store/settingsStore'
import type { QuestionGameCode, QuestionSetSummaryResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { fold } from '@/utils/classrooms'
import { enterFullscreen } from '@/utils/fullscreen'
import { gradeText, subjectInfo, usableCount, USE_GAME_GROUPS, USE_GAMES, type UseGame, type UseGameGroup } from '@/utils/questionSets'

/** Games shown at once: two rows of four, so the dialog fits the screen without scrolling. */
export const GAMES_PER_PAGE = 8

type Filter = UseGameGroup | 'ALL'

/** The games of the group whose name or description has every word searched (accents ignored), playable ones first. */
function listGames(set: QuestionSetSummaryResponse, filter: Filter, search: string): UseGame[] {
  const words = fold(search).split(/\s+/).filter(Boolean)
  const found = USE_GAMES.filter(
    (g) => (filter === 'ALL' || g.group === filter) && words.every((w) => fold(`${g.name} ${g.description}`).includes(w)),
  )
  return [...found.filter((g) => usableCount(set, g.code) > 0), ...found.filter((g) => usableCount(set, g.code) === 0)]
}

/** The page of the list that shows this game (the first if it is not there). */
const pageOf = (games: UseGame[], game?: QuestionGameCode) =>
  Math.floor(
    Math.max(
      0,
      games.findIndex((g) => g.code === game),
    ) / GAMES_PER_PAGE,
  ) + 1

interface UseSetModalProps {
  open: boolean
  /** The teacher's sets, to pick another one with "Đổi bộ". */
  sets: QuestionSetSummaryResponse[]
  /** The set to use; none: the first with questions. */
  presetCode?: string
  onClose: () => void
  /** The game was made (the set's counts changed). */
  onUsed: (setCode: string) => void
}

/**
 * "Chơi": pick the game to play the set's questions with. The questions are copied into a new game, which opens at once
 * on the projector (its introduction shows the rules). Editing the set later does not change the game.
 */
export function UseSetModal(props: UseSetModalProps) {
  // Each opening starts afresh (set and game picked again).
  return props.open ? <UseSetDialog {...props} /> : null
}

function UseSetDialog({ sets, presetCode, onClose, onUsed }: UseSetModalProps) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const fullscreenOnStart = useSettingsStore((s) => s.settings.display.fullscreenOnStart)
  const playable = sets.filter((s) => s.questionCount > 0)
  const [code, setCode] = useState(presetCode ?? playable[0]?.code)
  const set = sets.find((s) => s.code === code)
  const firstUsable = (s?: QuestionSetSummaryResponse) => USE_GAMES.find((g) => s && usableCount(s, g.code) > 0)?.code
  const [game, setGame] = useState<QuestionGameCode | undefined>(firstUsable(set))
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(() => (set ? pageOf(listGames(set, 'ALL', ''), game) : 1))
  const [changingSet, setChangingSet] = useState(false)
  const [making, setMaking] = useState(false)

  const games = set ? listGames(set, filter, search) : []
  const pages = Math.max(1, Math.ceil(games.length / GAMES_PER_PAGE))
  const current = Math.min(page, pages)
  const picked = USE_GAMES.find((g) => g.code === game)
  const partial = set && games.some((g) => usableCount(set, g.code) > 0 && usableCount(set, g.code) < set.questionCount)

  /** A new filter or search: the page of the game picked, if the list still has it. */
  const relist = (nextFilter: Filter, nextSearch: string) => {
    setFilter(nextFilter)
    setSearch(nextSearch)
    if (set) setPage(pageOf(listGames(set, nextFilter, nextSearch), game))
  }

  const pickSet = (next: string) => {
    setCode(next)
    setChangingSet(false)
    const nextSet = sets.find((s) => s.code === next)
    if (!nextSet) return
    const nextGame = game && usableCount(nextSet, game) > 0 ? game : firstUsable(nextSet)
    setGame(nextGame)
    setPage(pageOf(listGames(nextSet, filter, search), nextGame))
  }

  const make = async () => {
    if (!set || !game) return
    // Asked inside the click: browsers only allow full screen right after a click.
    if (fullscreenOnStart) enterFullscreen()
    setMaking(true)
    try {
      const used = await questionSetApi.useQuestionSet(set.code, game)
      onUsed(set.code)
      const skipped = used.skippedCount ? ` (bỏ qua ${used.skippedCount} câu tự luận)` : ''
      if (skipped) message.info(`Trò chơi dùng ${used.questionCount} câu${skipped}.`)
      onClose()
      // Straight to the projector: its introduction shows the rules; the game can be edited later from the library.
      navigate(playPath({ id: used.gameCode, type: game }))
    } catch (error) {
      message.error(apiErrorMessage(error))
      setMaking(false)
    }
  }

  return (
    <Modal
      open
      title={
        <div className="flex items-center gap-3.5 font-normal">
          <span aria-hidden="true" className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] bg-[#FFF1C2] text-[24px]">
            📚
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate font-display text-[25px] leading-tight font-extrabold text-[#1A2440]">
              {set ? (
                <>
                  Chơi <span className="text-primary">{set.title}</span> với trò nào?
                </>
              ) : (
                'Chơi với bộ câu hỏi này'
              )}
            </h2>
            {set && (
              <p className="m-0 text-[14px] text-ink-muted">
                {set.questionCount} câu hỏi · {subjectInfo(set.subject).label} · {gradeText(set.grade)}
              </p>
            )}
          </div>
          {playable.length > 1 && (
            <button
              type="button"
              onClick={() => setChangingSet((v) => !v)}
              aria-expanded={changingSet}
              className="h-10 shrink-0 cursor-pointer rounded-full border-2 border-[#DCE5F5] bg-white px-4 font-[inherit] text-[14px] font-extrabold text-primary hover:border-primary"
            >
              ⇄ Đổi bộ
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex size-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[#F2F5FA] text-ink-muted hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      }
      footer={null}
      closable={false}
      onCancel={onClose}
      width={1040}
      style={{ top: 20 }}
      classNames={{ container: '!rounded-[28px] !px-[30px] !pt-[26px] !pb-6', header: '!mb-5' }}
    >
      <div className="flex flex-col gap-4">
        {changingSet && (
          <Select
            size="large"
            showSearch
            autoFocus
            defaultOpen
            optionFilterProp="label"
            value={code}
            onChange={pickSet}
            notFoundContent="Không có bộ câu hỏi nào"
            options={playable.map((s) => ({
              value: s.code,
              label: `${s.title} (${s.questionCount} câu)`,
            }))}
            aria-label="Bộ câu hỏi"
          />
        )}

        {!set ? (
          <p className="m-0 rounded-[18px] bg-surface-soft px-4 py-10 text-center text-[15px] text-ink-muted">
            Chưa có bộ câu hỏi nào có câu hỏi. Thêm câu hỏi vào một bộ để chơi.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div role="radiogroup" aria-label="Nhóm trò chơi" className="flex flex-wrap gap-2">
                {[{ code: 'ALL' as const, label: 'Tất cả', icon: '' }, ...USE_GAME_GROUPS].map((g) => {
                  const on = filter === g.code
                  const count = listGames(set, g.code, '').length
                  return (
                    <button
                      key={g.code}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => relist(g.code, search)}
                      className={`h-10 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-[14.5px] font-extrabold transition ${
                        on ? 'bg-primary text-white shadow-[0_4px_12px_rgba(53,99,233,0.3)]' : 'bg-[#F2F5FA] text-[#3D4766] hover:text-primary'
                      }`}
                    >
                      {g.icon && <span aria-hidden="true">{g.icon} </span>}
                      {g.label}
                      <span className="ml-1 font-bold opacity-70">{count}</span>
                    </button>
                  )
                })}
              </div>
              <Input
                allowClear
                value={search}
                onChange={(e) => relist(filter, e.target.value)}
                prefix={<SearchIcon size={17} className="text-ink-muted" />}
                placeholder="Tìm trò chơi…"
                aria-label="Tìm trò chơi"
                className="ml-auto h-10 w-full rounded-full border-0 bg-[#F2F5FA] text-[14.5px] sm:w-[250px]"
              />
            </div>

            {games.length === 0 ? (
              <p className="m-0 flex min-h-[376px] flex-col items-center justify-center gap-1 rounded-[20px] bg-surface-soft text-center text-[15px] text-ink-muted">
                <span aria-hidden="true" className="text-[34px]">
                  🔍
                </span>
                Không có trò nào khớp “{search.trim()}”.
              </p>
            ) : (
              <div role="radiogroup" aria-label="Trò chơi" className="grid min-h-[376px] grid-cols-2 content-start gap-3.5 lg:grid-cols-4">
                {games.slice((current - 1) * GAMES_PER_PAGE, current * GAMES_PER_PAGE).map((g) => (
                  <GameCard key={g.code} game={g} set={set} checked={g.code === game} onPick={() => setGame(g.code)} />
                ))}
              </div>
            )}

            <footer className="flex flex-wrap items-center gap-3">
              <p className="m-0 min-w-0 flex-1 text-[13.5px] text-ink-muted">
                {partial && (
                  <>
                    Nhãn{' '}
                    <b className="text-[#B26B00]">
                      {set.multipleChoiceCount}/{set.questionCount} câu
                    </b>
                    : trò chỉ dùng câu trắc nghiệm
                  </>
                )}
              </p>
              {pages > 1 && <Dots page={current} pages={pages} onChange={setPage} />}
              <div className="flex flex-1 justify-end">
                <Button
                  type="primary"
                  size="large"
                  loading={making}
                  disabled={!game}
                  onClick={() => void make()}
                  className="h-[50px] max-w-full rounded-full px-7 text-[17px] font-black shadow-[0_8px_20px_rgba(53,99,233,0.35)]"
                >
                  <span className="truncate">▶ Chơi {picked?.name ?? ''}</span>
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>
    </Modal>
  )
}

function GameCard({ game, set, checked, onPick }: { game: UseGame; set: QuestionSetSummaryResponse; checked: boolean; onPick: () => void }) {
  const usable = usableCount(set, game.code)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={game.name}
      disabled={usable === 0}
      onClick={onPick}
      className={`relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] bg-white p-0 text-left font-[inherit] text-ink transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? '-translate-y-[3px] border-[3px] border-solid border-primary shadow-[0_10px_22px_rgba(53,99,233,0.22)]'
          : 'border-2 border-solid border-[#EDF1F7] enabled:hover:-translate-y-0.5 enabled:hover:border-[#C9D9F5]'
      }`}
    >
      <span className="relative block">
        <img src={gameThumb(game.code)} alt="" className={`block aspect-[2/1] w-full object-cover ${usable ? '' : 'grayscale'}`} />
        {checked && (
          <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full border-[3px] border-solid border-white bg-primary text-white">
            <CheckIcon size={13} />
          </span>
        )}
        {usable === 0 ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[12px] font-extrabold text-danger">
            Cần câu trắc nghiệm
          </span>
        ) : (
          usable < set.questionCount && (
            <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[12px] font-extrabold text-[#B26B00]">
              {usable}/{set.questionCount} câu
            </span>
          )
        )}
      </span>
      <span className="flex flex-col gap-0.5 px-[13px] pt-[9px] pb-3">
        <span className="text-[16px] font-black">{game.name}</span>
        <span className="truncate text-[13px] text-ink-muted" title={game.description}>
          {game.description}
        </span>
      </span>
    </button>
  )
}

/** ‹ ● ○ ○ › Trang 1/3: the current page a long dot. */
function Dots({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  const arrow =
    'flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-[#F2F5FA] text-ink-muted transition enabled:hover:text-primary disabled:cursor-default disabled:opacity-40'
  return (
    <nav aria-label="Trang trò chơi" className="flex items-center gap-2">
      <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)} className={arrow}>
        <ChevronLeftIcon size={16} />
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Trang ${n}`}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => onChange(n)}
          className={`h-2.5 cursor-pointer rounded-full border-0 p-0 transition-all ${n === page ? 'w-7 bg-primary' : 'w-2.5 bg-[#D5DDEB] hover:bg-[#AFC0DE]'}`}
        />
      ))}
      <button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onChange(page + 1)} className={arrow}>
        <ChevronRightIcon size={16} />
      </button>
      <span className="ml-1 text-[13px] text-[#8A93A8]">
        Trang {page}/{pages}
      </span>
    </nav>
  )
}
