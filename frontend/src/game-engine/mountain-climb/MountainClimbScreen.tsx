import i18n from 'i18next'
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
const ART = '/assets/games/mountain-climb'
/**
 * The painted mountain (mountain.webp, drawn 470 × 600): its peak is at (237, 75). The trails start low on its slopes,
 * above the team buttons, and meet just under the snow, a little apart so the climbers do not hide each other.
 */
const PEAK_X = 237
const BASE_Y = 470
const SUMMIT_Y = 138
/** How far apart the trails end at the top, as a share of how far apart they start. */
const SUMMIT_SPREAD = 0.3
/** Climbers are drawn this tall; the pictures are about 0.62 as wide as high. */
const CLIMBER_H = 66
/** Team colours that have a climber picture (grid-board/teams). */
const CLIMBER_COLORS: Record<string, string> = { '#F28C28': 'orange', '#3563E9': 'blue', '#2E9E6A': 'green', '#8B5CF6': 'purple' }

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
    return <NothingToPlay message={i18n.t('play.nothing.quiz')} backTo={backTo} />
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="climb" />

  const question = playable[state.index]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const arrived = arrivedTeam(state.teams, steps)
  const ends = !!arrived || state.index === playable.length - 1

  return (
    <PlayFrame
      title={game.title}
      progress={i18n.t('play.common.question', { number: state.index + 1, total: playable.length })}
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
                ? i18n.t('play.climb.summit', { team: arrived.name })
                : state.revealed
                  ? i18n.t('play.common.answerShown')
                  : answering
                    ? i18n.t('play.common.whichAnswerShort', { team: answering.name })
                    : i18n.t('play.common.whoBuzzedShort')
            }
            clearCorner={false}
            revealed={state.revealed}
            onReveal={() => dispatch({ type: 'reveal' })}
            onFinish={() => dispatch({ type: 'finish' })}
            onNext={() => dispatch(arrived ? { type: 'finish' } : { type: 'next', total: playable.length })}
            nextLabel={ends ? i18n.t('play.common.seeResults') : i18n.t('play.common.nextQuestion')}
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

/**
 * The mountain: one trail per team from its button at the foot up the slope to just under the summit, its climber one
 * stage per right answer. The trails lean in towards the peak, as paths up a mountain do.
 */
function Mountain({ teams, steps, answeringId, triedIds, onPick }: MountainProps) {
  const column = MOUNTAIN_WIDTH / teams.length
  /** Where a team's trail is at stage `s` (0 at the foot, `steps` at the top). */
  const at = (i: number, s: number) => {
    const baseX = column * (i + 0.5)
    const topX = PEAK_X + (baseX - PEAK_X) * SUMMIT_SPREAD
    const t = s / steps
    return { x: baseX + (topX - baseX) * t, y: BASE_Y + (SUMMIT_Y - BASE_Y) * t }
  }
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[28px]" style={{ width: MOUNTAIN_WIDTH, height: MOUNTAIN_HEIGHT }}>
      <img src={`${ART}/mountain.webp`} alt="" className="absolute inset-0 size-full object-cover" />
      <svg width={MOUNTAIN_WIDTH} height={MOUNTAIN_HEIGHT} className="absolute inset-0" aria-hidden="true">
        {teams.map((team, i) => {
          const foot = at(i, 0)
          const top = at(i, steps)
          return (
            <g key={team.id}>
              <line x1={foot.x} y1={foot.y} x2={top.x} y2={top.y} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={5} strokeDasharray="2 12" strokeLinecap="round" />
              {Array.from({ length: steps + 1 }, (_, s) => {
                const p = at(i, s)
                return <circle key={s} cx={p.x} cy={p.y} r={s === steps ? 9 : 6} fill={s === steps ? '#FFD43B' : '#FFFFFF'} stroke={team.color} strokeWidth={3} />
              })}
            </g>
          )
        })}
      </svg>

      {teams.map((team, i) => {
        const step = boatStep(team, steps)
        const p = at(i, step)
        const active = team.id === answeringId
        const done = triedIds.includes(team.id)
        // The climbers face right: those whose trail goes up to the left turn around.
        const facesLeft = column * (i + 0.5) > PEAK_X + 1
        return (
          <div key={team.id}>
            <motion.div
              className="absolute top-0 left-0"
              initial={false}
              animate={{ x: p.x, y: p.y }}
              transition={{ type: 'spring', bounce: 0.3, duration: 1 }}
            >
              <Climber color={team.color} summit={step >= steps} facesLeft={facesLeft} />
            </motion.div>
            <button
              type="button"
              onClick={() => onPick(team.id)}
              disabled={done}
              aria-pressed={active}
              aria-label={i18n.t('play.boat.stage', { team: team.name, step, steps })}
              className="absolute bottom-3 flex cursor-pointer flex-col items-center rounded-2xl border-[3px] bg-white px-1 py-1.5 font-[inherit] text-ink disabled:cursor-default"
              style={{ left: column * i + 6, width: column - 12, borderColor: active ? team.color : '#FFFFFF', opacity: done && !active ? 0.6 : 1 }}
            >
              <span className="flex max-w-full items-center gap-1.5">
                <span className="size-4 shrink-0 rounded-full" style={{ background: team.color }} />
                <span className="truncate text-[17px] font-extrabold">{team.name}</span>
              </span>
              <span className="text-[13px] font-bold text-ink-soft">{active ? i18n.t('play.common.answering') : i18n.t('play.boat.stageShort', { step, steps })}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

/**
 * A team's climber, standing with its feet on the trail (the box's origin is where the feet are): climbing on the way,
 * arms up with the team's flag planted beside it on the summit.
 */
function Climber({ color, summit, facesLeft }: { color: string; summit: boolean; facesLeft: boolean }) {
  const name = CLIMBER_COLORS[color] ?? 'blue'
  const width = Math.round(CLIMBER_H * (summit ? 0.92 : 0.62))
  return (
    <div className="pointer-events-none absolute" style={{ left: -width / 2, top: -CLIMBER_H + 4, width, height: CLIMBER_H }}>
      {summit && (
        <svg width="34" height="62" viewBox="0 0 34 62" className="absolute -top-3 -right-5" aria-hidden="true">
          <rect x="3" y="2" width="4" height="60" rx="2" fill="#6B4E2E" />
          <motion.path d="M7 4 L32 12 L7 22 Z" fill={color} stroke="#FFFFFF" strokeWidth="1.5" animate={{ scaleX: [1, 0.85] }} style={{ originX: 0 }} transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }} />
        </svg>
      )}
      <motion.img
        key={summit ? 'victory' : 'climber'}
        src={`${ART}/${summit ? 'victory' : 'climber'}-${name}.webp`}
        alt=""
        draggable={false}
        className="block size-full select-none object-contain drop-shadow-[0_3px_2px_rgba(31,42,68,0.25)]"
        style={{ scaleX: facesLeft && !summit ? -1 : 1 }}
        initial={summit ? { scale: 0.6, y: 10 } : false}
        animate={summit ? { scale: 1, y: [0, -6] } : { y: [0, -2] }}
        transition={summit ? { scale: { type: 'spring', bounce: 0.5 }, y: { duration: 0.45, repeat: Infinity, repeatType: 'reverse' } } : { duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
      />
    </div>
  )
}
