import i18n from 'i18next'
import type { GuideGameType } from '@/game-engine/gameGuide'
import type { Translation } from '@/i18n/locales/vi'
import type { PlaySettings } from '@/game-engine/shared/gameSettings'

type NumberKey = 'teams' | 'timeLimitSec' | 'points' | 'rescues' | 'raceSteps' | 'keywordPoints' | 'luckyStars'
type ToggleKey = 'allowSteal' | 'shuffleItems'

export type QuickSetting =
  | { kind: 'select'; key: NumberKey; label: string; options: { value: number; label: string }[] }
  | { kind: 'toggle'; key: ToggleKey; label: string; hint?: string }

type Settings = Translation['start']['settings']
/** A count's key in start.settings (its forms _one / _other). */
type CountKey = 'teamCount' | 'seconds' | 'pointCount' | 'stages' | 'steps' | 'rescueCount' | 'starCount'

/** Choices whose label is read in the current language: "3 đội", "30 giây"; `none` names 0 ("Không có"). */
const values = (list: number[], unit: CountKey, zero?: 'noLimit' | 'none') =>
  list.map((value) => ({
    value,
    get label() {
      return zero && value === 0 ? i18n.t(`start.settings.${zero}`) : i18n.t(`start.settings.${unit}`, { count: value })
    },
  }))

/** A setting whose name (and hint) is read in the current language. */
function select(key: NumberKey, label: Exclude<keyof Settings, 'points' | CountKey | `${CountKey}_${string}`>, options: { value: number; label: string }[]): QuickSetting {
  return {
    kind: 'select',
    key,
    options,
    get label() {
      return i18n.t(`start.settings.${label}`)
    },
  }
}

const TEAMS = select('teams', 'teams', values([2, 3, 4], 'teamCount'))
const TIME = select('timeLimitSec', 'timeLimit', values([0, 10, 15, 20, 30, 45, 60, 90], 'seconds', 'noLimit'))
/** What a right answer is worth; `what` names it by game (start.settings.points.*). */
const points = (what: keyof Settings['points']): QuickSetting => ({
  kind: 'select',
  key: 'points',
  options: values([5, 10, 20, 50, 100], 'pointCount'),
  get label() {
    return i18n.t(`start.settings.points.${what}`)
  },
})
const STEAL: QuickSetting = {
  kind: 'toggle',
  key: 'allowSteal',
  get label() {
    return i18n.t('start.settings.allowSteal')
  },
  get hint() {
    return i18n.t('start.settings.allowStealHint')
  },
}
const SHUFFLE: QuickSetting = {
  kind: 'toggle',
  key: 'shuffleItems',
  get label() {
    return i18n.t('start.settings.shuffle')
  },
}

/**
 * Settings the start page offers for each game: only rules its projector reads (see PLAY_DEFAULTS), so every change
 * shows on screen. Lật ô has none: its teams are fixed and each tile has its own points.
 */
export const QUICK_SETTINGS: Record<GuideGameType, QuickSetting[]> = {
  GRID_BOARD: [],
  QUIZ: [TEAMS, TIME, points('answer'), STEAL, SHUFFLE],
  BOAT_RACE: [
    TEAMS,
    TIME,
    select('raceSteps', 'raceStepsFinish', values([3, 5, 7, 10], 'stages')),
    STEAL,
    SHUFFLE,
  ],
  GOLDEN_BELL: [
    TIME,
    select('rescues', 'rescues', values([0, 1, 2, 3], 'rescueCount', 'none')),
    SHUFFLE,
  ],
  MILLIONAIRE: [TIME, SHUFFLE],
  TUG_OF_WAR: [
    TIME,
    select('raceSteps', 'pullSteps', values([3, 4, 5, 6], 'steps')),
    STEAL,
    SHUFFLE,
  ],
  FLOWER_PICK: [TEAMS, TIME, points('answer'), STEAL, SHUFFLE],
  WHACK_MOLE: [TEAMS, TIME, points('whack'), STEAL, SHUFFLE],
  TRUE_FALSE: [
    TEAMS,
    select('timeLimitSec', 'timeLimit', values([0, 5, 10, 15, 20], 'seconds', 'noLimit')),
    points('answer'),
    SHUFFLE,
  ],
  LUCKY_STAR: [
    TEAMS,
    TIME,
    points('answer'),
    select('luckyStars', 'luckyStars', values([0, 1, 2, 3, 4, 5], 'starCount', 'none')),
    SHUFFLE,
  ],
  SECRET_PICTURE: [
    TEAMS,
    TIME,
    points('door'),
    select('keywordPoints', 'pictureGuess', values([20, 40, 60, 100], 'pointCount')),
    STEAL,
  ],
  MOUNTAIN_CLIMB: [
    TEAMS,
    TIME,
    select('raceSteps', 'raceStepsSummit', values([3, 5, 7, 10], 'stages')),
    STEAL,
    SHUFFLE,
  ],
  POINT_WHEEL: [TEAMS, TIME, SHUFFLE],
  TIC_TAC_TOE: [TIME, SHUFFLE],
  CONNECT_FOUR: [TIME, SHUFFLE],
  TREASURE_CHEST: [TEAMS, TIME, SHUFFLE],
  BUILD_TOWER: [TEAMS, TIME, STEAL, SHUFFLE],
  BEE_FLOWER: [TEAMS, TIME, points('answer'), STEAL, SHUFFLE],
  BINGO: [TEAMS, TIME, points('bingo'), SHUFFLE],
  WORD_SCRAMBLE: [TEAMS, TIME, STEAL, SHUFFLE],
  HANGMAN: [
    TEAMS,
    points('letter'),
    select('keywordPoints', 'solveBonus', values([20, 30, 50, 100], 'pointCount')),
    SHUFFLE,
  ],
  MATCHING: [TEAMS, points('pair')],
  MEMORY: [TEAMS, points('memoryPair')],
  CROSSWORD: [
    TEAMS,
    points('row'),
    select('keywordPoints', 'keywordGuess', values([20, 40, 60, 100], 'pointCount')),
    STEAL,
  ],
  ORDERING: [TEAMS, points('order'), STEAL],
  SORTING: [TEAMS, points('sort')],
}

/** The options of a select, with the current value added when it is not one of them (set elsewhere). */
export function optionsWith(setting: Extract<QuickSetting, { kind: 'select' }>, current: PlaySettings) {
  const value = current[setting.key]
  if (setting.options.some((o) => o.value === value)) return setting.options
  return [...setting.options, { value, label: String(value) }].sort((a, b) => a.value - b.value)
}
