import { App } from 'antd'
import { motion } from 'motion/react'
import { useState } from 'react'
import { blockStyle, darken, lighten, orbStyle } from '@/components/projector/materials'
import { Link, useNavigate } from 'react-router'
import { BoltIcon, FilledStarIcon, MedalIcon } from '@/components/ui/icons'
import { bestBy, podiumHeight, podiumOrder, rankTeams } from '@/game-engine/grid-board/ranking'
import { useGridBoardRound } from '@/game-engine/grid-board/useGridBoardRound'
import { useGridBoardStore } from '@/store/gridBoardStore'

const WINNER_STARS = 3

/** Projector: podium, awards and what to do next. */
export function GridResultsScreen({ gameId }: { gameId: string }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  useGridBoardRound(gameId)
  const teams = useGridBoardStore((s) => s.teams)
  const restart = useGridBoardStore((s) => s.restart)
  const [starsGiven, setStarsGiven] = useState(false)

  const ranked = rankTeams(teams)
  const winners = ranked.filter((t) => t.rank === 1 && t.score > 0)
  const winnerNames = winners.map((t) => t.name).join(' và ')
  const headline =
    winners.length === 0 ? 'Cả lớp đã cố gắng!' : winners.length === 1 ? `${winnerNames} chiến thắng!` : `${winnerNames} cùng thắng!`

  const mostCorrect = bestBy(teams, (t) => t.correct)
  const longestStreak = bestBy(teams, (t) => t.bestStreak)

  const playAgain = () => {
    restart()
    navigate(`/play/${gameId}`)
  }

  const giveStars = () => {
    setStarsGiven(true)
    message.success(`Đã thưởng ${WINNER_STARS} sao cho ${winnerNames}`)
  }

  return (
    <div className="relative flex h-full flex-col items-center gap-[18px] px-12 py-7">
      <Confetti />
      <span className="text-[22px] font-extrabold text-sun-ink">Kết thúc trò chơi</span>
      <motion.h1
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="relative m-0 font-display text-[60px] leading-none font-extrabold drop-shadow-[0_3px_0_#fff]"
      >
        {headline}
      </motion.h1>

      <div className="flex h-[330px] items-end gap-5">
        {podiumOrder(ranked).map((team, i) => {
          const champion = team.rank === 1 && team.score > 0
          return (
            <div key={team.id} className="flex w-[180px] flex-col items-center">
              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.12, type: 'spring', bounce: 0.5 }}
                className="relative mb-2 flex flex-col items-center"
              >
                {champion && <CrownIcon className="absolute -top-[30px] drop-shadow-[0_3px_2px_rgb(120_78_20/0.35)]" />}
                <motion.span
                  animate={champion ? { y: [0, -6, 0] } : undefined}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="block size-[68px] rounded-full border-4 border-white"
                  style={orbStyle(team.color)}
                />
              </motion.div>
              <span className="mb-2 text-xl font-extrabold drop-shadow-[0_1px_0_#fff]">{team.name}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: podiumHeight(team.rank) }}
                transition={{ delay: 0.2 + i * 0.12, type: 'spring', bounce: 0.3 }}
                className="relative w-full overflow-hidden rounded-t-[14px] rounded-b-md"
                style={blockStyle(team.color)}
              >
                {/* Top face of the step, seen from slightly above */}
                <div className="h-3 w-full" style={{ background: lighten(team.color, 40) }} />
                <div className="flex flex-col items-center pt-2 text-white">
                  <span
                    className="font-display text-[44px] leading-none font-extrabold"
                    style={{ textShadow: `0 3px 0 ${darken(team.color, 35)}` }}
                  >
                    {team.score}
                  </span>
                  <span className="mt-1 rounded-full bg-white/25 px-3 py-0.5 text-base font-extrabold">
                    Hạng {team.rank}
                  </span>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>
      <div className="-mt-[18px] h-4 w-[800px] rounded-full bg-[#8a5a1c]/25 blur-[6px]" aria-hidden />

      {(mostCorrect || longestStreak) && (
        <div className="flex gap-4">
          {mostCorrect && (
            <div className="mat-card flex items-center gap-3 rounded-[20px] px-5 py-3">
              <BoltIcon size={28} className="text-[#9A4A00]" />
              <span className="text-lg font-extrabold">
                Đúng nhiều câu nhất · {mostCorrect.name}
              </span>
            </div>
          )}
          {longestStreak && longestStreak.bestStreak >= 2 && (
            <div className="mat-card flex items-center gap-3 rounded-[20px] px-5 py-3">
              <MedalIcon size={28} className="text-success" />
              <span className="text-lg font-extrabold">
                Đúng {longestStreak.bestStreak} câu liên tiếp · {longestStreak.name}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-1 flex gap-3.5">
        {winners.length > 0 && (
          <button
            type="button"
            onClick={giveStars}
            disabled={starsGiven}
            className="mat-btn mat-btn-primary flex h-[60px] cursor-pointer items-center gap-2.5 rounded-full border-0 px-7 font-[inherit] text-[19px] font-extrabold text-white disabled:cursor-default disabled:opacity-60"
          >
            <FilledStarIcon size={22} stroke="#FFFFFF" />
            {starsGiven ? 'Đã thưởng sao' : `Thưởng ${WINNER_STARS} sao cho ${winnerNames}`}
          </button>
        )}
        <button
          type="button"
          onClick={playAgain}
          className="mat-btn h-[60px] cursor-pointer rounded-full border-0 px-[26px] font-[inherit] text-[19px] font-extrabold text-ink hover:text-primary-ink"
        >
          Chơi lại
        </button>
        <Link
          to="/"
          className="mat-btn flex h-[60px] items-center rounded-full px-[26px] text-[19px] font-extrabold text-ink hover:text-primary-ink"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}

const CONFETTI_COLORS = ['#F28C28', '#3563E9', '#2E9E6A', '#8B5CF6', '#FFD15C', '#FF7A8A']

interface ConfettiPiece {
  x: number
  size: number
  color: string
  round: boolean
  delay: number
  duration: number
  drift: number
  spin: number
}

function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * 1280,
    size: 8 + Math.random() * 10,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: Math.random() < 0.35,
    delay: Math.random() * 6,
    duration: 5 + Math.random() * 4,
    drift: (Math.random() - 0.5) * 160,
    spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 360),
  }))
}

