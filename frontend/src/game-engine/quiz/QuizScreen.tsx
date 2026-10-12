import { useReducer, useState } from 'react'
import { ChevronRightIcon, EyeIcon } from '@/components/ui/icons'
import { Countdown, QuizOption } from '@/game-engine/quiz/QuizParts'
import { initialQuizRound, playableQuizQuestions, questionFontSize, quizReducer } from '@/game-engine/quiz/quizRound'
import { readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'

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
          style={{ fontSize: questionFontSize(question.text) }}
        >
          {question.text}
        </span>
      </div>

      <div className={`grid gap-3.5 ${question.options.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {question.options.map((option, i) => {
          const tried = state.tried[option.id]
          const isCorrect = option.id === question.correctId
          return (
            <QuizOption
              key={option.id}
              option={option}
              index={i}
              trueFalse={question.trueFalse}
              look={state.revealed && isCorrect ? 'right' : tried === false ? 'wrong' : state.revealed ? 'dim' : 'idle'}
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
