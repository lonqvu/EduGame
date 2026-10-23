import { App, Input, Modal, Select } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import * as questionSetApi from '@/api/questionSetApi'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@/components/ui/icons'
import { playPath } from '@/game-engine/registry'
import { gameThumb } from '@/pages/home/homeAssets'
import { useSettingsStore } from '@/store/settingsStore'
import type { QuestionGameCode, QuestionSetSummaryResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { fold } from '@/utils/classrooms'
import { enterFullscreen } from '@/utils/fullscreen'
import { usableCount, USE_GAMES } from '@/utils/questionSets'

/** Games shown at once: two rows of four, so the dialog fits the screen without scrolling. */
export const GAMES_PER_PAGE = 8
/** The page of the dialog that shows this game. */
const pageOf = (game?: QuestionGameCode) => Math.floor(Math.max(0, USE_GAMES.findIndex((g) => g.code === game)) / GAMES_PER_PAGE) + 1
/** The games whose name or description has every word searched, accents ignored. */
const searchGames = (search: string) => {
  const words = fold(search).split(/\s+/).filter(Boolean)
  return USE_GAMES.filter((g) => words.every((w) => fold(`${g.name} ${g.description}`).includes(w)))
}

interface UseSetModalProps {
  open: boolean
  /** The teacher's sets, to pick one when none was chosen. */
  sets: QuestionSetSummaryResponse[]
  /** The set to use; none: the teacher picks it here. */
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
  const playable = sets.filter((s) => s.questionCount > 0)
  const [code, setCode] = useState(presetCode ?? playable[0]?.code)
  const set = sets.find((s) => s.code === code)
  const firstUsable = (s?: QuestionSetSummaryResponse) => USE_GAMES.find((g) => s && usableCount(s, g.code) > 0)?.code
  const [game, setGame] = useState<QuestionGameCode | undefined>(firstUsable(set))
  const [page, setPage] = useState(() => pageOf(game))
  const [search, setSearch] = useState('')
  const found = searchGames(search)
  const pages = Math.max(1, Math.ceil(found.length / GAMES_PER_PAGE))
  const onSearch = (text: string) => {
    setSearch(text)
    // Cleared: back to the page of the game picked.
    setPage(text.trim() ? 1 : pageOf(game))
  }
  const [making, setMaking] = useState(false)
  const fullscreenOnStart = useSettingsStore((s) => s.settings.display.fullscreenOnStart)

  const pickSet = (next: string) => {
    setCode(next)
    const nextSet = sets.find((s) => s.code === next)
    if (!game || !nextSet || usableCount(nextSet, game) === 0) {
      const next = firstUsable(nextSet)
      setGame(next)
      setPage(pageOf(next))
    }
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
      title="Chơi với bộ câu hỏi này"
      okText="▶ Chơi ngay"
      cancelText="Hủy"
      okButtonProps={{ disabled: !set || !game }}
      confirmLoading={making}
      onOk={() => void make()}
      onCancel={onClose}
      width={1040}
      style={{ top: 20 }}
    >
      <div className="flex flex-col gap-4 pt-1">
        {!presetCode && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-ink-soft">Bộ câu hỏi</span>
            <Select
              size="large"
              showSearch
              optionFilterProp="label"
              value={code}
              onChange={pickSet}
              notFoundContent="Chưa có bộ câu hỏi nào có câu hỏi"
              options={playable.map((s) => ({ value: s.code, label: `${s.title} (${s.questionCount} câu)` }))}
              aria-label="Bộ câu hỏi"
            />
          </label>
        )}
        {set && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 min-w-0 flex-[1_1_380px] text-[14.5px] text-ink-soft">
                Chọn trò chơi cho <strong className="text-ink">{set.title}</strong>. Sửa bộ câu hỏi sau này không làm đổi trò chơi.
              </p>
              <Input
                size="large"
                allowClear
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                prefix={<SearchIcon size={18} className="text-ink-muted" />}
                placeholder="Tìm trò chơi…"
                aria-label="Tìm trò chơi"
                className="w-full rounded-full text-[15px] sm:w-[280px]"
              />
            </div>
            {found.length === 0 && (
              <p className="m-0 flex min-h-[200px] flex-col items-center justify-center gap-1 rounded-[18px] bg-surface-soft text-center text-[15px] text-ink-muted">
                <span aria-hidden="true" className="text-[34px]">🔍</span>
                Không có trò nào khớp “{search.trim()}”.
              </p>
            )}
            <div role="radiogroup" aria-label="Trò chơi" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {found.slice((page - 1) * GAMES_PER_PAGE, page * GAMES_PER_PAGE).map((g) => {
                const usable = usableCount(set, g.code)
                const checked = g.code === game
                return (
                  <button
                    key={g.code}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    disabled={usable === 0}
                    onClick={() => setGame(g.code)}
                    className={`relative flex cursor-pointer flex-col overflow-hidden rounded-[16px] border-2 bg-white p-0 text-left font-[inherit] text-ink transition disabled:cursor-not-allowed disabled:opacity-55 ${
                      checked ? 'border-primary shadow-[0_6px_16px_rgba(53,99,233,0.18)]' : 'border-line-soft enabled:hover:border-[#C9D9F5]'
                    }`}
                  >
                    <img src={gameThumb(g.code)} alt="" className="aspect-[3/1] w-full object-cover" />
                    {checked && (
                      <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white">
                        <CheckIcon size={14} />
                      </span>
                    )}
                    <span className="flex flex-col gap-0.5 px-3 py-2">
                      <span className="text-[15px] font-extrabold">{g.name}</span>
                      <span className="line-clamp-2 min-h-[2.6em] text-[12.5px] leading-snug text-ink-muted">{g.description}</span>
                      <span className={`mt-1 text-[12.5px] font-bold ${usable ? 'text-success' : 'text-danger'}`}>
                        {usable
                          ? usable === set.questionCount
                            ? `Dùng được cả ${usable} câu`
                            : `Dùng được ${usable}/${set.questionCount} câu trắc nghiệm`
                          : 'Bộ chưa có câu trắc nghiệm'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-full bg-surface-soft py-1.5 pr-1.5 pl-4">
              <span className="text-[13.5px] text-ink-muted">
                {search.trim() ? `Tìm thấy ${found.length} trò` : `${USE_GAMES.length} trò chơi`} · đang chọn{' '}
                <strong className="text-primary-ink">{USE_GAMES.find((g) => g.code === game)?.name ?? '—'}</strong>
              </span>
              {pages > 1 && <Pager page={Math.min(page, pages)} pages={pages} onChange={setPage} />}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

/** Round, friendly page buttons: ‹ 1 2 3 ›, the current page filled. */
function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  const arrow =
    'flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-ink shadow-[0_1px_3px_rgba(31,42,68,0.12)] transition enabled:hover:text-primary disabled:cursor-default disabled:opacity-40'
  return (
    <nav aria-label="Trang trò chơi" className="flex items-center gap-1.5">
      <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)} className={arrow}>
        <ChevronLeftIcon size={18} />
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Trang ${n}`}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => onChange(n)}
          className={`h-9 min-w-9 cursor-pointer rounded-full border-0 px-3 font-[inherit] text-[14.5px] font-extrabold transition ${
            n === page ? 'bg-primary text-white shadow-[0_4px_10px_rgba(53,99,233,0.3)]' : 'bg-transparent text-ink-soft hover:bg-white hover:text-primary'
          }`}
        >
          {n}
        </button>
      ))}
      <button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onChange(page + 1)} className={arrow}>
        <ChevronRightIcon size={18} />
      </button>
    </nav>
  )
}
