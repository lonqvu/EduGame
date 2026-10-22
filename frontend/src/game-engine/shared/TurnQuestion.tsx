import type { Dispatch } from 'react'
import type { PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import type { PlaySettings } from '@/game-engine/shared/gameSettings'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { QuestionPanel } from '@/game-engine/shared/QuestionPanel'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import type { TurnBoardAction, TurnBoardState } from '@/game-engine/shared/turnBoard'
import { useSound } from '@/sound/useSound'
import { streakRate } from '@/sound/streak'

interface TurnQuestionProps {
  state: TurnBoardState
  question: PlayableQuizQuestion
  rules: PlaySettings
  dispatch: Dispatch<TurnBoardAction>
  /** "Câu hỏi bông hoa số 3 – 10 điểm" */
  heading: string
  /** "Quay lại cây hoa" */
  closeLabel: string
  layout?: 'grid' | 'list'
}

/**
 * The question behind a cell of a turn board: the team whose turn it is answers; after a wrong answer another team
 * may steal it (the teacher taps it), when the rules allow it. "Tiếp tục" goes back to the board.
 */
export function TurnQuestion({ state, question, rules, dispatch, heading, closeLabel, layout = 'grid' }: TurnQuestionProps) {
  const sound = useSound()
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const stealing = !state.revealed && !answering
  return (
    <>
      <span className="-mb-1 text-lg font-extrabold text-primary-ink">{heading}</span>
      <QuestionPanel
        question={question}
        tried={state.tried}
        revealed={state.revealed}
        canChoose={!!answering}
        layout={layout}
        fontSize={38}
        onChoose={(optionId) => {
          if (optionId === question.correctId) sound.play('correct', { rate: streakRate(answering?.streak ?? 0) })
          else sound.play('wrong')
          dispatch({ type: 'choose', optionId, correctId: question.correctId, allowSteal: rules.allowSteal })
        }}
      />
      <TeamBar
        teams={state.teams}
        activeId={state.answeringTeamId}
        activeLabel="Đang trả lời"
        disabledIds={state.triedTeams}
        onPick={stealing ? (teamId) => dispatch({ type: 'pickTeam', teamId }) : undefined}
      />
      <PlayFooter
        message={
          state.revealed
            ? 'Đáp án đúng đã hiện.'
            : answering
              ? `${answering.name} chọn đáp án nào? Cô bấm vào đáp án đội nói.`
              : 'Đội nào giành quyền trả lời? Cô bấm tên đội.'
        }
        revealed={state.revealed}
        onReveal={() => dispatch({ type: 'reveal' })}
        onFinish={() => dispatch({ type: 'finish' })}
        onNext={() => {
          sound.play('whoosh')
          dispatch({ type: 'close' })
        }}
        nextLabel={closeLabel}
      />
    </>
  )
}
