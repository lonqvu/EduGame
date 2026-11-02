import i18n from 'i18next'
import type { Translation } from '@/i18n/locales/vi'
import type { GameType } from '@/types/game'

type Registry = Translation['registry']


interface GameDefinition {
  /** Has a projector player in game-engine. */
  playable: boolean
  /** Edited with the question editor (otherwise it is a tool that uses the class list). */
  usesQuestions: boolean
  /** The item editor can edit it (see editor/editorDefinitions.tsx). */
  hasEditor: boolean
  /** Who plays (registry.players.*: "Theo đội"), not stored on the backend. */
  players: keyof Registry['players']
  /** Typical length of a round (registry.durations.*: "10–15 phút"). */
  duration: keyof Registry['durations']
  /** Added lately: "Mới" on its card. Only the last games added, so the ribbon still means something. */
  isNew?: boolean
  /** Order of "Phổ biến nhất": lower comes first. */
  popularity: number
  /** Unit of `itemCount` in the library (registry.units.*: "24 câu"). */
  itemUnit: keyof Registry['unitWords']
  /** Route of a tool that needs no questions (class list or settings only). */
  toolRoute?: string
}

export const gameRegistry: Record<GameType, GameDefinition> = {
  GRID_BOARD: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', popularity: 1, itemUnit: 'question' },
  QUIZ: { playable: true, usesQuestions: true, hasEditor: true, players: 'soloOrTeams', duration: 'fiveToTen', popularity: 2, itemUnit: 'question' },
  GOLDEN_BELL: { playable: true, usesQuestions: true, hasEditor: true, players: 'wholeClass', duration: 'tenToFifteen', popularity: 3, itemUnit: 'question' },
  BOAT_RACE: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'fiveToTen', popularity: 4, itemUnit: 'question' },
  MILLIONAIRE: { playable: true, usesQuestions: true, hasEditor: true, players: 'solo', duration: 'tenToFifteen', popularity: 5, itemUnit: 'question' },
  TUG_OF_WAR: { playable: true, usesQuestions: true, hasEditor: true, players: 'twoTeams', duration: 'fiveToTen', popularity: 6, itemUnit: 'question' },
  FLOWER_PICK: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', popularity: 7, itemUnit: 'question' },
  WHACK_MOLE: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'fiveToTen', popularity: 8, itemUnit: 'question' },
  TRUE_FALSE: { playable: true, usesQuestions: true, hasEditor: true, players: 'wholeClassTeams', duration: 'five', popularity: 9, itemUnit: 'question' },
  LUCKY_STAR: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', popularity: 10, itemUnit: 'question' },
  SECRET_PICTURE: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', popularity: 11, itemUnit: 'question' },
  MOUNTAIN_CLIMB: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'fiveToTen', popularity: 12, itemUnit: 'question' },
  POINT_WHEEL: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', popularity: 13, itemUnit: 'question' },
  TIC_TAC_TOE: { playable: true, usesQuestions: true, hasEditor: true, players: 'twoTeams', duration: 'fiveToTen', popularity: 14, itemUnit: 'question' },
  CONNECT_FOUR: { playable: true, usesQuestions: true, hasEditor: true, players: 'twoTeams', duration: 'tenToFifteen', popularity: 15, itemUnit: 'question' },
  TREASURE_CHEST: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', popularity: 16, itemUnit: 'question' },
  BUILD_TOWER: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'fiveToTen', popularity: 17, itemUnit: 'question' },
  BEE_FLOWER: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'fiveToTen', popularity: 18, itemUnit: 'question' },
  BINGO: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', isNew: true, popularity: 19, itemUnit: 'question' },
  WORD_SCRAMBLE: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', isNew: true, popularity: 20, itemUnit: 'word' },
  HANGMAN: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', isNew: true, popularity: 21, itemUnit: 'word' },
  MATCHING: { playable: true, usesQuestions: true, hasEditor: true, players: 'solo', duration: 'fiveToTen', popularity: 22, itemUnit: 'set' },
  MEMORY: { playable: true, usesQuestions: true, hasEditor: true, players: 'solo', duration: 'fiveToTen', popularity: 23, itemUnit: 'cardSet' },
  CROSSWORD: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'tenToFifteen', popularity: 24, itemUnit: 'row' },
  ORDERING: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'fiveToTen', popularity: 25, itemUnit: 'exercise' },
  SORTING: { playable: true, usesQuestions: true, hasEditor: true, players: 'teams', duration: 'fiveToTen', popularity: 26, itemUnit: 'set' },
  SPIN_WHEEL: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'twoToFive', popularity: 27, itemUnit: 'tile', toolRoute: '/tools/wheel' },
  NAME_RACE: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'fiveToTen', popularity: 28, itemUnit: 'tile', toolRoute: '/tools/pick/horse' },
  TEAM_MAKER: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'oneMinute', popularity: 29, itemUnit: 'group', toolRoute: '/tools/groups' },
  TIMER: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'custom', popularity: 30, itemUnit: 'minute', toolRoute: '/tools/timer' },
  DICE: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'oneMinute', popularity: 31, itemUnit: 'time', toolRoute: '/tools/dice' },
  COIN_FLIP: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'oneMinute', popularity: 32, itemUnit: 'time', toolRoute: '/tools/coin' },
  RANDOM_NUMBER: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'oneMinute', popularity: 33, itemUnit: 'number', toolRoute: '/tools/number' },
  SCOREBOARD: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'custom', popularity: 34, itemUnit: 'team', toolRoute: '/tools/scoreboard' },
  NOISE_METER: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'custom', popularity: 35, itemUnit: 'time', toolRoute: '/tools/noise' },
  TRAFFIC_LIGHT: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'custom', popularity: 36, itemUnit: 'light', toolRoute: '/tools/light' },
  STOPWATCH: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'custom', isNew: true, popularity: 37, itemUnit: 'time', toolRoute: '/tools/stopwatch' },
  CARD_DRAW: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'oneMinute', isNew: true, popularity: 38, itemUnit: 'card', toolRoute: '/tools/draw' },
  SEATING: { playable: true, usesQuestions: false, hasEditor: false, players: 'wholeClass', duration: 'oneMinute', isNew: true, popularity: 39, itemUnit: 'seat', toolRoute: '/tools/seating' },
}

