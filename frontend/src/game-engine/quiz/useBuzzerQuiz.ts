import { useReducer, useState } from 'react'
import { initialQuizRound, playableQuizQuestions, quizReducer } from '@/game-engine/quiz/quizRound'
import type { PlaySettings } from '@/game-engine/shared/gameSettings'
import type { QuizQuestion } from '@/types/game'

/**
 * A round of quiz questions with a buzzer (Trắc nghiệm rules) for the games that only draw it differently (Kéo co,
 * Leo núi, Đập chuột): the questions dealt for this round, the round state, and "Chơi lại", which deals again.
 */
export function useBuzzerQuiz(questions: QuizQuestion[], rules: PlaySettings, teamCount = rules.teams) {
  const deal = () => playableQuizQuestions(questions, { shuffleItems: rules.shuffleItems, shuffleOptions: rules.shuffleOptions })
  const [playable, setPlayable] = useState(deal)
  const [round, setRound] = useState(0)
  const [state, dispatch] = useReducer(quizReducer, teamCount, initialQuizRound)
  const restart = () => {
    dispatch({ type: 'restart', teamCount })
    setPlayable(deal())
    setRound((r) => r + 1)
  }
  return { playable, round, state, dispatch, restart }
}
