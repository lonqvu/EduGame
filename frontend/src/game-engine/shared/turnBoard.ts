import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'

/**
 * Board games played in turns (Hái hoa dân chủ, Ngôi sao may mắn, Ô cửa bí mật, Vòng quay điểm thưởng): the team
 * whose turn it is opens a cell of the board (a flower, a star, a door...) and answers its question; another team may
 * steal it after a wrong answer. Done cells stay done; the game ends when every cell is done.
 */
export interface TurnBoardState {
  teams: TeamScore[]
  /** Index in `teams` of the team whose turn it is. */
  turn: number
  /** Cells already played. */
  done: boolean[]
  /** Cell being played, or null between turns. */
  current: number | null
  /** Points a right answer to the current cell earns (the wheel decides them in Vòng quay). */
  stake: number
  /** The current cell gave its points without a question (a lucky star). */
  lucky: boolean
  answeringTeamId: string | null
  /** Options already tried on the current question → whether they were right. */
  tried: Record<string, boolean>
  /** Teams that already answered the current question wrong. */
  triedTeams: string[]
  revealed: boolean
  finished: boolean
  /** The game ends by itself once every cell is done (Ô cửa bí mật waits for the guess instead). */
  autoFinish: boolean
}

export type TurnBoardAction =
  | { type: 'open'; cell: number; points: number; lucky?: boolean }
  | { type: 'pickTeam'; teamId: string }
  | { type: 'choose'; optionId: string; correctId: string; allowSteal: boolean }
  | { type: 'reveal' }
  | { type: 'award'; teamId: string; points: number }
  | { type: 'close' }
  | { type: 'skipTurn' }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number; cells: number; autoFinish?: boolean }

export const initialTurnBoard = ({
  teamCount,
  cells,
  autoFinish = true,
}: {
  teamCount: number
  cells: number
  autoFinish?: boolean
}): TurnBoardState => ({
  teams: freshTeams(teamCount),
  turn: 0,
  done: Array.from({ length: cells }, () => false),
  current: null,
  stake: 0,
  lucky: false,
  answeringTeamId: null,
  tried: {},
  triedTeams: [],
  revealed: false,
  finished: cells === 0,
  autoFinish,
})

/** The team whose turn it is. */
export const turnTeam = (state: TurnBoardState) => state.teams[state.turn % state.teams.length]

export function turnBoardReducer(state: TurnBoardState, action: TurnBoardAction): TurnBoardState {
  switch (action.type) {
    case 'open': {
      if (state.finished || state.current !== null || state.done[action.cell] !== false) return state
      const team = turnTeam(state)
      if (action.lucky) {
        // A lucky cell: the team gets the points at once, no question.
        return {
          ...state,
          current: action.cell,
          stake: action.points,
          lucky: true,
          teams: award(state.teams, team.id, action.points),
          answeringTeamId: null,
          tried: {},
          triedTeams: [],
          revealed: true,
        }
      }
      return {
        ...state,
        current: action.cell,
        stake: action.points,
        lucky: false,
        answeringTeamId: team.id,
        tried: {},
        triedTeams: [],
        revealed: false,
      }
    }

    case 'pickTeam':
      if (state.current === null || state.revealed || state.triedTeams.includes(action.teamId)) return state
      if (!state.teams.some((t) => t.id === action.teamId)) return state
      return { ...state, answeringTeamId: action.teamId }

    case 'choose': {
      const teamId = state.answeringTeamId
      if (state.current === null || !teamId || state.revealed || action.optionId in state.tried) return state
      if (action.optionId === action.correctId) {
        return {
          ...state,
          teams: award(state.teams, teamId, state.stake),
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
        revealed: !action.allowSteal || triedTeams.length >= state.teams.length,
      }
    }

    case 'reveal':
      if (state.current === null) return state
      return { ...state, revealed: true, answeringTeamId: null }

    case 'award':
      if (!state.teams.some((t) => t.id === action.teamId)) return state
      return { ...state, teams: award(state.teams, action.teamId, action.points) }

    case 'close': {
      if (state.current === null || !state.revealed) return state
      const done = state.done.map((d, i) => d || i === state.current)
      return {
        ...state,
        done,
        current: null,
        lucky: false,
        answeringTeamId: null,
        tried: {},
        triedTeams: [],
        revealed: false,
        turn: (state.turn + 1) % state.teams.length,
        finished: state.autoFinish && done.every(Boolean),
      }
    }

    case 'skipTurn':
      if (state.current !== null) return state
      return { ...state, turn: (state.turn + 1) % state.teams.length }

    case 'finish':
      return { ...state, finished: true }

    case 'restart':
      return initialTurnBoard({ teamCount: action.teamCount, cells: action.cells, autoFinish: action.autoFinish })
  }
}
