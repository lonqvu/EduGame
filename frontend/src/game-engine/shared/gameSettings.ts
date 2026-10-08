/** Reads the `settings` JSON of a game version (template default_config + teacher changes), with safe defaults. */
export interface PlaySettings {
  teams: number
  points: number
  allowSteal: boolean
  timeLimitSec: number
  shuffleItems: boolean
  shuffleOptions: boolean
  flipBackDelayMs: number
}

const obj = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const num = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback

const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)

export function readPlaySettings(settings: Record<string, unknown> | undefined, defaults: Partial<PlaySettings> = {}): PlaySettings {
  const rules = obj(settings?.rules)
  const scoring = obj(rules.scoring)
  return {
    teams: num(obj(rules.participants).teams, defaults.teams ?? 2, 2, 4),
    points: num(scoring.points, defaults.points ?? 10, 0, 1000),
    allowSteal: bool(scoring.allowSteal, defaults.allowSteal ?? false),
    timeLimitSec: num(settings?.timeLimitSec, defaults.timeLimitSec ?? 0, 0, 600),
    shuffleItems: bool(settings?.shuffleItems, defaults.shuffleItems ?? false),
    shuffleOptions: bool(settings?.shuffleOptions, defaults.shuffleOptions ?? true),
    flipBackDelayMs: num(settings?.flipBackDelayMs, defaults.flipBackDelayMs ?? 1000, 300, 5000),
  }
}
