import { create } from 'zustand'
import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'

export type { TeamScore }

interface Snapshot {
  teams: TeamScore[]
  openedTiles: number[]
  turn: number
}

/** State of one "Lật ô thi đua" round shown on the projector. */
interface GridBoardState extends Snapshot {
  gameId: string | null
  history: Snapshot[]
  /** Starts a fresh round unless this game's round is already running. */
  ensureRound: (gameId: string) => void
  restart: () => void
  /** Records the answer of `teamId` for a tile; a wrong answer leaves the tile open for later. */
  answer: (tileNo: number, teamId: string, correct: boolean, points: number) => void
  undo: () => void
}

export const useGridBoardStore = create<GridBoardState>()((set, get) => ({
  gameId: null,
  teams: freshTeams(),
  openedTiles: [],
  turn: 0,
  history: [],

  ensureRound: (gameId) => {
    if (get().gameId !== gameId) {
      set({ gameId, teams: freshTeams(), openedTiles: [], turn: 0, history: [] })
    }
  },

  restart: () => set({ teams: freshTeams(), openedTiles: [], turn: 0, history: [] }),

  answer: (tileNo, teamId, correct, points) =>
    set((s) => ({
      history: [...s.history, { teams: s.teams, openedTiles: s.openedTiles, turn: s.turn }],
      teams: correct ? award(s.teams, teamId, points) : miss(s.teams, teamId),
      openedTiles: correct ? [...s.openedTiles, tileNo] : s.openedTiles,
      turn: (s.turn + 1) % s.teams.length,
    })),

  undo: () =>
    set((s) => {
      const previous = s.history.at(-1)
      return previous ? { ...previous, history: s.history.slice(0, -1) } : s
    }),
}))
