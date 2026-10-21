import type { GameType } from '@/types/game'

export type GameBadge = 'POPULAR' | 'EASY' | 'NEW'

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
  /** Ribbon on the game card. */
  badge?: GameBadge
  /** Order of "Phổ biến nhất": lower comes first. */
  popularity: number
  /** Unit of `itemCount` in the library, e.g. "24 câu". */
  itemUnit: string
  /** Route of a tool that needs no questions (class list or settings only). */
  toolRoute?: string
}

export const gameRegistry: Record<GameType, GameDefinition> = {
  GRID_BOARD: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', badge: 'POPULAR', popularity: 1, itemUnit: 'câu' },
  QUIZ: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân hoặc đội', duration: '5–10 phút', badge: 'EASY', popularity: 2, itemUnit: 'câu' },
  GOLDEN_BELL: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cả lớp', duration: '10–15 phút', badge: 'NEW', popularity: 3, itemUnit: 'câu' },
  BOAT_RACE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', badge: 'NEW', popularity: 4, itemUnit: 'câu' },
  MILLIONAIRE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân', duration: '10–15 phút', badge: 'NEW', popularity: 5, itemUnit: 'câu' },
  TUG_OF_WAR: { playable: true, usesQuestions: true, hasEditor: true, players: '2 đội', duration: '5–10 phút', badge: 'NEW', popularity: 6, itemUnit: 'câu' },
  FLOWER_PICK: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', badge: 'NEW', popularity: 7, itemUnit: 'câu' },
  WHACK_MOLE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', badge: 'NEW', popularity: 8, itemUnit: 'câu' },
  TRUE_FALSE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cả lớp theo đội', duration: '5 phút', badge: 'NEW', popularity: 9, itemUnit: 'câu' },
  LUCKY_STAR: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', badge: 'NEW', popularity: 10, itemUnit: 'câu' },
  SECRET_PICTURE: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', badge: 'NEW', popularity: 11, itemUnit: 'câu' },
  MOUNTAIN_CLIMB: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', badge: 'NEW', popularity: 12, itemUnit: 'câu' },
  POINT_WHEEL: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', badge: 'NEW', popularity: 13, itemUnit: 'câu' },
  MATCHING: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân', duration: '5–10 phút', popularity: 14, itemUnit: 'bộ' },
  MEMORY: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân', duration: '5–10 phút', popularity: 15, itemUnit: 'bộ thẻ' },
  CROSSWORD: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', badge: 'NEW', popularity: 16, itemUnit: 'hàng' },
  ORDERING: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', popularity: 17, itemUnit: 'bài' },
  SORTING: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '5–10 phút', popularity: 18, itemUnit: 'bộ' },
  SPIN_WHEEL: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '2–5 phút', popularity: 19, itemUnit: 'ô', toolRoute: '/tools/wheel' },
  NAME_RACE: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '5–10 phút', popularity: 20, itemUnit: 'ô', toolRoute: '/tools/pick/horse' },
  TEAM_MAKER: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '1 phút', popularity: 21, itemUnit: 'nhóm', toolRoute: '/tools/groups' },
  TIMER: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: 'Tùy chọn', popularity: 22, itemUnit: 'phút', toolRoute: '/tools/timer' },
  DICE: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '1 phút', popularity: 23, itemUnit: 'lần', toolRoute: '/tools/dice' },
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
] as const satisfies readonly GameType[]
export type QuizFamilyType = (typeof QUIZ_FAMILY)[number]
export const isQuizFamily = (type: GameType): type is QuizFamilyType => (QUIZ_FAMILY as readonly GameType[]).includes(type)

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
  isQuizFamily(type) && as && isGameType(as) && isQuizFamily(as) ? as : type

export const editPath = (gameId: string) => `/games/${gameId}/edit`
