import type { TeamScore } from '@/game-engine/shared/teamScore'

/** The stage a boat has reached: one per right answer, capped at the finish. */
export const boatStep = (team: TeamScore, steps: number) => Math.min(team.correct, steps)

/** The boat that reached the finish, if any (only one can: the game stops there). */
export const arrivedTeam = (teams: TeamScore[], steps: number) => teams.find((t) => t.correct >= steps) ?? null
