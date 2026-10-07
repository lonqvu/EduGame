import { App } from 'antd'
import { motion } from 'motion/react'
import { useState } from 'react'
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
      <span className="text-[22px] font-extrabold text-sun-ink">Kết thúc trò chơi</span>
      <motion.h1
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="m-0 font-display text-[60px] leading-none font-extrabold"
      >
        {headline}
      </motion.h1>

      <div className="flex h-[300px] items-end gap-5">
        {podiumOrder(ranked).map((team, i) => (
          <div key={team.id} className="flex w-[180px] flex-col items-center gap-2.5">
            <span
              className="box-border size-16 rounded-full border-[5px] border-white"
              style={{ background: team.color }}
            />
            <span className="text-xl font-extrabold">{team.name}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: podiumHeight(team.rank) }}
              transition={{ delay: 0.2 + i * 0.12, type: 'spring', bounce: 0.3 }}
              className="flex w-full flex-col items-center justify-center overflow-hidden rounded-t-[22px] rounded-b-lg bg-white"
            >
              <span className="font-display text-[40px] leading-none font-extrabold">{team.score}</span>
              <span className="text-base font-bold text-ink-soft">Hạng {team.rank}</span>
            </motion.div>
          </div>
        ))}
      </div>

      {(mostCorrect || longestStreak) && (
        <div className="flex gap-4">
          {mostCorrect && (
            <div className="flex items-center gap-3 rounded-[20px] bg-white px-5 py-3">
              <BoltIcon size={28} className="text-[#9A4A00]" />
              <span className="text-lg font-extrabold">
                Đúng nhiều câu nhất · {mostCorrect.name}
              </span>
            </div>
          )}
          {longestStreak && longestStreak.bestStreak >= 2 && (
            <div className="flex items-center gap-3 rounded-[20px] bg-white px-5 py-3">
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
            className="flex h-[60px] cursor-pointer items-center gap-2.5 rounded-full border-0 bg-primary px-7 font-[inherit] text-[19px] font-extrabold text-white hover:brightness-110 disabled:cursor-default disabled:opacity-60"
          >
            <FilledStarIcon size={22} stroke="#FFFFFF" />
            {starsGiven ? 'Đã thưởng sao' : `Thưởng ${WINNER_STARS} sao cho ${winnerNames}`}
          </button>
        )}
        <button
          type="button"
          onClick={playAgain}
          className="h-[60px] cursor-pointer rounded-full border-0 bg-white px-[26px] font-[inherit] text-[19px] font-extrabold text-ink hover:text-primary-ink"
        >
          Chơi lại
        </button>
        <Link
          to="/"
          className="flex h-[60px] items-center rounded-full bg-white px-[26px] text-[19px] font-extrabold text-ink hover:text-primary-ink"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
