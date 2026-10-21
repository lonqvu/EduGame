import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { layStars } from '@/game-engine/lucky-star/luckyStars'
import { BoardFooter } from '@/game-engine/shared/BoardFooter'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { TurnQuestion } from '@/game-engine/shared/TurnQuestion'
import { turnTeam } from '@/game-engine/shared/turnBoard'
import { useTurnBoard } from '@/game-engine/shared/useTurnBoard'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'

const STAR_COLORS = ['#FFC93C', '#FF9F43', '#7BC8F6', '#B98CFF', '#FF8FB1']

interface LuckyStarScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Ngôi sao may mắn": numbered stars, each hiding a question or a stroke of luck. The teams take turns
 * picking a star; a lucky star gives its points at once, a question star is answered for them.
 */
export function LuckyStarScreen({ game, questions, settings }: LuckyStarScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.LUCKY_STAR)
  const { playable, layout: stars, round, state, dispatch, restart } = useTurnBoard(questions, rules, (dealt) => {
    const layout = layStars(dealt.length, rules.luckyStars)
    return { layout, cells: layout.length }
  })
  const sound = useSound()
  const backTo = editPath(game.id)

  const luckyOpen = state.current !== null && state.lucky
  useEffect(() => {
    if (luckyOpen) sound.play('fanfare')
  }, [luckyOpen, sound])

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} />

  const team = turnTeam(state)
  const opened = state.done.filter(Boolean).length
  const current = state.current !== null ? stars[state.current] : null
  const lastOne = opened + 1 >= stars.length
  const columns = stars.length > 20 ? 7 : stars.length > 12 ? 6 : stars.length > 8 ? 5 : 4

  return (
    <PlayFrame
      title={game.title}
      progress={`Đã mở ${opened} / ${stars.length} ngôi sao`}
      extra={
        current?.kind === 'question' &&
        rules.timeLimitSec > 0 &&
        !state.revealed && <Countdown key={`${round}-${state.current}`} seconds={rules.timeLimitSec} paused={state.revealed} />
      }
      backTo={backTo}
    >
      {current?.kind === 'question' ? (
        <TurnQuestion
          state={state}
          question={playable[current.question]}
          rules={rules}
          dispatch={dispatch}
          heading={`Ngôi sao số ${state.current! + 1} · ${rules.points} điểm`}
          closeLabel={lastOne ? 'Xem kết quả' : 'Quay lại bảng sao'}
        />
      ) : (
        <>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,#25336B,#3B2A6E)] px-8 py-4">
            <div className="grid w-full gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {stars.map((_, i) => (
                <motion.button
                  key={`${round}-${i}`}
                  type="button"
                  disabled={state.done[i] || state.current !== null}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.025, type: 'spring', bounce: 0.5 }}
                  whileHover={state.done[i] ? undefined : { scale: 1.1, rotate: 6 }}
                  onClick={() => {
                    sound.play('pop')
                    const cell = stars[i]
                    dispatch({ type: 'open', cell: i, points: rules.points, lucky: cell.kind === 'lucky' })
                  }}
                  aria-label={state.done[i] ? `Ngôi sao số ${i + 1}, đã mở` : `Ngôi sao số ${i + 1}`}
                  className="relative flex h-[86px] cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-[inherit] disabled:cursor-default"
                >
                  <Star color={state.done[i] ? '#56608A' : STAR_COLORS[i % STAR_COLORS.length]} number={i + 1} />
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {luckyOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#1B2350]/85 text-white"
                >
                  <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.6 }} className="text-[110px] leading-none">
                    🌟
                  </motion.span>
                  <span className="font-display text-[54px] font-extrabold">Ngôi sao may mắn!</span>
                  <span className="text-[30px] font-extrabold text-sun">
                    {team.name} được +{state.stake} điểm
                  </span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'close' })}
                    className={`${playButtonClass} mt-2 bg-sun text-ink`}
                  >
                    {lastOne ? 'Xem kết quả' : 'Tiếp tục'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <TeamBar teams={state.teams} activeId={team.id} activeLabel="Đến lượt chọn sao" />
          <BoardFooter message={luckyOpen ? 'Thật may mắn!' : `${team.name} chọn một ngôi sao nhé!`} onFinish={() => dispatch({ type: 'finish' })} />
        </>
      )}
    </PlayFrame>
  )
}

function Star({ color, number }: { color: string; number: number }) {
  return (
    <svg width={86} height={86} viewBox="0 0 86 86" aria-hidden="true">
      <path d="M43 4 l11 24 26 3 -19 18 5 26 -23 -13 -23 13 5 -26 -19 -18 26 -3z" fill={color} stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={3} strokeLinejoin="round" />
      <text x={43} y={53} textAnchor="middle" fontSize={22} fontWeight={800} fill="#1F2A44">
        {number}
      </text>
    </svg>
  )
}
