import type { TeamScore } from '@/game-engine/shared/teamScore'

/**
 * Where the rope is: right answers of the left team minus those of the right team, so positive pulls left. Capped at
 * `steps`, where the marker crosses a team's line.
 */
export function ropePosition(teams: TeamScore[], steps: number): number {
  const [left, right] = teams
  if (!left || !right) return 0
  return Math.max(-steps, Math.min(steps, left.correct - right.correct))
}

/** The team that pulled the rope over its line, if any. */
export function pullWinner(teams: TeamScore[], steps: number): TeamScore | null {
  const position = ropePosition(teams, steps)
  return position >= steps ? teams[0] : position <= -steps ? teams[1] : null
}
