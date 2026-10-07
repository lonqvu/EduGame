import type { TeamScore } from '@/store/gridBoardStore'

export interface RankedTeam extends TeamScore {
  rank: number
}

/** Dense ranking by score: equal scores share a rank. */
export function rankTeams(teams: TeamScore[]): RankedTeam[] {
  const sorted = [...teams].sort((a, b) => b.score - a.score)
  let rank = 0
  let lastScore: number | null = null
  return sorted.map((t) => {
    if (t.score !== lastScore) {
      rank += 1
      lastScore = t.score
    }
    return { ...t, rank }
  })
}

/** Podium order seen on screen: 2nd, 1st, 3rd, 4th, ... */
export function podiumOrder<T>(ranked: T[]): T[] {
  if (ranked.length < 2) return ranked
  const [first, second, ...rest] = ranked
  return [second, first, ...rest]
}

const PODIUM_HEIGHTS = [190, 150, 120, 96]

export const podiumHeight = (rank: number) => PODIUM_HEIGHTS[Math.min(rank, PODIUM_HEIGHTS.length) - 1]

/** Team with the strictly highest value, or null when nobody scored or it's a tie. */
export function bestBy(teams: TeamScore[], pick: (t: TeamScore) => number): TeamScore | null {
  const sorted = [...teams].sort((a, b) => pick(b) - pick(a))
  const [top, next] = sorted
  if (!top || pick(top) === 0 || (next && pick(next) === pick(top))) return null
  return top
}
