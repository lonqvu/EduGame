import { motion } from 'motion/react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { useBuzzerQuiz } from '@/game-engine/quiz/useBuzzerQuiz'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { QuestionPanel } from '@/game-engine/shared/QuestionPanel'
import type { TeamScore } from '@/game-engine/shared/teamScore'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { pullWinner, ropePosition } from '@/game-engine/tug-of-war/tugOfWar'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'
import { streakRate } from '@/sound/streak'

const FIELD_WIDTH = 1208
const FIELD_HEIGHT = 210
/** Pixels the rope moves per step, from the middle line. */
const STEP_PX = 74

interface TugOfWarScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Kéo co": two teams, quiz rules with a buzzer; each right answer pulls the rope one step toward the
 * team. The team that pulls the ribbon over its line wins; when the questions run out, the rope decides.
 */
export function TugOfWarScreen({ game, questions, settings }: TugOfWarScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.TUG_OF_WAR)
  const { playable, round, state, dispatch, restart } = useBuzzerQuiz(questions, rules, 2)
  const sound = useSound()
  const backTo = editPath(game.id)
  const steps = rules.raceSteps

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Kéo khỏe nhất" />

  const question = playable[state.index]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const winner = pullWinner(state.teams, steps)
  const ends = !!winner || state.index === playable.length - 1

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.index + 1} / ${playable.length}`}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <Field
        teams={state.teams}
        position={ropePosition(state.teams, steps)}
        steps={steps}
        answeringId={state.answeringTeamId}
        triedIds={state.revealed ? state.teams.map((t) => t.id) : state.triedTeams}
        onPick={(teamId) => {
          sound.play('pop')
          dispatch({ type: 'pickTeam', teamId })
        }}
      />
      <QuestionPanel
        question={question}
        tried={state.tried}
        revealed={state.revealed}
        canChoose={!!answering}
        fontSize={36}
        onChoose={(optionId) => {
          if (optionId === question.correctId) {
            sound.play('correct', { rate: streakRate(answering?.streak ?? 0) })
            setTimeout(() => sound.play('whoosh'), 250)
          } else {
            sound.play('wrong')
          }
          dispatch({ type: 'choose', optionId, correctId: question.correctId, points: rules.points, allowSteal: rules.allowSteal })
        }}
      />
      <PlayFooter
        message={
          winner
            ? `${winner.name} kéo dây qua vạch!`
            : state.revealed
              ? 'Đáp án đúng đã hiện.'
              : answering
                ? `${answering.name} chọn đáp án nào?`
                : 'Đội nào giành quyền? Cô bấm tên đội ở hai đầu dây.'
        }
        revealed={state.revealed}
        onReveal={() => dispatch({ type: 'reveal' })}
        onFinish={() => dispatch({ type: 'finish' })}
        onNext={() => {
          if (winner) sound.play('applause')
          dispatch(winner ? { type: 'finish' } : { type: 'next', total: playable.length })
        }}
        nextLabel={ends ? 'Xem kết quả' : 'Câu tiếp theo'}
      />
    </PlayFrame>
  )
}

interface FieldProps {
  teams: TeamScore[]
  position: number
  steps: number
  answeringId: string | null
  triedIds: string[]
  onPick: (teamId: string) => void
}

/** The field: the two teams pulling, the rope with its red ribbon, and each team's line. */
function Field({ teams, position, steps, answeringId, triedIds, onPick }: FieldProps) {
  const middle = FIELD_WIDTH / 2
  const step = Math.min(STEP_PX, (middle - 230) / steps)
  // The whole rope (and the pullers) moves with the ribbon.
  const shift = -position * step
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[28px]" style={{ width: FIELD_WIDTH, height: FIELD_HEIGHT }}>
      <svg width={FIELD_WIDTH} height={FIELD_HEIGHT} className="absolute inset-0" aria-hidden="true">
        <rect width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="#CDEBFF" />
        <rect y={FIELD_HEIGHT * 0.55} width={FIELD_WIDTH} height={FIELD_HEIGHT * 0.45} fill="#9ED37E" />
        <line x1={middle} x2={middle} y1={FIELD_HEIGHT * 0.5} y2={FIELD_HEIGHT} stroke="#FFFFFF" strokeWidth={4} strokeDasharray="10 8" />
        {teams.slice(0, 2).map((team, i) => {
          const x = middle + (i === 0 ? -1 : 1) * steps * step
          return <rect key={team.id} x={x - 4} y={FIELD_HEIGHT * 0.5} width={8} height={FIELD_HEIGHT * 0.5} fill={team.color} rx={3} />
        })}
      </svg>

      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ x: shift }}
        transition={{ type: 'spring', bounce: 0.35, duration: 0.9 }}
      >
        <svg width={FIELD_WIDTH} height={FIELD_HEIGHT} className="absolute inset-0" aria-hidden="true">
          <path d={`M60 ${FIELD_HEIGHT * 0.56} H${FIELD_WIDTH - 60}`} stroke="#B07A3E" strokeWidth={9} strokeLinecap="round" />
          <path d={`M60 ${FIELD_HEIGHT * 0.56} H${FIELD_WIDTH - 60}`} stroke="#D9A566" strokeWidth={3} strokeDasharray="8 10" />
          <path d={`M${middle} ${FIELD_HEIGHT * 0.56} l-12 34 h24 z`} fill="#E5484D" />
          {teams.slice(0, 2).map((team, i) =>
            [0, 1, 2].map((k) => {
              const x = i === 0 ? 250 + k * 70 : FIELD_WIDTH - 250 - k * 70
              return <Puller key={`${team.id}-${k}`} x={x} y={FIELD_HEIGHT * 0.56} color={team.color} facing={i === 0 ? 1 : -1} />
            }),
          )}
        </svg>
      </motion.div>

      {teams.slice(0, 2).map((team, i) => {
        const active = team.id === answeringId
        const done = triedIds.includes(team.id)
        return (
          <button
            key={team.id}
            type="button"
            onClick={() => onPick(team.id)}
            disabled={done}
            aria-pressed={active}
            aria-label={`${team.name}, ${team.correct} câu đúng`}
            className={`absolute top-3 flex cursor-pointer items-center gap-2 rounded-2xl border-[3px] bg-white px-4 py-2 font-[inherit] text-ink disabled:cursor-default ${
              i === 0 ? 'left-3' : 'right-3'
            }`}
            style={{ borderColor: active ? team.color : '#FFFFFF', opacity: done && !active ? 0.6 : 1 }}
          >
            <span className="size-6 rounded-full" style={{ background: team.color }} />
            <span className="flex flex-col text-left leading-tight">
              <span className="text-xl font-extrabold">{team.name}</span>
              <span className="text-[13px] font-bold text-ink-soft">{active ? 'Đang trả lời' : `${team.correct} câu đúng`}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** A kid pulling the rope, leaning back away from the middle. */
function Puller({ x, y, color, facing }: { x: number; y: number; color: string; facing: 1 | -1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${-facing} 1)`}>
      <path d="M0 0 L14 -38" stroke={color} strokeWidth={16} strokeLinecap="round" />
      <circle cx={18} cy={-52} r={13} fill="#FFD9B8" />
      <path d="M6 -56 Q18 -72 30 -56 Z" fill="#3F2A1E" />
      <path d="M2 2 L-14 40 M2 2 L16 40" stroke="#3F4B68" strokeWidth={8} strokeLinecap="round" />
      <path d="M10 -26 L-4 0" stroke="#FFD9B8" strokeWidth={7} strokeLinecap="round" />
    </g>
  )
}
