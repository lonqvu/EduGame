import { useReducer, useState } from 'react'
import { playableQuizQuestions, type PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import type { PlaySettings } from '@/game-engine/shared/gameSettings'
import { initialTurnBoard, turnBoardReducer } from '@/game-engine/shared/turnBoard'
import type { QuizQuestion } from '@/types/game'

/**
 * A round of a turn board: the questions dealt, the board made from them (`layout`, e.g. where the lucky stars are),
 * the round state, and "Chơi lại", which deals and lays out again.
 */
export function useTurnBoard<Layout>(
  questions: QuizQuestion[],
  rules: PlaySettings,
  lay: (playable: PlayableQuizQuestion[]) => { layout: Layout; cells: number },
  { autoFinish = true } = {},
) {
  const deal = () => {
    const playable = playableQuizQuestions(questions, { shuffleItems: rules.shuffleItems, shuffleOptions: rules.shuffleOptions })
    return { playable, ...lay(playable) }
  }
  const [board, setBoard] = useState(deal)
  const [round, setRound] = useState(0)
  const [state, dispatch] = useReducer(turnBoardReducer, { teamCount: rules.teams, cells: board.cells, autoFinish }, initialTurnBoard)
  const restart = () => {
    const next = deal()
    setBoard(next)
    dispatch({ type: 'restart', teamCount: rules.teams, cells: next.cells, autoFinish })
    setRound((r) => r + 1)
  }
  return { ...board, round, state, dispatch, restart }
}
