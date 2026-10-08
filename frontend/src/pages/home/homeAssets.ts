import type { GameType } from '@/types/game'
import { gameIcon } from '@/utils/gameAssets'

/** Illustrations cut from the home page design (public/assets/home). */
export const HOME_ASSETS = '/assets/home'

/** Picture of a game in the "recent" list: the design's thumbnails, or the game's own logo. */
const THUMBS: Partial<Record<GameType, string>> = {
  GRID_BOARD: 'thumb-grid',
  NAME_RACE: 'thumb-horse',
  QUIZ: 'thumb-quiz',
  SPIN_WHEEL: 'thumb-wheel',
}

export const gameThumb = (type: GameType) => (THUMBS[type] ? `${HOME_ASSETS}/${THUMBS[type]}.png` : gameIcon(type))

/** Face of the n-th student of a ranking (1-based); the design has eight. */
export const kidAvatar = (position: number) => {
  // Podium order in the design: 1st is kid-2, 2nd kid-1, 3rd kid-3, then kid-4..kid-8.
  const index = position === 1 ? 2 : position === 2 ? 1 : ((position - 1) % 8) + 1
  return `${HOME_ASSETS}/kid-${index}.png`
}
