import { useReducer, useState } from 'react'
import { playableQuizQuestions } from '@/game-engine/quiz/quizRound'
import type { PlaySettings } from '@/game-engine/shared/gameSettings'
import { initialTurnQuiz, turnQuizReducer } from '@/game-engine/shared/turnQuiz'
import type { QuizQuestion } from '@/types/game'

/** A round of "answer to earn a move": the questions dealt, the question now, the round state and "Chơi lại". */
export function useTurnQuiz(questions: QuizQuestion[], rules: PlaySettings, teamCount = rules.teams) {
  const deal = () => playableQuizQuestions(questions, { shuffleItems: rules.shuffleItems, shuffleOptions: rules.shuffleOptions })
  const [playable, setPlayable] = useState(deal)
  const [round, setRound] = useState(0)
  const [state, dispatch] = useReducer(turnQuizReducer, teamCount, initialTurnQuiz)
  const restart = () => {
    dispatch({ type: 'restart', teamCount })
    setPlayable(deal())
    setRound((r) => r + 1)
  }
  const question = playable.length ? playable[state.asked % playable.length] : undefined
  return { playable, question, round, state, dispatch, restart }
}