/** Confetti drifting down behind the podium, looping for as long as the screen is shown. */
function Confetti() {
  const [pieces] = useState(() => makeConfetti(46))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block"
          style={{
            left: p.x,
            width: p.size,
            height: p.round ? p.size : p.size * 0.55,
            background: p.color,
            borderRadius: p.round ? '50%' : 3,
            boxShadow: 'inset 0 -2px 0 rgb(0 0 0 / 0.15)',
          }}
          initial={{ y: -40, x: 0, rotate: 0 }}
          animate={{ y: 760, x: p.drift, rotate: p.spin }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg width="46" height="34" viewBox="0 0 46 34" className={className} aria-hidden>
      <path d="M4 10 L13 18 L23 4 L33 18 L42 10 L38 30 H8 Z" fill="#FFD15C" stroke="#B7860B" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M8 26 H38" stroke="#E9B53A" strokeWidth="3" />
      <circle cx="23" cy="4" r="3" fill="#FFF1C7" stroke="#B7860B" strokeWidth="2" />
      <circle cx="4" cy="10" r="2.6" fill="#FFF1C7" stroke="#B7860B" strokeWidth="2" />
      <circle cx="42" cy="10" r="2.6" fill="#FFF1C7" stroke="#B7860B" strokeWidth="2" />
      <path d="M12 13 L14 21" stroke="#FFF6DA" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}
