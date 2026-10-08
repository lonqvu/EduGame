import { motion } from 'motion/react'
import { useEffect, useReducer, useState } from 'react'
import { CheckIcon, ChevronRightIcon, CloseIcon, EyeIcon } from '@/components/ui/icons'
import { initialQuizRound, playableQuizQuestions, quizReducer } from '@/game-engine/quiz/quizRound'
import { readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'

const OPTION_COLORS = ['#3563E9', '#F28C28', '#2E9E6A', '#8B5CF6', '#E5484D', '#0E9AA7']
const LETTERS = 'ABCDEF'

interface QuizScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector: one question at a time. A team wins the buzzer (the teacher taps it), then the teacher taps the option
 * the team said. Right → points; wrong → another team may steal while some have not tried.
 */
export function QuizScreen({ game, questions, settings }: QuizScreenProps) {
  const rules = readPlaySettings(settings, { teams: 4, points: 10, allowSteal: true, timeLimitSec: 30 })
  const deal = () => playableQuizQuestions(questions, { shuffleItems: rules.shuffleItems, shuffleOptions: rules.shuffleOptions })
  // Shuffled once per round: "Chơi lại" deals again.
  const [playable, setPlayable] = useState(deal)
  const [round, setRound] = useState(0)
  const [state, dispatch] = useReducer(quizReducer, rules.teams, initialQuizRound)
  const backTo = editPath(game.id)

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }

  const restart = () => {
    dispatch({ type: 'restart', teamCount: rules.teams })
    setPlayable(deal())
    setRound((r) => r + 1)
  }

  if (state.finished) {
    return <TeamResults teams={state.teams} onPlayAgain={restart} />
  }

  const question = playable[state.index]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const isLast = state.index === playable.length - 1

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.index + 1} / ${playable.length}`}
      extra={
        rules.timeLimitSec > 0 && (
          <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />
        )
      }
      backTo={backTo}
    >
      <TeamBar
        teams={state.teams}
        activeId={state.answeringTeamId}
        activeLabel="Đang trả lời"
        onPick={state.revealed ? undefined : (teamId) => dispatch({ type: 'pickTeam', teamId })}
        disabledIds={state.revealed ? [] : state.triedTeams}
      />

      <div className="flex min-h-0 flex-1 items-center gap-8 rounded-[32px] bg-white px-9 py-5">
        {question.imageUrl && (
          <img src={question.imageUrl} alt="" className="h-[200px] w-[260px] shrink-0 rounded-3xl object-cover" />
        )}
        <span
          className="font-display leading-[1.1] font-extrabold"
          style={{ fontSize: question.text.length > 90 ? 36 : question.text.length > 50 ? 46 : 56 }}
        >
          {question.text}
        </span>
      </div>

      <div className={`grid gap-3.5 ${question.options.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {question.options.map((option, i) => {
          const tried = state.tried[option.id]
          const isCorrect = option.id === question.correctId
          const showRight = state.revealed && isCorrect
          const showWrong = tried === false
          const color = question.trueFalse ? (i === 0 ? '#2E9E6A' : '#E5484D') : OPTION_COLORS[i % OPTION_COLORS.length]
          return (
            <motion.button
              key={option.id}
              type="button"
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
              animate={showWrong ? { x: [0, -10, 10, -6, 6, 0] } : showRight ? { scale: [1, 1.04, 1] } : {}}
              transition={{ duration: 0.45 }}
              className={`flex min-h-[76px] cursor-pointer items-center gap-4 rounded-3xl border-4 px-5 py-2 text-left font-[inherit] text-ink disabled:cursor-default ${
                showRight ? 'border-success bg-[#E3F6EC]' : showWrong ? 'border-danger bg-[#FBE6E1] opacity-70' : 'border-white bg-white'
              } ${state.revealed && !isCorrect ? 'opacity-50' : ''}`}
            >
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl font-display text-[26px] font-extrabold text-white"
                style={{ background: showRight ? '#1B7A50' : showWrong ? '#A3361A' : color }}
              >
                {showRight ? <CheckIcon size={28} /> : showWrong ? <CloseIcon size={26} /> : LETTERS[i]}
              </span>
              <span className={`font-display font-extrabold ${option.text.length > 30 ? 'text-[24px]' : 'text-[30px]'}`}>
                {option.text}
              </span>
            </motion.button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-lg font-extrabold text-ink-soft">
          {state.revealed
            ? 'Đáp án đúng đã hiện.'
            : answering
              ? `${answering.name} chọn đáp án nào? Cô bấm vào đáp án đội nói.`
              : 'Đội nào giành được quyền trả lời? Cô bấm vào tên đội.'}
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
            onClick={() => dispatch({ type: 'next', total: playable.length })}
            className={`${playButtonClass} bg-primary text-white hover:brightness-110`}
          >
            {isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </div>
    </PlayFrame>
  )
}

/** Seconds left to answer; "Hết giờ!" at zero (answers are still accepted). */
function Countdown({ seconds, paused }: { seconds: number; paused: boolean }) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (paused || left <= 0) return
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [left, paused])

  const urgent = left <= 5
  return (
    <span
      role="timer"
      aria-live="off"
      className={`rounded-full px-4 py-1.5 text-lg font-extrabold tabular-nums ${
        left === 0 ? 'bg-danger text-white' : urgent ? 'bg-sun text-ink' : 'bg-white text-ink'
      }`}
    >
      {left === 0 ? 'Hết giờ!' : `⏱ ${left}s`}
    </span>
  )
}
