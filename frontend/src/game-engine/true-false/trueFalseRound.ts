import type { PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'

/** A statement to judge: the question and one answer, right or not. */
export interface Statement {
  id: string
  question: string
  imageUrl?: string
  /** The answer shown with the question; null when the question is already a statement (a true/false item). */
  answer: string | null
  truth: boolean
  /** The right answer, said when the statement is false. */
  rightAnswer: string
}

/**
 * Statements from quiz questions: a true/false item is judged as it is; a choice question shows its right answer
 * half of the time, else one of its wrong answers.
 */
export function statementsOf(questions: PlayableQuizQuestion[], random: () => number = Math.random): Statement[] {
  return questions.map((q) => {
    const right = q.options.find((o) => o.id === q.correctId)!
    if (q.trueFalse) {
      return { id: q.id, question: q.text, imageUrl: q.imageUrl, answer: null, truth: q.options[0].id === q.correctId, rightAnswer: right.text }
    }
    const wrong = q.options.filter((o) => o.id !== q.correctId)
    const truth = random() < 0.5
    const shown = truth ? right : wrong[Math.floor(random() * wrong.length)]
    return { id: q.id, question: q.text, imageUrl: q.imageUrl, answer: shown.text, truth, rightAnswer: right.text }
  })
}

export interface TrueFalseState {
  index: number
  teams: TeamScore[]
  /** What each team says about the statement. */
  votes: Record<string, boolean>
  revealed: boolean
  finished: boolean
}

export type TrueFalseAction =
  | { type: 'vote'; teamId: string; value: boolean }
  | { type: 'reveal'; truth: boolean; points: number }
  | { type: 'next'; total: number }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number }

export const initialTrueFalse = (teamCount: number): TrueFalseState => ({
  index: 0,
  teams: freshTeams(teamCount),
  votes: {},
  revealed: false,
  finished: false,
})

export function trueFalseReducer(state: TrueFalseState, action: TrueFalseAction): TrueFalseState {
  switch (action.type) {
    case 'vote':
      if (state.revealed || !state.teams.some((t) => t.id === action.teamId)) return state
      return { ...state, votes: { ...state.votes, [action.teamId]: action.value } }
    case 'reveal': {
      if (state.revealed) return state
      // Every team that said it right scores; a team that said nothing or said it wrong does not.
      const teams = state.teams.reduce(
        (all, t) => (state.votes[t.id] === action.truth ? award(all, t.id, action.points) : miss(all, t.id)),
        state.teams,
      )
      return { ...state, teams, revealed: true }
    }
    case 'next':
      if (!state.revealed) return state
      if (state.index + 1 >= action.total) return { ...state, finished: true }
      return { ...state, index: state.index + 1, votes: {}, revealed: false }
    case 'finish':
      return { ...state, finished: true }
    case 'restart':
      return initialTrueFalse(action.teamCount)
  }
}
