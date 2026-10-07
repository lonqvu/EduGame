import type { GameType } from '@/types/game'

interface GameDefinition {
  /** Has a projector player in game-engine. */
  playable: boolean
  /** Edited with the question editor (otherwise it is a tool that uses the class list). */
  usesQuestions: boolean
}

export const gameRegistry: Record<GameType, GameDefinition> = {
  GRID_BOARD: { playable: true, usesQuestions: true },
  QUIZ: { playable: false, usesQuestions: true },
  MATCHING: { playable: false, usesQuestions: true },
  MEMORY: { playable: false, usesQuestions: true },
  SPIN_WHEEL: { playable: true, usesQuestions: false },
  NAME_RACE: { playable: true, usesQuestions: false },
}

/** Route of a class-list tool (games that don't use questions). */
export const toolPath = (type: GameType) => (type === 'NAME_RACE' ? '/tools/pick/horse' : '/tools/wheel')

/** Route that starts a game on the projector. */
export function playPath(game: { id: string; type: GameType }): string {
  return gameRegistry[game.type].usesQuestions ? `/play/${game.id}` : toolPath(game.type)
}

export const editPath = (gameId: string) => `/games/${gameId}/edit`
