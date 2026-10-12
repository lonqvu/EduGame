import { answerLetters, isPlayableRow } from '@/game-engine/crossword/letters'
import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'
import type { CrosswordRow } from '@/types/game'

/** A row as played: its letters on the board and where its key letter is. */
export interface PlayableRow {
  id: string
  clue: string
  letters: string[]
  keyIndex: number
}

/** Rows with a clue, an answer and a key letter inside it; others are left out. */
export function playableRows(rows: CrosswordRow[]): PlayableRow[] {
  return rows.flatMap((row) =>
    isPlayableRow(row) ? [{ id: row.id, clue: row.clue.trim(), letters: answerLetters(row.answer), keyIndex: row.keyIndex }] : [],
  )
}

/** Board size: columns left of the keyword column, and right of it, so every row lines up on its key letter. */
export function boardShape(rows: PlayableRow[]) {
  const left = Math.max(0, ...rows.map((r) => r.keyIndex))
  const right = Math.max(0, ...rows.map((r) => r.letters.length - r.keyIndex - 1))
  return { left, right, columns: left + 1 + right }
}

/** Solved by a team (its letters show in the team color) or closed (nobody found it: letters shown in grey). */
export type RowResult = { status: 'solved'; teamId: string } | { status: 'closed' }

export interface CrosswordState {
  teams: TeamScore[]
  /** Team whose turn it is to pick a row. */
  turn: number
  results: Record<number, RowResult>
  /** Row being answered, and by which team. */
  current: number | null
  answeringTeamId: string | null
  /** Teams that already answered the current row wrong. */
  triedTeams: string[]
  /** A team is guessing the keyword now. */
  guessing: boolean
  guessTeamId: string | null
  /** Teams that guessed the keyword wrong (they cannot guess it again). */
  keywordOut: string[]
  keywordBy: string | null
  finished: boolean
}

export type CrosswordAction =
  | { type: 'openRow'; row: number }
  /** The teacher marks the answer of the team answering the current row. */
  | { type: 'markRow'; correct: boolean; points: number; allowSteal: boolean }
  | { type: 'closeRow' }
  | { type: 'startGuess' }
  | { type: 'pickGuessTeam'; teamId: string }
  | { type: 'markGuess'; correct: boolean; points: number }
  | { type: 'cancelGuess' }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number }

export const initialCrossword = (teamCount: number): CrosswordState => ({
  teams: freshTeams(teamCount),
  turn: 0,
  results: {},
  current: null,
  answeringTeamId: null,
  triedTeams: [],
  guessing: false,
  guessTeamId: null,
  keywordOut: [],
  keywordBy: null,
  finished: false,
})

/** Rows nobody has opened yet. */
export const rowsLeft = (state: CrosswordState, total: number) => total - Object.keys(state.results).length

/** Points for the keyword: the base, plus 10 for every row still hidden (guessing early is worth more). */
export const keywordValue = (base: number, hiddenRows: number) => base + 10 * hiddenRows

/** The row is done: the next team in turn picks next. */
const rowDone = (state: CrosswordState, results: CrosswordState['results'], teams = state.teams): CrosswordState => ({
  ...state,
  teams,
  results,
  current: null,
  answeringTeamId: null,
  triedTeams: [],
  turn: (state.turn + 1) % state.teams.length,
})

export function crosswordReducer(state: CrosswordState, action: CrosswordAction): CrosswordState {
  if (state.finished && action.type !== 'restart') return state
  switch (action.type) {
    case 'openRow':
      if (state.keywordBy || state.guessing || state.current !== null || action.row in state.results) return state
      return { ...state, current: action.row, answeringTeamId: state.teams[state.turn].id, triedTeams: [] }

    case 'markRow': {
      const { current, answeringTeamId: teamId } = state
      if (current === null || !teamId) return state
      if (action.correct) {
        return rowDone(state, { ...state.results, [current]: { status: 'solved', teamId } }, award(state.teams, teamId, action.points))
      }
      const teams = miss(state.teams, teamId)
      const triedTeams = [...state.triedTeams, teamId]
      // The others may steal, in turn order after the team that missed.
      const start = state.teams.findIndex((t) => t.id === teamId)
      const next = action.allowSteal
        ? state.teams.map((_, i) => state.teams[(start + 1 + i) % state.teams.length]).find((t) => !triedTeams.includes(t.id))
        : undefined
      if (!next) return rowDone(state, { ...state.results, [current]: { status: 'closed' } }, teams)
      return { ...state, teams, triedTeams, answeringTeamId: next.id }
    }

    case 'closeRow':
      if (state.current === null) return state
      return rowDone(state, { ...state.results, [state.current]: { status: 'closed' } })

    case 'startGuess':
      if (state.keywordBy || state.current !== null) return state
      return { ...state, guessing: true, guessTeamId: null }

    case 'pickGuessTeam':
      if (!state.guessing || state.keywordOut.includes(action.teamId) || !state.teams.some((t) => t.id === action.teamId)) {
        return state
      }
      return { ...state, guessTeamId: action.teamId }

    case 'markGuess': {
      const teamId = state.guessTeamId
      if (!state.guessing || !teamId) return state
      if (action.correct) {
        return { ...state, teams: award(state.teams, teamId, action.points), keywordBy: teamId, guessing: false, guessTeamId: null }
      }
      return { ...state, teams: miss(state.teams, teamId), keywordOut: [...state.keywordOut, teamId], guessing: false, guessTeamId: null }
    }

    case 'cancelGuess':
      return { ...state, guessing: false, guessTeamId: null }

    case 'finish':
      return { ...state, finished: true }

    case 'restart':
      return initialCrossword(action.teamCount)
  }
}
