import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'

/**
 * "Answer to earn a move" (Cờ ca-rô, Bốn ô liên tiếp, Rương vàng): the teams take turns; the team whose turn it is
 * answers the next question once. Right, it earns a move on the board (a cell, a disc, a chest); wrong, the right
 * answer is shown and the turn passes. Questions are taken in order and start over when they run out.
 */
export interface TurnQuizState {
  teams: TeamScore[]
  /** Index in `teams` of the team whose turn it is. */
  turn: number
  /** How many questions were asked: the next one is `asked % questions`. */
  asked: number
  tried: Record<string, boolean>
  /** The question is over: answered (right or wrong) or shown. */
  revealed: boolean
  /** The team answered right and has its move to make. */
  earned: boolean
  finished: boolean
}

export type TurnQuizAction =
  | { type: 'choose'; optionId: string; correctId: string; points: number }
  | { type: 'reveal' }
  /** The move was made (or the turn is lost): next team, next question. */
  | { type: 'next' }
  | { type: 'award'; teamId: string; points: number }
  | { type: 'setScores'; scores: Record<string, number> }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number }

export const initialTurnQuiz = (teamCount: number): TurnQuizState => ({
  teams: freshTeams(teamCount),
  turn: 0,
  asked: 0,
  tried: {},
  revealed: false,
  earned: false,
  finished: false,
})

export const turnOf = (state: TurnQuizState) => state.teams[state.turn % state.teams.length]

export function turnQuizReducer(state: TurnQuizState, action: TurnQuizAction): TurnQuizState {
  switch (action.type) {
    case 'choose': {
      if (state.revealed || state.finished) return state
      const team = turnOf(state)
      const right = action.optionId === action.correctId
      return {
        ...state,
        teams: right ? award(state.teams, team.id, action.points) : miss(state.teams, team.id),
        tried: { [action.optionId]: right },
        revealed: true,
        earned: right,
      }
    }
    case 'reveal':
      return state.revealed ? state : { ...state, revealed: true, earned: false }
    case 'next':
      if (!state.revealed) return state
      return { ...state, turn: (state.turn + 1) % state.teams.length, asked: state.asked + 1, tried: {}, revealed: false, earned: false }
    case 'award':
      return { ...state, teams: award(state.teams, action.teamId, action.points) }
    case 'setScores':
      return { ...state, teams: state.teams.map((t) => (t.id in action.scores ? { ...t, score: Math.max(0, action.scores[t.id]) } : t)) }
    case 'finish':
      return { ...state, finished: true }
    case 'restart':
      return initialTurnQuiz(action.teamCount)
  }
}
