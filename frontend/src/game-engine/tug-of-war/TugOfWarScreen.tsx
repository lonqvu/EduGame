import i18n from 'i18next'
import { motion } from 'motion/react'
import { useEffect } from 'react'
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
const ART = '/assets/games/tug-of-war'
/** The grass line the pullers stand on, and the rope's height (at the pullers' hands). */
const GROUND_Y = 200
const PULLER_H = 132
const ROPE_Y = GROUND_Y - Math.round(PULLER_H * 0.47)
/** The rope repeats along the field (rope.webp, 400 × 28, drawn 400 × ROPE_H); its pennant hangs in the middle. */
const ROPE_W = 1800
const ROPE_H = 18
const PENNANT_W = 52
/** Three pullers a team, nearest the middle first. */
const PULLERS = [0, 1, 2]
/** How long the winners cheer before the results come up. */
const WIN_CHEER_MS = 3500
/** Each pose's width for PULLER_H, and where its hands are, as a share of its width from the left. */
const POSES = {
  pull: { w: Math.round((PULLER_H * 241) / 320), hand: 0.97 },
  strain: { w: Math.round((PULLER_H * 227) / 320), hand: 0.95 },
}
/** The end pictures of a team (win-*.webp 440 × 300, lose-*.webp 469 × 300), drawn this tall, centred this far from the middle. */
const TEAM_END_H = 150
const TEAM_END = {
  win: { w: Math.round((TEAM_END_H * 440) / 300), h: TEAM_END_H },
  lose: { w: Math.round((TEAM_END_H * 469) / 300), h: TEAM_END_H },
}
const TEAM_END_X = 270
/** Bushes and grass along the bottom corners, clear of the team buttons. */
const DECOR = [
  { src: 'bush', x: -30, y: 168, w: 150 },
  { src: 'flower-bush', x: 110, y: 172, w: 92 },
  { src: 'grass-tuft-large', x: 1000, y: 168, w: 70 },
  { src: 'bush', x: 1090, y: 166, w: 150 },
]

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
  const winner = pullWinner(state.teams, steps)
  const won = !!winner && !state.finished

  // A team has pulled the rope over its line: a few seconds to cheer, then the results come up on their own.
  useEffect(() => {
    if (!won) return
    sound.play('applause')
    const timer = window.setTimeout(() => dispatch({ type: 'finish' }), WIN_CHEER_MS)
    return () => window.clearTimeout(timer)
  }, [won, sound, dispatch])

  if (playable.length === 0) {
    return <NothingToPlay message={i18n.t('play.nothing.quiz')} backTo={backTo} />
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="pull" />

  const question = playable[state.index]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const ends = !!winner || state.index === playable.length - 1

  return (
    <PlayFrame
      title={game.title}
      progress={i18n.t('play.common.question', { number: state.index + 1, total: playable.length })}
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
            ? i18n.t('play.tug.won', { team: winner.name })
            : state.revealed
              ? i18n.t('play.common.answerShown')
              : answering
                ? i18n.t('play.common.whichAnswerShort', { team: answering.name })
                : i18n.t('play.tug.whoBuzzed')
        }
        revealed={state.revealed}
        onReveal={() => dispatch({ type: 'reveal' })}
        onFinish={() => dispatch({ type: 'finish' })}
        onNext={() => {
          dispatch(winner ? { type: 'finish' } : { type: 'next', total: playable.length })
        }}
        nextLabel={ends ? i18n.t('play.common.seeResults') : i18n.t('play.common.nextQuestion')}
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

/** The field: the two teams pulling, the rope with its red pennant, and each team's line. */
function Field({ teams, position, steps, answeringId, triedIds, onPick }: FieldProps) {
  const middle = FIELD_WIDTH / 2
  const step = Math.min(STEP_PX, (middle - 230) / steps)
  // The whole rope (and the pullers) moves with the pennant.
  const shift = -position * step
  /** Which team is being pulled over: its pullers strain. A positive position: the left team is winning. */
  const losing = position > 0 ? 1 : position < 0 ? 0 : -1
  const ended = Math.abs(position) >= steps
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[28px]" style={{ width: FIELD_WIDTH, height: FIELD_HEIGHT }}>
      <img src={`${ART}/field.webp`} alt="" className="absolute inset-0 size-full object-cover" />
      {/* The middle line and each team's line, standing on the grass. */}
      <img src={`${ART}/center-line.webp`} alt="" className="absolute h-[96px]" style={{ left: middle - 18, top: GROUND_Y - 64 }} />
      {teams.slice(0, 2).map((team, i) => {
        const x = middle + (i === 0 ? -1 : 1) * steps * step
        return <img key={team.id} src={`${ART}/marker-${i === 0 ? 'orange' : 'blue'}.webp`} alt="" className="absolute h-[104px]" style={{ left: x - 8, top: GROUND_Y - 86 }} />
      })}
      {DECOR.map((d) => (
        <img key={d.src + d.x} src={`${ART}/${d.src}.webp`} alt="" className="absolute" style={{ left: d.x, top: d.y, width: d.w }} />
      ))}

      <motion.div className="absolute inset-0" initial={false} animate={{ x: shift }} transition={{ type: 'spring', bounce: 0.35, duration: 0.9 }}>
        {/* The rope runs through every puller's hands; its pennant hangs in the middle. Once won, both teams let go and it drops. */}
        <motion.div className="absolute inset-0" initial={false} animate={{ y: ended ? GROUND_Y - ROPE_Y - 6 : 0 }} transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}>
        <div
          className="absolute"
          style={{
            width: ROPE_W,
            height: ROPE_H,
            left: middle - ROPE_W / 2,
            top: ROPE_Y - ROPE_H / 2,
            backgroundImage: `url(${ART}/rope.webp)`,
            backgroundSize: `400px ${ROPE_H}px`,
            backgroundRepeat: 'repeat-x',
          }}
        />
        <img src={`${ART}/pennant.webp`} alt="" className="absolute" style={{ width: PENNANT_W, left: middle - PENNANT_W / 2, top: ROPE_Y - 8 }} />
        </motion.div>
        {!ended &&
          teams.slice(0, 2).map((team, i) =>
            PULLERS.map((k) => {
              const x = i === 0 ? middle - 135 - k * 84 : middle + 135 + k * 84
              return <Puller key={`${team.id}-${k}`} x={x} side={i === 0 ? 'left' : 'right'} pose={i === losing ? 'strain' : 'pull'} delay={k * 0.12} />
            }),
          )}
      </motion.div>

      {/* Won: both teams let go of the rope; the winners jump for joy, the losers hang their heads. */}
      {ended &&
        teams.slice(0, 2).map((team, i) => (
          <TeamEnd key={team.id} side={i === 0 ? 'left' : 'right'} won={i !== losing} x={middle + (i === 0 ? -1 : 1) * TEAM_END_X} />
        ))}

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
            aria-label={i18n.t('play.tug.correct', { team: team.name, count: team.correct })}
            className={`absolute top-3 flex cursor-pointer items-center gap-2 rounded-2xl border-[3px] bg-white px-4 py-2 font-[inherit] text-ink disabled:cursor-default ${
              i === 0 ? 'left-3' : 'right-3'
            }`}
            style={{ borderColor: active ? team.color : '#FFFFFF', opacity: done && !active ? 0.6 : 1 }}
          >
            <span className="size-6 rounded-full" style={{ background: team.color }} />
            <span className="flex flex-col text-left leading-tight">
              <span className="text-xl font-extrabold">{team.name}</span>
              <span className="text-[13px] font-bold text-ink-soft">{active ? i18n.t('play.common.answering') : i18n.t('play.tug.correctShort', { count: team.correct })}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * A kid pulling the rope, feet on the grass and hands on the rope at `x`. The pictures face right (the left team); the
 * right team's are mirrored. Strain: being pulled over.
 */
function Puller({ x, side, pose, delay }: { x: number; side: 'left' | 'right'; pose: keyof typeof POSES; delay: number }) {
  const team = side === 'left' ? 'orange' : 'blue'
  const { w, hand } = POSES[pose]
  // Place the picture so its hands (a share of its width from the left) are at x.
  const handX = side === 'left' ? hand * w : (1 - hand) * w
  return (
    <motion.img
      src={`${ART}/${team}-${pose}.webp`}
      alt=""
      draggable={false}
      className="absolute select-none"
      style={{ left: x - handX, top: GROUND_Y - PULLER_H, width: w, height: PULLER_H, scaleX: side === 'left' ? 1 : -1, originY: 1 }}
      animate={{ rotate: side === 'left' ? [0, -3] : [0, 3] }}
      transition={{ duration: 0.5, delay, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    />
  )
}

/**
 * A team once the rope is won, as a group picture centred on `x`: jumping for joy, or heads down (one of them on its
 * knees). The losers' picture faces right: on the right side it is mirrored, so they look down towards their line.
 */
function TeamEnd({ side, won, x }: { side: 'left' | 'right'; won: boolean; x: number }) {
  const team = side === 'left' ? 'orange' : 'blue'
  const { w, h } = won ? TEAM_END.win : TEAM_END.lose
  return (
    <motion.img
      src={`${ART}/${won ? 'win' : 'lose'}-${team}.webp`}
      alt=""
      draggable={false}
      className="absolute select-none"
      style={{ left: x - w / 2, top: GROUND_Y - h, width: w, height: h, scaleX: !won && side === 'right' ? -1 : 1, originY: 1 }}
      initial={{ opacity: 0, y: 10 }}
      animate={won ? { opacity: 1, y: [0, -12] } : { opacity: 1, y: 0, scaleY: [1, 0.98] }}
      transition={won ? { opacity: { duration: 0.3 }, y: { duration: 0.42, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' } } : { opacity: { duration: 0.3 }, y: { duration: 0.3 }, scaleY: { duration: 1.6, repeat: Infinity, repeatType: 'reverse' } }}
    />
  )
}
