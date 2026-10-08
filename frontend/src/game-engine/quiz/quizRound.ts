import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'
import { shuffle } from '@/game-engine/shared/shuffle'
import type { ChoiceOption, QuizQuestion } from '@/types/game'

/** A question as played: only filled-in options, maybe shuffled, and a right option that is one of them. */
export interface PlayableQuizQuestion {
  id: string
  trueFalse: boolean
  text: string
  imageUrl?: string
  options: ChoiceOption[]
  correctId: string
}

/**
 * Questions the projector can ask: a text, at least two filled-in options and a right option among them.
 * Half-written questions in the editor are skipped.
 */
export function playableQuizQuestions(
  questions: QuizQuestion[],
  { shuffleItems = false, shuffleOptions = true, random = Math.random } = {},
): PlayableQuizQuestion[] {
  const ready = questions.flatMap((q) => {
    const { correctId } = q
    const options = q.options.filter((o) => o.text.trim())
    if (!q.text.trim() || options.length < 2 || !correctId || !options.some((o) => o.id === correctId)) return []
    // True / false keeps "Đúng" before "Sai".
    const ordered = shuffleOptions && !q.trueFalse ? shuffle(options, random) : options
    return [{ id: q.id, trueFalse: q.trueFalse, text: q.text.trim(), imageUrl: q.imageUrl, options: ordered, correctId }]
  })
  return shuffleItems ? shuffle(ready, random) : ready
}

export interface QuizRoundState {
  index: number
  teams: TeamScore[]
  /** Team that won the buzzer and is answering now. */
  answeringTeamId: string | null
  /** Options already tried on this question → whether they were right. */
  tried: Record<string, boolean>
  /** Teams that already answered this question wrong (they cannot try again). */
  triedTeams: string[]
  /** The right option is shown (answered right, nobody left to try, or the teacher revealed it). */
  revealed: boolean
  finished: boolean
}

export type QuizAction =
  | { type: 'pickTeam'; teamId: string }
  | { type: 'choose'; optionId: string; correctId: string; points: number; allowSteal: boolean }
  | { type: 'reveal' }
  | { type: 'next'; total: number }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number }

export const initialQuizRound = (teamCount: number): QuizRoundState => ({
  index: 0,
  teams: freshTeams(teamCount),
  answeringTeamId: null,
  tried: {},
  triedTeams: [],
  revealed: false,
  finished: false,
})

export function quizReducer(state: QuizRoundState, action: QuizAction): QuizRoundState {
  switch (action.type) {
    case 'pickTeam':
      if (state.revealed || state.triedTeams.includes(action.teamId)) return state
      if (!state.teams.some((t) => t.id === action.teamId)) return state
      return { ...state, answeringTeamId: action.teamId }

    case 'choose': {
      const teamId = state.answeringTeamId
      if (!teamId || state.revealed || action.optionId in state.tried) return state
      if (action.optionId === action.correctId) {
        return {
          ...state,
          teams: award(state.teams, teamId, action.points),
          tried: { ...state.tried, [action.optionId]: true },
          answeringTeamId: null,
          revealed: true,
        }
      }
      const triedTeams = [...state.triedTeams, teamId]
      return {
        ...state,
        teams: miss(state.teams, teamId),
        tried: { ...state.tried, [action.optionId]: false },
        triedTeams,
        answeringTeamId: null,
        // Another team may steal the question while some team has not tried yet.
        revealed: !action.allowSteal || triedTeams.length >= state.teams.length,
      }
    }

    case 'reveal':
      return { ...state, revealed: true, answeringTeamId: null }

    case 'next':
      if (state.index + 1 >= action.total) return { ...state, finished: true }
      return { ...state, index: state.index + 1, answeringTeamId: null, tried: {}, triedTeams: [], revealed: false }

    case 'finish':
      return { ...state, finished: true }

    case 'restart':
      return initialQuizRound(action.teamCount)
  }
}
