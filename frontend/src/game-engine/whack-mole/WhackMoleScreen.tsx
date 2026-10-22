import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { questionFontSize } from '@/game-engine/quiz/quizRound'
import { useBuzzerQuiz } from '@/game-engine/quiz/useBuzzerQuiz'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { ChoiceOption, GameSummary, QuizQuestion } from '@/types/game'
import { assetSrc } from '@/utils/images'
import { useSound } from '@/sound/useSound'
import { streakRate } from '@/sound/streak'

const LETTERS = 'ABCDEF'
/** How long a mole stays down between two peeks, while nobody answers. */
const PEEK_MS = 1400

interface WhackMoleScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Đập chuột": the options ride on moles that peek out of their holes. A team wins the buzzer (every
 * mole then comes up and waits), says which mole holds the right answer, and the teacher whacks it.
 */
export function WhackMoleScreen({ game, questions, settings }: WhackMoleScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.WHACK_MOLE)
  const { playable, round, state, dispatch, restart } = useBuzzerQuiz(questions, rules)
  const sound = useSound()
  const backTo = editPath(game.id)
  // Moles bob up and down until a team answers: a tick moves them.
  const [tick, setTick] = useState(0)
  const calm = !!state.answeringTeamId || state.revealed
  useEffect(() => {
    if (calm) return
    const timer = setInterval(() => setTick((t) => t + 1), PEEK_MS)
    return () => clearInterval(timer)
  }, [calm])

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Đập trúng nhiều nhất" />

  const question = playable[state.index]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const isLast = state.index === playable.length - 1

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.index + 1} / ${playable.length}`}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <div className="flex min-h-[84px] items-center gap-5 rounded-[28px] bg-white px-7 py-3">
        {question.imageUrl && <img src={assetSrc(question.imageUrl)} alt="" className="h-[72px] w-[100px] shrink-0 rounded-2xl object-cover" />}
        <span className="font-display leading-[1.1] font-extrabold" style={{ fontSize: questionFontSize(question.text, 38) }}>
          {question.text}
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[28px] bg-[linear-gradient(#9ED37E,#7DBF5E)] px-6">
        <div className={`grid w-full gap-x-6 gap-y-2 ${question.options.length > 4 ? 'grid-cols-3' : question.options.length > 2 ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {question.options.map((option, i) => {
            const result = state.tried[option.id]
            const right = option.id === question.correctId
            // Without an answering team, about half the moles are up at any time, a different half each tick.
            const up = calm || result !== undefined || (tick + i * 7 + state.index) % 3 !== 0
            return (
              <Hole
                key={`${state.index}-${option.id}`}
                option={option}
                letter={LETTERS[i]}
                up={up}
                look={state.revealed && right ? 'right' : result === false ? 'wrong' : state.revealed ? 'dim' : 'idle'}
                disabled={!answering || state.revealed || result !== undefined}
                onWhack={() => {
                  if (right) sound.play('correct', { rate: streakRate(answering?.streak ?? 0) })
                  else sound.play('wrong')
                  dispatch({ type: 'choose', optionId: option.id, correctId: question.correctId, points: rules.points, allowSteal: rules.allowSteal })
                }}
              />
            )
          })}
        </div>
      </div>

      <TeamBar
        teams={state.teams}
        activeId={state.answeringTeamId}
        activeLabel="Đang trả lời"
        disabledIds={state.revealed ? state.teams.map((t) => t.id) : state.triedTeams}
        onPick={(teamId) => dispatch({ type: 'pickTeam', teamId })}
      />
      <PlayFooter
        message={
          state.revealed
            ? 'Đáp án đúng đã hiện.'
            : answering
              ? `${answering.name} đập chú chuột nào? Cô bấm vào chú chuột đội chọn.`
              : 'Đội nào giành quyền? Cô bấm tên đội.'
        }
        revealed={state.revealed}
        onReveal={() => dispatch({ type: 'reveal' })}
        onFinish={() => dispatch({ type: 'finish' })}
        onNext={() => dispatch({ type: 'next', total: playable.length })}
        nextLabel={isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
      />
    </PlayFrame>
  )
}

interface HoleProps {
  option: ChoiceOption
  letter: string
  up: boolean
  look: 'idle' | 'right' | 'wrong' | 'dim'
  disabled: boolean
  onWhack: () => void
}

/** A hole with its mole, holding an answer on a sign; whacked, it shows a star (right) or spins dizzy (wrong). */
function Hole({ option, letter, up, look, disabled, onWhack }: HoleProps) {
  const [hit, setHit] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setHit(true)
        setTimeout(() => setHit(false), 260)
        onWhack()
      }}
      aria-label={`${letter}. ${option.text}`}
      className={`relative flex h-[150px] cursor-pointer flex-col items-center justify-end border-0 bg-transparent p-0 font-[inherit] disabled:cursor-default ${
        look === 'dim' ? 'opacity-50' : ''
      }`}
    >
      <div className="relative h-[130px] w-full overflow-hidden">
        <motion.div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center"
          initial={false}
          animate={{ y: up ? 0 : 120, rotate: look === 'wrong' ? [0, -12, 12, -8, 8, 0] : 0, scaleY: hit ? 0.8 : 1 }}
          transition={{ y: { type: 'spring', bounce: 0.35, duration: 0.5 }, rotate: { duration: 0.6 }, scaleY: { duration: 0.12 } }}
        >
          <span
            className={`mb-[-6px] max-w-[230px] truncate rounded-xl border-[3px] px-3 py-1 font-display text-[22px] font-extrabold ${
              look === 'right' ? 'border-success bg-[#E3F6EC]' : look === 'wrong' ? 'border-danger bg-[#FBE6E1]' : 'border-white bg-white'
            }`}
          >
            <span className="mr-1.5 text-primary-ink">{letter}.</span>
            {option.text}
          </span>
          <Mole />
        </motion.div>
        <AnimatePresence>
          {look === 'right' && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-1 right-6 text-[34px]"
              aria-hidden="true"
            >
              ⭐
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span className="h-[22px] w-[78%] rounded-[50%] bg-[#4E3524]" />
    </button>
  )
}

function Mole() {
  return (
    <svg width={96} height={78} viewBox="0 0 96 78" aria-hidden="true">
      <ellipse cx="48" cy="58" rx="40" ry="34" fill="#8B5E3C" />
      <ellipse cx="48" cy="62" rx="24" ry="20" fill="#C79A72" />
      <circle cx="34" cy="40" r="6" fill="#1F2A44" />
      <circle cx="62" cy="40" r="6" fill="#1F2A44" />
      <circle cx="36" cy="38" r="2" fill="#FFFFFF" />
      <circle cx="64" cy="38" r="2" fill="#FFFFFF" />
      <ellipse cx="48" cy="52" rx="9" ry="6" fill="#F28CA0" />
      <path d="M42 60 h12" stroke="#5A3A22" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
