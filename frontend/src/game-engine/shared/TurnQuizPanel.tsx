import type { Dispatch, ReactNode } from 'react'
import type { PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { QuestionPanel } from '@/game-engine/shared/QuestionPanel'
import { turnOf, type TurnQuizAction, type TurnQuizState } from '@/game-engine/shared/turnQuiz'
import { useSound } from '@/sound/useSound'
import { streakRate } from '@/sound/streak'

interface TurnQuizPanelProps {
  state: TurnQuizState
  question: PlayableQuizQuestion
  points: number
  dispatch: Dispatch<TurnQuizAction>
  /** What the team does with a right answer: "chọn một ô", "chọn cột để thả quân"... */
  move: string
  /** The move was made (the turn can pass), or the game is over on the board. */
  moveDone: boolean
  /** Replaces the footer while the board shows its own end (a win, a draw). */
  footer?: ReactNode
}

/**
 * The question side of "answer to earn a move": whose turn it is, the question (one try), then what to do: make the
 * move on the board after a right answer, or let the turn pass after a wrong one.
 */
export function TurnQuizPanel({ state, question, points, dispatch, move, moveDone, footer }: TurnQuizPanelProps) {
  const sound = useSound()
  const team = turnOf(state)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <span className="flex items-center gap-2 text-xl font-extrabold">
        <span className="size-5 rounded-full" style={{ background: team.color }} />
        Lượt của {team.name}
      </span>
      <QuestionPanel
        question={question}
        tried={state.tried}
        revealed={state.revealed}
        canChoose={!state.revealed}
        layout="list"
        fontSize={34}
        onChoose={(optionId) => {
          if (optionId === question.correctId) sound.play('correct', { rate: streakRate(team.streak) })
          else sound.play('wrong')
          dispatch({ type: 'choose', optionId, correctId: question.correctId, points })
        }}
      />
      {footer ?? (
        <PlayFooter
          clearCorner={false}
          message={
            !state.revealed
              ? 'Chọn đáp án nào?'
              : state.earned
                ? moveDone
                  ? 'Hay lắm!'
                  : `Đúng rồi! ${team.name} ${move}.`
                : 'Chưa đúng, mất lượt.'
          }
          revealed={state.revealed}
          onReveal={() => dispatch({ type: 'reveal' })}
          onFinish={() => dispatch({ type: 'finish' })}
          onNext={() => {
            sound.play('whoosh')
            dispatch({ type: 'next' })
          }}
          nextDisabled={!state.revealed || (state.earned && !moveDone)}
          nextLabel="Lượt tiếp theo"
        />
      )}
    </div>
  )
}
