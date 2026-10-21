import { motion } from 'motion/react'
import { arrivedTeam, boatStep } from '@/game-engine/boat-race/boatRace'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { useBuzzerQuiz } from '@/game-engine/quiz/useBuzzerQuiz'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { QuestionPanel } from '@/game-engine/shared/QuestionPanel'
import type { TeamScore } from '@/game-engine/shared/teamScore'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'
import { streakRate } from '@/sound/streak'

const MOUNTAIN_WIDTH = 470
const MOUNTAIN_HEIGHT = 600
/** Where the trails start (above the team buttons) and the summit. */
const BASE_Y = 500
const SUMMIT_Y = 92

interface MountainClimbScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Leo núi": quiz rules with a buzzer; every right answer takes the team's climber one stage up its
 * trail. The first climber on the summit plants the team's flag and wins.
 */
export function MountainClimbScreen({ game, questions, settings }: MountainClimbScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.MOUNTAIN_CLIMB)
  const { playable, round, state, dispatch, restart } = useBuzzerQuiz(questions, rules)
  const sound = useSound()
  const backTo = editPath(game.id)
  const steps = rules.raceSteps

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Leo nhanh nhất" />

  const question = playable[state.index]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const arrived = arrivedTeam(state.teams, steps)
  const ends = !!arrived || state.index === playable.length - 1

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.index + 1} / ${playable.length}`}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <div className="flex min-h-0 flex-1 gap-5">
        <Mountain
          teams={state.teams}
          steps={steps}
          answeringId={state.answeringTeamId}
          triedIds={state.revealed ? state.teams.map((t) => t.id) : state.triedTeams}
          onPick={(teamId) => {
            sound.play('pop')
            dispatch({ type: 'pickTeam', teamId })
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <QuestionPanel
            question={question}
            tried={state.tried}
            revealed={state.revealed}
            canChoose={!!answering}
            layout="list"
            fontSize={36}
            onChoose={(optionId) => {
              if (optionId === question.correctId) {
                sound.play('correct', { rate: streakRate(answering?.streak ?? 0) })
                setTimeout(() => sound.play('whoosh'), 250)
                if (answering && answering.correct + 1 >= steps) setTimeout(() => sound.play('applause'), 700)
              } else {
                sound.play('wrong')
              }
              dispatch({ type: 'choose', optionId, correctId: question.correctId, points: rules.points, allowSteal: rules.allowSteal })
            }}
          />
          <PlayFooter
            message={
              arrived
                ? `${arrived.name} đã lên đỉnh!`
                : state.revealed
                  ? 'Đáp án đúng đã hiện.'
                  : answering
                    ? `${answering.name} chọn đáp án nào?`
                    : 'Đội nào giành quyền?'
            }
            clearCorner={false}
            revealed={state.revealed}
            onReveal={() => dispatch({ type: 'reveal' })}
            onFinish={() => dispatch({ type: 'finish' })}
            onNext={() => dispatch(arrived ? { type: 'finish' } : { type: 'next', total: playable.length })}
            nextLabel={ends ? 'Xem kết quả' : 'Câu tiếp theo'}
          />
        </div>
      </div>
    </PlayFrame>
  )
}

interface MountainProps {
  teams: TeamScore[]
  steps: number
  answeringId: string | null
  triedIds: string[]
  onPick: (teamId: string) => void
}

/** The mountain: one trail per team from its button at the foot to the summit, its climber one stage per right answer. */
function Mountain({ teams, steps, answeringId, triedIds, onPick }: MountainProps) {
  const column = MOUNTAIN_WIDTH / teams.length
  const stage = (BASE_Y - SUMMIT_Y) / steps
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[28px]" style={{ width: MOUNTAIN_WIDTH, height: MOUNTAIN_HEIGHT }}>
      <svg width={MOUNTAIN_WIDTH} height={MOUNTAIN_HEIGHT} className="absolute inset-0" aria-hidden="true">
        <defs>
          <linearGradient id="mc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#BFE3FF" />
            <stop offset="1" stopColor="#E8F5FF" />
          </linearGradient>
        </defs>
        <rect width={MOUNTAIN_WIDTH} height={MOUNTAIN_HEIGHT} fill="url(#mc-sky)" />
        <circle cx={MOUNTAIN_WIDTH - 60} cy={60} r={30} fill="#FFD43B" />
        <path d={`M-40 ${BASE_Y + 20} L${MOUNTAIN_WIDTH / 2} ${SUMMIT_Y - 40} L${MOUNTAIN_WIDTH + 40} ${BASE_Y + 20} Z`} fill="#7FB77E" />
        <path d={`M-40 ${BASE_Y + 20} L${MOUNTAIN_WIDTH / 2} ${SUMMIT_Y - 40} L${MOUNTAIN_WIDTH / 2 + 30} ${BASE_Y + 20} Z`} fill="#6AA56B" />
        <path
          d={`M${MOUNTAIN_WIDTH / 2 - 52} ${SUMMIT_Y + 18} L${MOUNTAIN_WIDTH / 2} ${SUMMIT_Y - 40} L${MOUNTAIN_WIDTH / 2 + 52} ${SUMMIT_Y + 18} L${MOUNTAIN_WIDTH / 2 + 22} ${SUMMIT_Y + 4} L${MOUNTAIN_WIDTH / 2} ${SUMMIT_Y + 20} L${MOUNTAIN_WIDTH / 2 - 24} ${SUMMIT_Y + 4} Z`}
          fill="#FFFFFF"
        />
        <rect y={BASE_Y + 20} width={MOUNTAIN_WIDTH} height={MOUNTAIN_HEIGHT - BASE_Y} fill="#5C9A5D" />
        {teams.map((team, i) => {
          const x = column * (i + 0.5)
          return (
            <g key={team.id}>
              <line x1={x} x2={x} y1={BASE_Y} y2={SUMMIT_Y} stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" />
              {Array.from({ length: steps + 1 }, (_, s) => (
                <circle key={s} cx={x} cy={BASE_Y - s * stage} r={s === steps ? 9 : 6} fill={s === steps ? '#FFD43B' : '#FFFFFF'} stroke={team.color} strokeWidth={3} />
              ))}
            </g>
          )
        })}
      </svg>

      {teams.map((team, i) => {
        const x = column * (i + 0.5)
        const step = boatStep(team, steps)
        const active = team.id === answeringId
        const done = triedIds.includes(team.id)
        return (
          <div key={team.id}>
            <motion.div
              className="absolute"
              initial={false}
              animate={{ x: x - 22, y: BASE_Y - step * stage - 52 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 1 }}
              style={{ left: 0, top: 0 }}
            >
              <Climber color={team.color} flag={step >= steps} />
            </motion.div>
            <button
              type="button"
              onClick={() => onPick(team.id)}
              disabled={done}
              aria-pressed={active}
              aria-label={`${team.name}, chặng ${step} / ${steps}`}
              className="absolute bottom-3 flex cursor-pointer flex-col items-center rounded-2xl border-[3px] bg-white px-1 py-1.5 font-[inherit] text-ink disabled:cursor-default"
              style={{ left: column * i + 6, width: column - 12, borderColor: active ? team.color : '#FFFFFF', opacity: done && !active ? 0.6 : 1 }}
            >
              <span className="flex max-w-full items-center gap-1.5">
                <span className="size-4 shrink-0 rounded-full" style={{ background: team.color }} />
                <span className="truncate text-[17px] font-extrabold">{team.name}</span>
              </span>
              <span className="text-[13px] font-bold text-ink-soft">{active ? 'Đang trả lời' : `Chặng ${step} / ${steps}`}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function Climber({ color, flag }: { color: string; flag: boolean }) {
  return (
    <svg width={44} height={56} viewBox="0 0 44 56" aria-hidden="true">
      {flag && (
        <>
          <rect x="34" y="0" width="3" height="40" fill="#6B4E2E" />
          <path d="M37 2 L44 8 L37 14 Z" fill={color} />
        </>
      )}
      <circle cx="20" cy="12" r="9" fill="#FFD9B8" />
      <path d="M11 10 Q20 0 29 10 Z" fill={color} />
      <rect x="11" y="21" width="18" height="18" rx="6" fill={color} />
      <rect x="6" y="22" width="9" height="13" rx="4" fill="#8B5E34" />
      <path d="M14 38 L10 54 M26 38 L30 54" stroke="#3F4B68" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}
