import type { UserSettings } from '@/types/api'

export const DEFAULT_SETTINGS: UserSettings = {
  display: { reduceMotion: false, fullscreenOnStart: false },
  games: {},
  notifications: { newSignInEmail: true, passwordChangedEmail: true },
}

export type GameDefaults = UserSettings['games']
export type GameDefaultKey = keyof GameDefaults

/** "Theo từng trò": the game keeps its own default. */
export const AUTO = 'auto'
export type Choice = number | typeof AUTO

const yesNo = [
  { value: AUTO, label: 'Theo từng trò' },
  { value: 1, label: 'Có' },
  { value: 0, label: 'Không' },
] as const

/** The choices of each default for new games, as the Select shows them (booleans as 1 / 0). */
export const GAME_DEFAULT_OPTIONS: Record<GameDefaultKey, readonly { value: Choice; label: string }[]> = {
  teams: [{ value: AUTO, label: 'Theo từng trò' }, ...[2, 3, 4].map((n) => ({ value: n, label: `${n} đội` }))],
  timeLimitSec: [
    { value: AUTO, label: 'Theo từng trò' },
    { value: 0, label: 'Không giới hạn' },
    ...[10, 15, 20, 30, 45, 60, 90].map((n) => ({ value: n, label: `${n} giây` })),
  ],
  allowSteal: yesNo,
  shuffleItems: yesNo,
}

const BOOLEAN_KEYS: GameDefaultKey[] = ['allowSteal', 'shuffleItems']

/** A default as the Select shows it. */
export function toChoice(games: GameDefaults, key: GameDefaultKey): Choice {
  const value = games[key]
  if (value === undefined || value === null) return AUTO
  return typeof value === 'boolean' ? Number(value) : value
}

/** A Select choice as the settings store it. */
export function fromChoice(key: GameDefaultKey, choice: Choice): number | boolean | null {
  if (choice === AUTO) return null
  return BOOLEAN_KEYS.includes(key) ? choice === 1 : choice
}

/** Whether any default for new games is set. */
export const hasGameDefaults = (games: GameDefaults) => Object.values(games).some((v) => v !== undefined && v !== null)

/** The settings with every missing key at its default (an older server, a partial cache). */
export function withDefaults(settings: Partial<UserSettings> | null | undefined): UserSettings {
  return {
    display: { ...DEFAULT_SETTINGS.display, ...settings?.display },
    games: { ...settings?.games },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...settings?.notifications },
  }
}

// --- Display preferences kept in this browser, so they apply before the settings load (no flash of animation) --

const DISPLAY_KEY = 'edugame.display'

export function readCachedDisplay(): UserSettings['display'] {
  try {
    const raw = localStorage.getItem(DISPLAY_KEY)
    return withDefaults(raw ? { display: JSON.parse(raw) as UserSettings['display'] } : null).display
  } catch {
    return DEFAULT_SETTINGS.display
  }
}

export function cacheDisplay(display: UserSettings['display']) {
  try {
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(display))
  } catch {
    // Private mode or storage full: the settings still load from the server.
  }
}

/** On sign-out: the next teacher on this computer starts from the defaults. */
export function forgetCachedDisplay() {
  try {
    localStorage.removeItem(DISPLAY_KEY)
  } catch {
    // Nothing to forget.
  }
}
