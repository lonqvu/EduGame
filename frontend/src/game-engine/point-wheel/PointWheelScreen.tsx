import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { stakeOf, WHEEL_SEGMENTS } from '@/game-engine/point-wheel/pointWheel'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { TurnQuestion } from '@/game-engine/shared/TurnQuestion'
import { turnTeam } from '@/game-engine/shared/turnBoard'
import { useTurnBoard } from '@/game-engine/shared/useTurnBoard'
import { SpinWheel } from '@/game-engine/spin-wheel/SpinWheel'
import { rotationFor } from '@/game-engine/spin-wheel/wheelMath'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'

/** The wheel is drawn at 560×600 and shown smaller beside the turn panel. */
const WHEEL_SCALE = 0.86

interface PointWheelScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Vòng quay điểm thưởng": the team whose turn it is spins the wheel, which decides what the next question
 * is worth (or doubles the team's score, or loses the turn); then the team answers it.
 */
export function PointWheelScreen({ game, questions, settings }: PointWheelScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.POINT_WHEEL)
  const { playable, round, state, dispatch, restart } = useTurnBoard(questions, rules, (dealt) => ({ layout: null, cells: dealt.length }))
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  /** Segment the wheel stopped on, until its question is opened or the lost turn passed. */
  const [landed, setLanded] = useState<number | null>(null)
  // The segment the wheel is spinning to, known at the start (the wheel only reports that it stopped).
  const target = useRef(0)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }
  if (state.finished) {
    return (
      <TeamResults
        teams={state.teams}
        onPlayAgain={() => {
          setLanded(null)
          restart()
        }}
      />
    )
  }

  const team = turnTeam(state)
  const asked = state.done.filter(Boolean).length
  const next = state.done.indexOf(false)

  if (state.current !== null) {
    return (
      <PlayFrame
        title={game.title}
        progress={`Câu ${asked + 1} / ${state.done.length}`}
        extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.current}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
        backTo={backTo}
      >
        <TurnQuestion
          state={state}
          question={playable[state.current]}
          rules={rules}
          dispatch={dispatch}
          heading={`${team.name} · câu hỏi đáng ${state.stake} điểm`}
          closeLabel={asked + 1 >= state.done.length ? 'Xem kết quả' : 'Lượt tiếp theo'}
        />
      </PlayFrame>
    )
  }

  const segment = landed !== null ? WHEEL_SEGMENTS[landed] : null
  const stake = segment ? stakeOf(segment, team.score) : 0

  const spin = () => {
    if (spinning || landed !== null) return
    const index = Math.floor(Math.random() * WHEEL_SEGMENTS.length)
    target.current = index
    sound.play('whoosh')
    setSpinning(true)
    setRotation((r) => rotationFor(index, WHEEL_SEGMENTS.length, r))
  }

  return (
    <PlayFrame title={game.title} progress={`Câu ${Math.min(asked + 1, state.done.length)} / ${state.done.length}`} backTo={backTo}>
      <div className="flex min-h-0 flex-1 items-center gap-6">
        <div className="relative shrink-0" style={{ width: 560 * WHEEL_SCALE, height: 600 * WHEEL_SCALE }}>
          <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `scale(${WHEEL_SCALE})` }}>
            <SpinWheel
              labels={WHEEL_SEGMENTS.map((s) => s.label)}
              rotation={rotation}
              onSpinEnd={() => {
                if (!spinning) return
                setSpinning(false)
                setLanded(target.current)
                const landedOn = WHEEL_SEGMENTS[target.current]
                sound.play(landedOn.kind === 'lose' ? 'wrong' : landedOn.kind === 'double' ? 'fanfare' : 'reveal')
              }}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 self-stretch">
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[28px] bg-white px-6 py-5 text-center">
            {segment ? (
              <>
                <span className="text-xl font-extrabold text-ink-soft">{team.name} quay được</span>
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.55 }}
                  className={`font-display text-[64px] leading-none font-extrabold ${segment.kind === 'lose' ? 'text-danger' : 'text-primary-ink'}`}
                >
                  {segment.kind === 'points' ? `${segment.points} điểm` : segment.label}
                </motion.span>
                <span className="text-xl font-bold text-ink-soft">
                  {segment.kind === 'lose'
                    ? 'Tiếc quá! Lượt chuyển sang đội tiếp theo.'
                    : segment.kind === 'double'
                      ? `Trả lời đúng thì điểm của đội được nhân đôi (+${stake} điểm).`
                      : 'Trả lời đúng câu hỏi để nhận số điểm này.'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLanded(null)
                    if (segment.kind === 'lose') {
                      dispatch({ type: 'skipTurn' })
                      return
                    }
                    sound.play('pop')
                    dispatch({ type: 'open', cell: next, points: stake })
                  }}
                  className={`${playButtonClass} mt-2 bg-primary text-white hover:brightness-110`}
                >
                  {segment.kind === 'lose' ? 'Lượt tiếp theo' : 'Xem câu hỏi'}
                </button>
              </>
            ) : (
              <>
                <span className="text-xl font-extrabold text-ink-soft">Đến lượt</span>
                <span className="flex items-center gap-3 font-display text-[46px] leading-none font-extrabold">
                  <span className="size-9 rounded-full" style={{ background: team.color }} />
                  {team.name}
                </span>
                <button
                  type="button"
                  disabled={spinning}
                  onClick={spin}
                  className={`${playButtonClass} mt-3 h-16 bg-sun px-10 text-[24px] text-ink`}
                >
                  {spinning ? 'Đang quay…' : '🎡 Quay'}
                </button>
              </>
            )}
          </div>
          <TeamBar teams={state.teams} activeId={team.id} activeLabel="Đến lượt" columns={2} />
          <button type="button" onClick={() => dispatch({ type: 'finish' })} className={`${playButtonClass} justify-center bg-white text-ink`}>
            Kết thúc
          </button>
        </div>
      </div>
    </PlayFrame>
  )
}
