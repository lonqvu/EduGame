import type { GameType } from '@/types/game'

interface GameDefinition {
  /** Has a projector player in game-engine. */
  playable: boolean
  /** Edited with the question editor (otherwise it is a tool that uses the class list). */
  usesQuestions: boolean
  /**
   * The question editor can edit it. The editor writes GRID_BOARD items (`OPEN_QUESTION`: text, answer, points);
   * QUIZ / MATCHING / MEMORY items have other shapes (options, pairs, cards) and the backend rejects them.
   */
  hasEditor: boolean
  /** Chips on the template card (not stored on the backend). */
  tags: string[]
  /** Unit of `itemCount` in the library, e.g. "24 câu". */
  itemUnit: string
}

export const gameRegistry: Record<GameType, GameDefinition> = {
  GRID_BOARD: { playable: true, usesQuestions: true, hasEditor: true, tags: ['Theo đội', '10–15 phút'], itemUnit: 'câu' },
  QUIZ: { playable: false, usesQuestions: true, hasEditor: false, tags: ['Cá nhân hoặc đội'], itemUnit: 'câu' },
  MATCHING: { playable: false, usesQuestions: true, hasEditor: false, tags: ['Lần lượt'], itemUnit: 'bộ' },
  MEMORY: { playable: false, usesQuestions: true, hasEditor: false, tags: ['Theo đội'], itemUnit: 'bộ thẻ' },
  SPIN_WHEEL: { playable: true, usesQuestions: false, hasEditor: false, tags: ['Dùng danh sách lớp'], itemUnit: 'ô' },
  NAME_RACE: { playable: true, usesQuestions: false, hasEditor: false, tags: ['Dùng danh sách lớp'], itemUnit: 'ô' },
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
