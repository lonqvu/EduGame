import { motion } from 'motion/react'
import { useState } from 'react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { questionFontSize } from '@/game-engine/quiz/quizRound'
import { useBuzzerQuiz } from '@/game-engine/quiz/useBuzzerQuiz'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { assetSrc } from '@/utils/images'
import { useSound } from '@/sound/useSound'
import { streakRate } from '@/sound/streak'

const MEADOW_WIDTH = 1208
const MEADOW_HEIGHT = 290
const PETALS = ['#FF8FB1', '#FFB547', '#B98CFF', '#5EC2FF', '#FF7A6B', '#7AD48A']
const LETTERS = 'ABCDEF'
/** Where the bee waits between two flights. */
const HOME = { x: MEADOW_WIDTH / 2, y: 40 }

interface BeeFlowerScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Ong tìm hoa": the options grow on flowers in a meadow. A team wins the buzzer and says which flower;
 * the bee flies there: the right flower gives honey (points), a wrong one leaves the bee dizzy.
 */
export function BeeFlowerScreen({ game, questions, settings }: BeeFlowerScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.BEE_FLOWER)
  const { playable, round, state, dispatch, restart } = useBuzzerQuiz(questions, rules)
  /** Flower the bee flew to on this question, by option id. */
  const [target, setTarget] = useState<{ index: number; optionId: string } | null>(null)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (playable.length === 0) return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Lấy nhiều mật nhất" />

  const question = playable[state.index]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const isLast = state.index === playable.length - 1
  const count = question.options.length
  const spot = (i: number) => ({ x: (MEADOW_WIDTH / count) * (i + 0.5), y: MEADOW_HEIGHT - 120 })
  const flewTo = target && target.index === state.index ? question.options.findIndex((o) => o.id === target.optionId) : -1
  const bee = flewTo >= 0 ? { x: spot(flewTo).x, y: spot(flewTo).y - 90 } : HOME
  const honey = flewTo >= 0 && question.options[flewTo].id === question.correctId
  // The bee is on its way: the answer is judged when it lands.
  const flying = flewTo >= 0 && !(question.options[flewTo].id in state.tried)

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.index + 1} / ${playable.length}`}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <div className="flex min-h-[80px] items-center gap-5 rounded-[28px] bg-white px-7 py-3">
        {question.imageUrl && <img src={assetSrc(question.imageUrl)} alt="" className="h-[70px] w-[96px] shrink-0 rounded-2xl object-cover" />}
        <span className="font-display leading-[1.1] font-extrabold" style={{ fontSize: questionFontSize(question.text, 38) }}>
          {question.text}
        </span>
      </div>

      <div className="relative shrink-0 overflow-hidden rounded-[28px] bg-[linear-gradient(#DDF3FF,#EFFAEA)]" style={{ width: MEADOW_WIDTH, height: MEADOW_HEIGHT }}>
        <div className="absolute inset-x-0 bottom-0 h-[70px] bg-[#9ED37E]" />
        {question.options.map((option, i) => {
          const tried = state.tried[option.id]
          const right = option.id === question.correctId
          const look = state.revealed && right ? 'right' : tried === false ? 'wrong' : state.revealed ? 'dim' : 'idle'
          const { x } = spot(i)
          return (
            <button
              key={`${state.index}-${option.id}`}
              type="button"
              disabled={!answering || state.revealed || tried !== undefined || flying}
              onClick={() => {
                setTarget({ index: state.index, optionId: option.id })
                sound.play('whoosh')
                const correct = option.id === question.correctId
                setTimeout(() => {
                  if (correct) sound.play('correct', { rate: streakRate(answering?.streak ?? 0) })
                  else sound.play('wrong')
                  dispatch({ type: 'choose', optionId: option.id, correctId: question.correctId, points: rules.points, allowSteal: rules.allowSteal })
                }, 650)
              }}
              aria-label={`${LETTERS[i]}. ${option.text}`}
              className={`absolute bottom-3 flex cursor-pointer flex-col items-center border-0 bg-transparent p-0 font-[inherit] disabled:cursor-default ${look === 'dim' ? 'opacity-45' : ''}`}
              style={{ left: x - 95, width: 190 }}
            >
              <motion.span animate={look === 'wrong' ? { rotate: [0, -8, 8, 0] } : look === 'right' ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 0.6 }}>
                <Flower color={look === 'wrong' ? '#C9CED8' : PETALS[i % PETALS.length]} />
              </motion.span>
              <span className="h-[46px] w-[6px] rounded bg-[#4E9A4A]" aria-hidden="true" />
              <span
                className={`max-w-[186px] truncate rounded-2xl border-[3px] px-3 py-1 font-display text-[22px] font-extrabold ${
                  look === 'right' ? 'border-success bg-[#E3F6EC]' : look === 'wrong' ? 'border-danger bg-[#FBE6E1]' : 'border-white bg-white'
                }`}
              >
                <span className="mr-1 text-primary-ink">{LETTERS[i]}.</span>
                {option.text}
              </span>
            </button>
          )
        })}
        <motion.div
          className="pointer-events-none absolute"
          initial={false}
          animate={{ x: bee.x - 40, y: bee.y - 30, rotate: flewTo >= 0 && !honey && state.tried[question.options[flewTo].id] === false ? [0, 360] : 0 }}
          transition={{ x: { type: 'spring', bounce: 0.25, duration: 0.7 }, y: { type: 'spring', bounce: 0.25, duration: 0.7 }, rotate: { duration: 0.8 } }}
          style={{ left: 0, top: 0 }}
          aria-hidden="true"
        >
          <Bee />
          {honey && state.revealed && <span className="absolute -top-2 -right-6 text-[34px]">🍯</span>}
        </motion.div>
      </div>

      <TeamBar
        teams={state.teams}
        activeId={state.answeringTeamId}
        activeLabel="Đang trả lời"
        disabledIds={state.revealed ? state.teams.map((t) => t.id) : state.triedTeams}
        onPick={(teamId) => {
          setTarget(null)
          dispatch({ type: 'pickTeam', teamId })
        }}
      />
      <PlayFooter
        message={
          state.revealed
            ? honey
              ? 'Chú ong lấy được mật rồi!'
              : 'Đáp án đúng đã hiện.'
            : answering
              ? `${answering.name} chỉ đường cho ong bay đến bông hoa nào?`
              : 'Đội nào giành quyền? Cô bấm tên đội.'
        }
        revealed={state.revealed}
        onReveal={() => dispatch({ type: 'reveal' })}
        onFinish={() => dispatch({ type: 'finish' })}
        onNext={() => {
          setTarget(null)
          dispatch({ type: 'next', total: playable.length })
        }}
        nextLabel={isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
      />
    </PlayFrame>
  )
}

function Flower({ color }: { color: string }) {
  return (
    <svg width={96} height={96} viewBox="0 0 80 80" aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse key={deg} cx={40} cy={18} rx={13} ry={18} fill={color} transform={`rotate(${deg} 40 40)`} />
      ))}
      <circle cx={40} cy={40} r={15} fill="#FFE27A" stroke="#F2B705" strokeWidth={3} />
    </svg>
  )
}

function Bee() {
  return (
    <svg width={84} height={66} viewBox="0 0 84 66" aria-hidden="true">
      <ellipse cx="34" cy="14" rx="16" ry="11" fill="#E8F6FF" stroke="#9FD4F5" strokeWidth="2" opacity="0.9" />
      <ellipse cx="52" cy="12" rx="15" ry="10" fill="#E8F6FF" stroke="#9FD4F5" strokeWidth="2" opacity="0.9" />
      <ellipse cx="42" cy="40" rx="30" ry="22" fill="#FFD43B" />
      <path d="M30 20 Q26 40 30 60 M44 18 Q40 40 44 62" stroke="#3F2A1E" strokeWidth="7" fill="none" />
      <circle cx="66" cy="34" r="14" fill="#FFD43B" />
      <circle cx="70" cy="31" r="3.5" fill="#1F2A44" />
      <path d="M64 41 q5 4 10 0" stroke="#1F2A44" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M12 40 l-10 4 l10 4 z" fill="#3F2A1E" />
    </svg>
  )
}
