import { DEFAULT_TEAMS } from '@/game-engine/grid-board/teams'
import type { Team } from '@/types/game'

export interface TeamScore extends Team {
  score: number
  correct: number
  streak: number
  bestStreak: number
}

/** `count` teams (2-4) with no points yet. */
export function freshTeams(count = DEFAULT_TEAMS.length): TeamScore[] {
  const n = Math.min(Math.max(Math.round(count) || 0, 2), DEFAULT_TEAMS.length)
  return DEFAULT_TEAMS.slice(0, n).map((t) => ({ ...t, score: 0, correct: 0, streak: 0, bestStreak: 0 }))
}

/** A right answer of `teamId`: points, and one more in its streak. */
export function award(teams: TeamScore[], teamId: string, points: number): TeamScore[] {
  return teams.map((t) => {
    if (t.id !== teamId) return t
    const streak = t.streak + 1
    return { ...t, score: t.score + points, correct: t.correct + 1, streak, bestStreak: Math.max(t.bestStreak, streak) }
  })
}

/** A wrong answer of `teamId`: its streak ends. */
export function miss(teams: TeamScore[], teamId: string): TeamScore[] {
  return teams.map((t) => (t.id === teamId ? { ...t, streak: 0 } : t))
}
