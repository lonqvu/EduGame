import { motion } from 'motion/react'
import { useReducer, useState } from 'react'
import { ChevronRightIcon, EyeIcon } from '@/components/ui/icons'
import { arrivedTeam, boatStep } from '@/game-engine/boat-race/boatRace'
import { Countdown, QuizOption } from '@/game-engine/quiz/QuizParts'
import { initialQuizRound, playableQuizQuestions, questionFontSize, quizReducer } from '@/game-engine/quiz/quizRound'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import type { TeamScore } from '@/game-engine/shared/teamScore'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'

const RIVER_WIDTH = 1208
const RIVER_HEIGHT = 236
/** Left edge of the water (lane labels sit before it) and the finish line. */
const START_X = 200
const FINISH_X = 1110

interface BoatRaceScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Đua thuyền": quiz rules (a team wins the buzzer, answers, others may steal), but every right answer
 * moves the team's boat one stage down the river. The first boat to reach the finish wins.
 */
export function BoatRaceScreen({ game, questions, settings }: BoatRaceScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.BOAT_RACE)
  const deal = () => playableQuizQuestions(questions, { shuffleItems: rules.shuffleItems, shuffleOptions: rules.shuffleOptions })
  const [playable, setPlayable] = useState(deal)
  const [round, setRound] = useState(0)
  const [state, dispatch] = useReducer(quizReducer, rules.teams, initialQuizRound)
  const backTo = editPath(game.id)
  const steps = rules.raceSteps

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }

  const restart = () => {
    dispatch({ type: 'restart', teamCount: rules.teams })
    setPlayable(deal())
    setRound((r) => r + 1)
  }

  if (state.finished) {
    return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Về đích nhanh nhất" />
  }

  const question = playable[state.index]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const arrived = arrivedTeam(state.teams, steps)
  const ends = !!arrived || state.index === playable.length - 1

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.index + 1} / ${playable.length}`}
      extra={
        rules.timeLimitSec > 0 &&
        !state.revealed && <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />
      }
      backTo={backTo}
    >
      <River
        teams={state.teams}
        steps={steps}
        answeringId={state.answeringTeamId}
        triedIds={state.revealed ? state.teams.map((t) => t.id) : state.triedTeams}
        onPick={(teamId) => dispatch({ type: 'pickTeam', teamId })}
      />

      <div className="flex min-h-[86px] flex-1 items-center gap-5 rounded-[28px] bg-white px-7 py-3">
        {question.imageUrl && <img src={question.imageUrl} alt="" className="h-[80px] w-[110px] shrink-0 rounded-2xl object-cover" />}
        <span className="font-display leading-[1.1] font-extrabold" style={{ fontSize: questionFontSize(question.text, 38) }}>
          {question.text}
        </span>
      </div>

      <div className={`grid gap-2.5 ${question.options.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {question.options.map((option, i) => {
          const tried = state.tried[option.id]
          const right = option.id === question.correctId
          return (
            <QuizOption
              key={option.id}
              option={option}
              index={i}
              trueFalse={question.trueFalse}
              compact
              look={state.revealed && right ? 'right' : tried === false ? 'wrong' : state.revealed ? 'dim' : 'idle'}
              disabled={!answering || state.revealed || tried !== undefined}
              onClick={() =>
                dispatch({
                  type: 'choose',
                  optionId: option.id,
                  correctId: question.correctId,
                  points: rules.points,
                  allowSteal: rules.allowSteal,
                })
              }
            />
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-lg font-extrabold text-ink-soft">
          {arrived
            ? `${arrived.name} đã cập bến!`
            : state.revealed
              ? 'Đáp án đúng đã hiện.'
              : answering
                ? `${answering.name} chọn đáp án nào? Cô bấm vào đáp án đội nói.`
                : 'Đội nào giành quyền trả lời? Cô bấm vào tên đội trên dòng sông.'}
        </span>
        <div className="flex shrink-0 gap-3">
          {!state.revealed && (
            <button type="button" onClick={() => dispatch({ type: 'reveal' })} className={`${playButtonClass} bg-sun-soft text-ink`}>
              <EyeIcon size={22} />
              Hiện đáp án
            </button>
          )}
          <button type="button" onClick={() => dispatch({ type: 'finish' })} className={`${playButtonClass} bg-white text-ink`}>
            Kết thúc
          </button>
          <button
            type="button"
            disabled={!state.revealed}
            onClick={() => dispatch(arrived ? { type: 'finish' } : { type: 'next', total: playable.length })}
            className={`${playButtonClass} bg-primary text-white hover:brightness-110`}
          >
            {ends ? 'Xem kết quả' : 'Câu tiếp theo'}
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </div>
    </PlayFrame>
  )
}

interface RiverProps {
  teams: TeamScore[]
  steps: number
  answeringId: string | null
  triedIds: string[]
  onPick: (teamId: string) => void
}

/** One lane per team: its name (tap to give it the turn) and its boat, which moves one stage per right answer. */
function River({ teams, steps, answeringId, triedIds, onPick }: RiverProps) {
  const laneHeight = RIVER_HEIGHT / teams.length
  const stageWidth = (FINISH_X - START_X) / steps
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[28px]" style={{ width: RIVER_WIDTH, height: RIVER_HEIGHT }}>
      <svg width={RIVER_WIDTH} height={RIVER_HEIGHT} className="absolute inset-0" aria-hidden="true">
        <rect width={START_X} height={RIVER_HEIGHT} fill="#BFE6A8" />
        <rect x={START_X} width={RIVER_WIDTH - START_X} height={RIVER_HEIGHT} fill="#6FBDEB" />
        {Array.from({ length: steps + 1 }, (_, i) => (
          <line
            key={i}
            x1={START_X + i * stageWidth}
            x2={START_X + i * stageWidth}
            y1={6}
            y2={RIVER_HEIGHT - 6}
            stroke="#FFFFFF"
            strokeOpacity={i === steps ? 0 : 0.35}
            strokeDasharray="6 8"
            strokeWidth={2}
          />
        ))}
        {teams.slice(1).map((_, i) => (
          <line key={i} x1={START_X} x2={RIVER_WIDTH} y1={(i + 1) * laneHeight} y2={(i + 1) * laneHeight} stroke="#A9DCF7" strokeWidth={3} />
        ))}
        {[0.2, 0.55, 0.8].map((f) => (
          <path
            key={f}
            d={`M${START_X + 40 + f * 600} ${RIVER_HEIGHT * f} q14 -6 28 0 t28 0`}
            stroke="#D6F0FC"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        {/* The dock at the finish, with a checkered flag. */}
        <rect x={FINISH_X + 10} width={RIVER_WIDTH - FINISH_X - 10} height={RIVER_HEIGHT} fill="#C89B6D" />
        {Array.from({ length: Math.ceil(RIVER_HEIGHT / 18) }, (_, i) => (
          <line key={i} x1={FINISH_X + 10} x2={RIVER_WIDTH} y1={i * 18} y2={i * 18} stroke="#A87C50" strokeWidth={2} />
        ))}
        <rect x={FINISH_X + 34} y={14} width={5} height={56} fill="#6B4E2E" />
        <rect x={FINISH_X + 39} y={16} width={40} height={24} fill="#1F2A44" />
        {[0, 1, 2, 3, 4].flatMap((c) =>
          [0, 1, 2].map((r) =>
            (c + r) % 2 === 0 ? <rect key={`${c}-${r}`} x={FINISH_X + 39 + c * 8} y={16 + r * 8} width={8} height={8} fill="#FFFFFF" /> : null,
          ),
        )}
        <text x={FINISH_X + 52} y={RIVER_HEIGHT - 16} textAnchor="middle" fontSize={20} fontWeight={800} fill="#5A3A1C">
          Bến
        </text>
      </svg>

      {teams.map((team, i) => {
        const top = i * laneHeight
        const active = team.id === answeringId
        const done = triedIds.includes(team.id)
        const step = boatStep(team, steps)
        return (
          <div key={team.id}>
            <button
              type="button"
              onClick={() => onPick(team.id)}
              disabled={done}
              aria-pressed={active}
              aria-label={`${team.name}, chặng ${step} / ${steps}`}
              className="absolute left-2 flex cursor-pointer items-center gap-2 rounded-2xl border-[3px] bg-white px-3 font-[inherit] text-ink disabled:cursor-default"
              style={{
                top: top + 5,
                height: laneHeight - 10,
                width: START_X - 18,
                borderColor: active ? team.color : '#FFFFFF',
                opacity: done && !active ? 0.6 : 1,
              }}
            >
              <span className="size-6 shrink-0 rounded-full" style={{ background: team.color }} />
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="truncate text-lg font-extrabold">{team.name}</span>
                <span className="text-[13px] font-bold text-ink-soft">{active ? 'Đang trả lời' : `Chặng ${step} / ${steps}`}</span>
              </span>
            </button>
            <motion.div
              className="absolute"
              initial={false}
              animate={{ x: START_X + 8 + step * stageWidth - (step === steps ? 64 : 0), y: [top + laneHeight / 2 - 30, top + laneHeight / 2 - 34, top + laneHeight / 2 - 30] }}
              transition={{ x: { type: 'spring', bounce: 0.25, duration: 1.1 }, y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' } }}
              style={{ left: 0, top: 0 }}
            >
              <Boat color={team.color} size={Math.min(64, laneHeight - 4)} />
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

function Boat({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size * 1.2} height={size} viewBox="0 0 72 60" aria-hidden="true">
      <rect x="33" y="4" width="4" height="40" fill="#6B4E2E" />
      <path d="M37 6 L64 34 L37 38 Z" fill="#FFFFFF" />
      <path d="M33 10 L12 36 L33 38 Z" fill="#FFF3C4" />
      <path d="M2 42 L70 42 L58 58 L14 58 Z" fill={color} />
      <path d="M8 46 H64" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="3" />
    </svg>
  )
}
