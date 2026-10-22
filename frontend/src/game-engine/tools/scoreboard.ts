import { MAX_SCOREBOARD_TEAMS, MIN_SCOREBOARD_TEAMS } from '@/game-engine/tools/classTools'

/** A team of "Bảng điểm": its name (the teacher can rename it) and its points. */
export interface BoardTeam {
  id: string
  name: string
  color: string
  score: number
}

const COLORS = ['#F28C28', '#3563E9', '#2E9E6A', '#8B5CF6', '#E5484D', '#0E9AA7']
const NAMES = ['Đội Cam', 'Đội Biển', 'Đội Lá', 'Đội Tím', 'Đội Đỏ', 'Đội Ngọc']

/** `count` teams (2-6) with no points, named and colored as in the games. */
export function scoreboardTeams(count: number): BoardTeam[] {
  const n = Math.min(Math.max(Math.round(count) || MIN_SCOREBOARD_TEAMS, MIN_SCOREBOARD_TEAMS), MAX_SCOREBOARD_TEAMS)
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: NAMES[i], color: COLORS[i], score: 0 }))
}

/** The teams with `delta` points for `id`; a score never goes under 0. */
export const addPoints = (teams: BoardTeam[], id: string, delta: number): BoardTeam[] =>
  teams.map((t) => (t.id === id ? { ...t, score: Math.max(0, t.score + delta) } : t))

/** The teams now leading (several on a tie), none while nobody scored. */
export function leaders(teams: BoardTeam[]): string[] {
  const best = Math.max(0, ...teams.map((t) => t.score))
  return best > 0 ? teams.filter((t) => t.score === best).map((t) => t.id) : []
}

/** Teams kept from storage when they look right; else fresh ones. */
export function restoreTeams(value: unknown): BoardTeam[] | null {
  if (!Array.isArray(value) || value.length < MIN_SCOREBOARD_TEAMS || value.length > MAX_SCOREBOARD_TEAMS) return null
  const ok = value.every(
    (t) =>
      t && typeof t.id === 'string' && typeof t.name === 'string' && typeof t.color === 'string' && Number.isFinite(t.score) && t.score >= 0,
  )
  return ok ? (value as BoardTeam[]) : null
}
