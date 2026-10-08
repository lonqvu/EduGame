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
}

export const gameRegistry: Record<GameType, GameDefinition> = {
  GRID_BOARD: { playable: true, usesQuestions: true, hasEditor: true, players: 'Theo đội', duration: '10–15 phút', badge: 'POPULAR', popularity: 1, itemUnit: 'câu' },
  QUIZ: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân hoặc đội', duration: '5–10 phút', badge: 'EASY', popularity: 2, itemUnit: 'câu' },
  MATCHING: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân', duration: '5–10 phút', badge: 'NEW', popularity: 3, itemUnit: 'bộ' },
  MEMORY: { playable: true, usesQuestions: true, hasEditor: true, players: 'Cá nhân', duration: '5–10 phút', popularity: 4, itemUnit: 'bộ thẻ' },
  SPIN_WHEEL: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '2–5 phút', popularity: 5, itemUnit: 'ô' },
  NAME_RACE: { playable: true, usesQuestions: false, hasEditor: false, players: 'Cả lớp', duration: '5–10 phút', popularity: 6, itemUnit: 'ô' },
}

/** Templates from the backend that this frontend has no engine for are hidden. */
export const isGameType = (code: string): code is GameType => Object.hasOwn(gameRegistry, code)

/** Route of a class-list tool (games that don't use questions). */
export const toolPath = (type: GameType) => (type === 'NAME_RACE' ? '/tools/pick/horse' : '/tools/wheel')

/** Route that starts a game on the projector. */
export function playPath(game: { id: string; type: GameType }): string {
  return gameRegistry[game.type].usesQuestions ? `/play/${game.id}` : toolPath(game.type)
}

export const editPath = (gameId: string) => `/games/${gameId}/edit`
