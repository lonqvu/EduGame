import type { GameType } from '@/types/game'

/** Illustrations cut from the home page design (public/assets/home). */
export const HOME_ASSETS = '/assets/home'

/** Picture of a game in the "recent" list: its vector card art (sharp at any size). */
export const gameThumb = (type: GameType) => `/assets/games/card-${type.toLowerCase().replace(/_/g, '-')}.svg`

/** Face of the n-th student of a ranking (1-based); the design has eight. */
export const kidAvatar = (position: number) => {
  // Podium order in the design: 1st is kid-2, 2nd kid-1, 3rd kid-3, then kid-4..kid-8.
  const index = position === 1 ? 2 : position === 2 ? 1 : ((position - 1) % 8) + 1
  return `${HOME_ASSETS}/kid-${index}.png`
}
