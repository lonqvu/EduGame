import type { GameType } from '@/types/game'


interface GameDefinition {
  /** Has a projector player in game-engine. */
  playable: boolean
  /** Edited with the question editor (otherwise it is a tool that uses the class list). */
  usesQuestions: boolean
  /** The item editor can edit it (see editor/editorDefinitions.tsx). */
  hasEditor: boolean
  /** Who plays, e.g. "Theo đội" (not stored on the backend). */
  players: string
  /** Typical length of a round, e.g. "10–15 phút". */
  duration: string
  /** Added lately: "Mới" on its card. Only the last games added, so the ribbon still means something. */
  isNew?: boolean
  /** Order of "Phổ biến nhất": lower comes first. */
  popularity: number
  /** Unit of `itemCount` in the library, e.g. "24 câu". */
  itemUnit: string
  /** Route of a tool that needs no questions (class list or settings only). */
  toolRoute?: string
}

export const gameRegistry: Record<GameType, GameDefinition> = {
  GRID_BOARD: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', popularity: 1, itemUnit: 'câu' },
  QUIZ: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân hoặc đội', duration: '5–10 phút', popularity: 2, itemUnit: 'câu' },
  GOLDEN_BELL: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cả lớp', duration: '10–15 phút', popularity: 3, itemUnit: 'câu' },
  BOAT_RACE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', popularity: 4, itemUnit: 'câu' },
  MILLIONAIRE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân', duration: '10–15 phút', popularity: 5, itemUnit: 'câu' },
  TUG_OF_WAR: { playable: true, usesQuestions: true, hasEditor: true, players: '2 đội', duration: '5–10 phút', popularity: 6, itemUnit: 'câu' },
  FLOWER_PICK: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', popularity: 7, itemUnit: 'câu' },
  WHACK_MOLE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', popularity: 8, itemUnit: 'câu' },
  TRUE_FALSE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cả lớp theo đội', duration: '5 phút', popularity: 9, itemUnit: 'câu' },
  LUCKY_STAR: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', popularity: 10, itemUnit: 'câu' },
  SECRET_PICTURE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', popularity: 11, itemUnit: 'câu' },
  MOUNTAIN_CLIMB: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', popularity: 12, itemUnit: 'câu' },
  POINT_WHEEL: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', popularity: 13, itemUnit: 'câu' },
  TIC_TAC_TOE: { playable: true, usesQuestions: true, hasEditor: true, players: '2 đội', duration: '5–10 phút', popularity: 14, itemUnit: 'câu' },
  CONNECT_FOUR: { playable: true, usesQuestions: true, hasEditor: true, players: '2 đội', duration: '10–15 phút', popularity: 15, itemUnit: 'câu' },
  TREASURE_CHEST: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', popularity: 16, itemUnit: 'câu' },
  BUILD_TOWER: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', popularity: 17, itemUnit: 'câu' },
  BEE_FLOWER: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', popularity: 18, itemUnit: 'câu' },
  BINGO: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', isNew: true, popularity: 19, itemUnit: 'câu' },
  WORD_SCRAMBLE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', isNew: true, popularity: 20, itemUnit: 'từ' },
  HANGMAN: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', isNew: true, popularity: 21, itemUnit: 'từ' },
  MATCHING: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân', duration: '5–10 phút', popularity: 22, itemUnit: 'bộ' },
  MEMORY: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân', duration: '5–10 phút', popularity: 23, itemUnit: 'bộ thẻ' },
  CROSSWORD: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', popularity: 24, itemUnit: 'hàng' },
  ORDERING: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', popularity: 25, itemUnit: 'bài' },
  SORTING: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', popularity: 26, itemUnit: 'bộ' },
  SPIN_WHEEL: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '2–5 phút', popularity: 27, itemUnit: 'ô', toolRoute: '/tools/wheel' },
  NAME_RACE: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '5–10 phút', popularity: 28, itemUnit: 'ô', toolRoute: '/tools/pick/horse' },
  TEAM_MAKER: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '1 phút', popularity: 29, itemUnit: 'nhóm', toolRoute: '/tools/groups' },
  TIMER: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: 'Tùy chọn', popularity: 30, itemUnit: 'phút', toolRoute: '/tools/timer' },
  DICE: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '1 phút', popularity: 31, itemUnit: 'lần', toolRoute: '/tools/dice' },
  COIN_FLIP: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '1 phút', popularity: 32, itemUnit: 'lần', toolRoute: '/tools/coin' },
  RANDOM_NUMBER: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '1 phút', popularity: 33, itemUnit: 'số', toolRoute: '/tools/number' },
  SCOREBOARD: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: 'Tùy chọn', popularity: 34, itemUnit: 'đội', toolRoute: '/tools/scoreboard' },
  NOISE_METER: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: 'Tùy chọn', popularity: 35, itemUnit: 'lần', toolRoute: '/tools/noise' },
  TRAFFIC_LIGHT: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: 'Tùy chọn', popularity: 36, itemUnit: 'đèn', toolRoute: '/tools/light' },
  STOPWATCH: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: 'Tùy chọn', isNew: true, popularity: 37, itemUnit: 'lần', toolRoute: '/tools/stopwatch' },
  CARD_DRAW: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '1 phút', isNew: true, popularity: 38, itemUnit: 'lá', toolRoute: '/tools/draw' },
  SEATING: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '1 phút', isNew: true, popularity: 39, itemUnit: 'chỗ', toolRoute: '/tools/seating' },
}

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
