import { shuffle } from '@/game-engine/shared/shuffle'
import type { TeamScore } from '@/game-engine/shared/teamScore'

/** What a chest holds. */
export type Treasure =
  | { kind: 'points'; points: number }
  | { kind: 'double' }
  | { kind: 'steal'; points: number }
  | { kind: 'swap' }
  | { kind: 'empty' }

/** Every chest of a game is drawn from this pool: mostly points, a few surprises. */
export const TREASURES: Treasure[] = [
  { kind: 'points', points: 10 },
  { kind: 'points', points: 20 },
  { kind: 'points', points: 30 },
  { kind: 'points', points: 50 },
  { kind: 'double' },
  { kind: 'steal', points: 20 },
  { kind: 'swap' },
  { kind: 'empty' },
]

/** Three chests to choose from, all different. */
export const dealChests = (random: () => number = Math.random): Treasure[] => shuffle(TREASURES, random).slice(0, 3)

/** "+20 điểm", "Nhân đôi điểm"... */
export function treasureLabel(t: Treasure): string {
  switch (t.kind) {
    case 'points':
      return `+${t.points} điểm`
    case 'double':
      return 'Nhân đôi điểm'
    case 'steal':
      return `Lấy ${t.points} điểm`
    case 'swap':
      return 'Đổi điểm'
    case 'empty':
      return 'Rương trống'
  }
}

/** The team (not `teamId`) with the most points; the first one on a tie. */
export const leaderBesides = (teams: TeamScore[], teamId: string) =>
  teams.filter((t) => t.id !== teamId).reduce<TeamScore | null>((best, t) => (!best || t.score > best.score ? t : best), null)

/**
 * The scores after `teamId` opened `treasure`: points add up; "Nhân đôi" doubles the team's score (at least +10);
 * "Lấy" takes points from the leading other team (no more than it has); "Đổi điểm" swaps with the leading other team
 * when that helps; an empty chest changes nothing.
 */
export function openTreasure(teams: TeamScore[], teamId: string, treasure: Treasure): Record<string, number> {
  const me = teams.find((t) => t.id === teamId)
  if (!me) return {}
  const other = leaderBesides(teams, teamId)
  switch (treasure.kind) {
    case 'points':
      return { [teamId]: me.score + treasure.points }
    case 'double':
      return { [teamId]: me.score + Math.max(me.score, 10) }
    case 'steal': {
      if (!other) return {}
      const taken = Math.min(treasure.points, other.score)
      return { [teamId]: me.score + taken, [other.id]: other.score - taken }
    }
    case 'swap':
      return other && other.score > me.score ? { [teamId]: other.score, [other.id]: me.score } : {}
    case 'empty':
      return {}
  }
}
