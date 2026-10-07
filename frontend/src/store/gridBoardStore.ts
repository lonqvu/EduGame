import { create } from 'zustand'
import { DEMO_TEAMS } from '@/mocks/demoData'
import type { Team } from '@/types/game'

export interface TeamScore extends Team {
  score: number
  correct: number
  streak: number
  bestStreak: number
}

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

const freshTeams = (): TeamScore[] =>
  DEMO_TEAMS.map((t) => ({ ...t, score: 0, correct: 0, streak: 0, bestStreak: 0 }))

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
      teams: s.teams.map((t) => {
        if (t.id !== teamId) return t
        if (!correct) return { ...t, streak: 0 }
        const streak = t.streak + 1
        return {
          ...t,
          score: t.score + points,
          correct: t.correct + 1,
          streak,
          bestStreak: Math.max(t.bestStreak, streak),
        }
      }),
      openedTiles: correct ? [...s.openedTiles, tileNo] : s.openedTiles,
      turn: (s.turn + 1) % s.teams.length,
    })),

  undo: () =>
    set((s) => {
      const previous = s.history.at(-1)
      return previous ? { ...previous, history: s.history.slice(0, -1) } : s
    }),
}))