/** "Theo đội", in the teacher's language. */
export const playersLabel = (type: GameType) => i18n.t(`registry.players.${gameRegistry[type].players}`)

/** "10–15 phút", in the teacher's language. */
export const durationLabel = (type: GameType) => i18n.t(`registry.durations.${gameRegistry[type].duration}`)

/** "24 câu" / "24 questions": a number of the game's items. */
export const itemsLabel = (type: GameType, count: number) => i18n.t(`registry.units.${gameRegistry[type].itemUnit}`, { count })

/** "câu" / "question": the game's item, alone (in "Chưa có câu nào…"). */
export const itemWord = (type: GameType) => i18n.t(`registry.unitWords.${gameRegistry[type].itemUnit}`)

/** Games whose items are quiz questions: any of them can be played the way of the others. */
export const QUIZ_FAMILY = [
  'QUIZ',
  'GOLDEN_BELL',
  'BOAT_RACE',
  'MILLIONAIRE',
  'TUG_OF_WAR',
  'FLOWER_PICK',
  'WHACK_MOLE',
  'TRUE_FALSE',
  'LUCKY_STAR',
  'SECRET_PICTURE',
  'MOUNTAIN_CLIMB',
  'POINT_WHEEL',
  'TIC_TAC_TOE',
  'CONNECT_FOUR',
  'TREASURE_CHEST',
  'BUILD_TOWER',
  'BEE_FLOWER',
  'BINGO',
] as const satisfies readonly GameType[]
export type QuizFamilyType = (typeof QUIZ_FAMILY)[number]
export const isQuizFamily = (type: GameType): type is QuizFamilyType => (QUIZ_FAMILY as readonly GameType[]).includes(type)

/** Games played with open questions (a clue and its answer): Lật ô, and the word games. */
export const WORD_FAMILY = ['GRID_BOARD', 'WORD_SCRAMBLE', 'HANGMAN'] as const satisfies readonly GameType[]

/**
 * The other games the items of `type` can be played as ("Chơi kiểu khác"): any quiz game for a quiz, the word games
 * for Lật ô and the word games (Lật ô keeps its own board and is not offered).
 */
export function alsoPlayableAs(type: GameType): GameType[] {
  if (isQuizFamily(type)) return QUIZ_FAMILY.filter((t) => t !== type)
  if ((WORD_FAMILY as readonly GameType[]).includes(type)) return WORD_FAMILY.filter((t) => t !== type && t !== 'GRID_BOARD')
  return []
}

/** Templates from the backend that this frontend has no engine for are hidden. */
export const isGameType = (code: string): code is GameType => Object.hasOwn(gameRegistry, code)

/** Route of a tool (games that don't use questions). */
export const toolPath = (type: GameType) => gameRegistry[type].toolRoute ?? '/'

/** Route that starts a game on the projector. */
export function playPath(game: { id: string; type: GameType }): string {
  return gameRegistry[game.type].usesQuestions ? `/play/${game.id}` : toolPath(game.type)
}

/**
 * Route of the page shown before a game starts (rules, preview, quick settings); tools have none and open directly.
 * `as` plays quiz questions the way of another quiz game.
 */
export function startPath(game: { id: string; type: GameType }, as?: GameType): string {
  if (!gameRegistry[game.type].usesQuestions) return toolPath(game.type)
  return `/games/${game.id}/start${as ? `?as=${as}` : ''}`
}

/** The game the projector plays: the game's own type, or another quiz game asked for with `?as=`. */
export const playMode = (type: GameType, as: string | null): GameType =>
  as && isGameType(as) && alsoPlayableAs(type).includes(as) ? as : type

export const editPath = (gameId: string) => `/games/${gameId}/edit`
