import type { GameType } from '@/types/game'

/** Reads the `settings` JSON of a game version (template default_config + teacher changes), with safe defaults. */
export interface PlaySettings {
  teams: number
  points: number
  allowSteal: boolean
  timeLimitSec: number
  shuffleItems: boolean
  shuffleOptions: boolean
  flipBackDelayMs: number
  /** Rung chuông vàng: times the teacher may bring every student who is out back in. */
  rescues: number
  /** Đua thuyền: right answers a boat needs to reach the finish. */
  raceSteps: number
  /** Ô chữ: points for guessing the keyword; Ô cửa bí mật: for guessing the picture. */
  keywordPoints: number
  /** Ngôi sao may mắn: stars that give points without a question. */
  luckyStars: number
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
    rescues: num(obj(rules.rescue).count, defaults.rescues ?? 1, 0, 5),
    raceSteps: num(obj(rules.win).steps, defaults.raceSteps ?? 5, 2, 20),
    keywordPoints: num(scoring.keywordPoints, defaults.keywordPoints ?? 40, 0, 1000),
    luckyStars: num(scoring.luckyStars, defaults.luckyStars ?? 3, 0, 10),
  }
}

/** Question games whose projector reads its rules from `settings` (Lật ô has fixed teams and points per tile). */
export type RulesGameType = Exclude<
  GameType,
  | 'GRID_BOARD'
  | 'SPIN_WHEEL'
  | 'NAME_RACE'
  | 'TEAM_MAKER'
  | 'TIMER'
  | 'DICE'
  | 'COIN_FLIP'
  | 'RANDOM_NUMBER'
  | 'SCOREBOARD'
  | 'NOISE_METER'
  | 'TRAFFIC_LIGHT'
>

/** What each projector plays with when `settings` leaves a rule out. */
export const PLAY_DEFAULTS: Record<RulesGameType, Partial<PlaySettings>> = {
  QUIZ: { teams: 4, points: 10, allowSteal: true, timeLimitSec: 30 },
  GOLDEN_BELL: { timeLimitSec: 15, rescues: 1 },
  BOAT_RACE: { teams: 4, points: 1, allowSteal: true, timeLimitSec: 20, raceSteps: 5 },
  MILLIONAIRE: { timeLimitSec: 30 },
  TUG_OF_WAR: { teams: 2, points: 1, allowSteal: true, timeLimitSec: 20, raceSteps: 4 },
  FLOWER_PICK: { teams: 3, points: 10, allowSteal: true, timeLimitSec: 30 },
  WHACK_MOLE: { teams: 2, points: 10, allowSteal: true, timeLimitSec: 20 },
  TRUE_FALSE: { teams: 4, points: 10, timeLimitSec: 10 },
  LUCKY_STAR: { teams: 3, points: 10, allowSteal: false, timeLimitSec: 30, luckyStars: 3 },
  SECRET_PICTURE: { teams: 3, points: 10, allowSteal: true, timeLimitSec: 30, keywordPoints: 40 },
  MOUNTAIN_CLIMB: { teams: 3, points: 1, allowSteal: true, timeLimitSec: 20, raceSteps: 5 },
  POINT_WHEEL: { teams: 3, timeLimitSec: 30 },
  TIC_TAC_TOE: { teams: 2, points: 10, timeLimitSec: 30 },
  CONNECT_FOUR: { teams: 2, points: 10, timeLimitSec: 30 },
  TREASURE_CHEST: { teams: 3, timeLimitSec: 30 },
  BUILD_TOWER: { teams: 3, points: 1, allowSteal: true, timeLimitSec: 20 },
  BEE_FLOWER: { teams: 2, points: 10, allowSteal: true, timeLimitSec: 20 },
  BINGO: { teams: 3, points: 10, timeLimitSec: 20 },
  MATCHING: { teams: 2, points: 10 },
  MEMORY: { teams: 2, points: 10 },
  CROSSWORD: { teams: 4, points: 10, allowSteal: true, keywordPoints: 40 },
  ORDERING: { teams: 2, points: 10, allowSteal: true },
  SORTING: { teams: 2, points: 10 },
}

/** Where each rule lives in the `settings` JSON (the shape readPlaySettings reads). */
const PATHS: Record<keyof PlaySettings, string[]> = {
  teams: ['rules', 'participants', 'teams'],
  points: ['rules', 'scoring', 'points'],
  allowSteal: ['rules', 'scoring', 'allowSteal'],
  timeLimitSec: ['timeLimitSec'],
  shuffleItems: ['shuffleItems'],
  shuffleOptions: ['shuffleOptions'],
  flipBackDelayMs: ['flipBackDelayMs'],
  rescues: ['rules', 'rescue', 'count'],
  raceSteps: ['rules', 'win', 'steps'],
  keywordPoints: ['rules', 'scoring', 'keywordPoints'],
  luckyStars: ['rules', 'scoring', 'luckyStars'],
}

/** `settings` with the given rules changed; everything else (other keys, rule types...) is kept. */
export function writePlaySettings(settings: Record<string, unknown> | undefined, patch: Partial<PlaySettings>): Record<string, unknown> {
  const next: Record<string, unknown> = structuredClone(obj(settings))
  for (const [key, value] of Object.entries(patch) as [keyof PlaySettings, unknown][]) {
    if (value === undefined) continue
    const path = PATHS[key]
    let node = next
    for (const part of path.slice(0, -1)) {
      node[part] = { ...obj(node[part]) }
      node = node[part] as Record<string, unknown>
    }
    node[path.at(-1)!] = value
  }
  return next
}
