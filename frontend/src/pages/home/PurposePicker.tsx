import { Link, useNavigate } from 'react-router'
import { ArrowRightIcon } from '@/components/ui/icons'
import { playPath } from '@/game-engine/registry'
import { useSettingsStore } from '@/store/settingsStore'
import type { GameSummary, GameType } from '@/types/game'
import { enterFullscreen } from '@/utils/fullscreen'
import { PURPOSES, purposeGame, type Purpose } from '@/utils/purposes'

const TILE_COLORS: Record<Purpose['key'], string> = {
  warmup: 'bg-[#FFF1D6] hover:bg-[#FFE8BC]',
  review: 'bg-[#E3EEFF] hover:bg-[#D3E3FF]',
  call: 'bg-[#FDE6F0] hover:bg-[#FBD6E6]',
  groups: 'bg-[#DDF6E8] hover:bg-[#C9F0DA]',
  timer: 'bg-[#EEE8FF] hover:bg-[#E2D9FF]',
}

interface PurposePickerProps {
  /** The teacher's games, newest first. */
  games: GameSummary[]
  /** Type of the sample game being opened, if any. */
  busy: string | null
  onPlayNow: (type: GameType) => void
}

/**
 * "Hôm nay cô muốn làm gì?": five things a lesson needs, each one click from the projector. A purpose plays the
 * teacher's latest game for it, else a sample game or the tool; the tile says which before the click.
 */
export function PurposePicker({ games, busy, onPlayNow }: PurposePickerProps) {
  const navigate = useNavigate()
  const fullscreenOnStart = useSettingsStore((s) => s.settings.display.fullscreenOnStart)
  const firstTime = games.length === 0

  const play = (purpose: Purpose, game: GameSummary | undefined) => {
    if (!game) {
      onPlayNow(purpose.fallback)
      return
    }
    if (busy) return
    // Asked inside the click: browsers only allow full screen right after a click.
    if (fullscreenOnStart) enterFullscreen()
    navigate(playPath(game))
  }

  return (
    <section aria-labelledby="purpose-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 id="purpose-title" className="m-0 text-[21px] leading-tight font-black">
            Hôm nay cô muốn làm gì?
          </h2>
          <p className="m-0 text-[14px] text-ink-soft">
            {firstTime
              ? 'Lần đầu dùng Lớp vui? Bấm một ô là lên màn chiếu, có sẵn câu hỏi mẫu, chưa cần tạo lớp.'
              : 'Bấm một ô là lên màn chiếu.'}
          </p>
        </div>
        <Link to="/games/new" className="flex items-center gap-1.5 text-[14px] font-extrabold text-primary">
          Tất cả trò chơi
          <ArrowRightIcon size={15} strokeWidth={2.5} />
        </Link>
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 max-sm:[&>li:last-child]:col-span-2 sm:grid-cols-3 lg:grid-cols-5">
        {PURPOSES.map((purpose) => {
          const game = purposeGame(purpose, games)
          const opening = !game && busy === purpose.fallback
          const what = game ? `Chơi lại: ${game.title}` : purpose.fallbackText
          return (
            <li key={purpose.key} className="min-w-0">
              <button
                type="button"
                onClick={() => play(purpose, game)}
                disabled={!!busy}
                aria-label={`${purpose.title}: ${what}`}
                className={`group flex h-full min-h-[118px] w-full cursor-pointer flex-col items-start gap-1.5 rounded-[18px] border-0 p-4 text-left font-[inherit] text-ink transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(31,42,68,0.1)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${TILE_COLORS[purpose.key]}`}
              >
                <span aria-hidden="true" className="text-[30px] leading-none">
                  {purpose.icon}
                </span>
                <span className="text-[16.5px] leading-tight font-black">{purpose.title}</span>
                <span className="line-clamp-2 text-[13px] leading-snug text-ink-soft">{opening ? 'Đang mở…' : what}</span>
                <span className="mt-auto flex items-center gap-1 pt-1 text-[13px] font-extrabold text-primary">
                  ▶ Chơi
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
