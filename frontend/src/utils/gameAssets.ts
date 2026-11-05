import type { GameType } from '@/types/game'

const toFileName = (type: GameType) => type.toLowerCase().replace(/_/g, '-')

/** Games drawn as 320×200 illustrations in /assets/icons/games; the newer ones only have their card art. */
const ICONS: ReadonlySet<GameType> = new Set(['GRID_BOARD', 'QUIZ', 'MATCHING', 'MEMORY', 'SPIN_WHEEL', 'NAME_RACE'])

/** Games whose card art is a painted picture (card-*.webp) rather than the generated vector. */
const RASTER_CARDS: ReadonlySet<GameType> = new Set(['BEE_FLOWER', 'MOUNTAIN_CLIMB'])

/**
 * 2:1 card art of a game, e.g. QUIZ → /assets/games/card-quiz.svg.
 * `?v=2`: browsers that opened the site before card-bee-flower.webp was deployed were told, for a year, that the page
 * was that picture; a new address makes them fetch the picture.
 */
export const gameCardArt = (type: GameType) =>
  `/assets/games/card-${toFileName(type)}.${RASTER_CARDS.has(type) ? 'webp?v=2' : 'svg'}`

/** Game illustration, e.g. SPIN_WHEEL → /assets/icons/games/spin-wheel.svg, GOLDEN_BELL → its card art. */
export const gameIcon = (type: GameType) =>
  ICONS.has(type) ? `/assets/icons/games/${toFileName(type)}.svg` : gameCardArt(type)

/** 128×128 square game icon. */
export const gameSquareIcon = (type: GameType) => `/assets/icons/games-square/${toFileName(type)}.svg`

/** Pastel tint for a person's avatar, stable per name. */
const AVATAR_TINTS = ['#FFD0D8', '#CFE3FF', '#BDEBD3', '#E3D5FF', '#FFE6A3', '#FFC3A8']

export function avatarTint(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]
}

export const initialOf = (name: string) => name.trim().charAt(0).toUpperCase()
