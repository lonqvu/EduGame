import type { GameType } from '@/types/game'

const toFileName = (type: GameType) => type.toLowerCase().replace(/_/g, '-')

/** Games drawn as 320×200 illustrations in /assets/icons/games; the newer ones only have their card art. */
const ICONS: ReadonlySet<GameType> = new Set(['GRID_BOARD', 'QUIZ', 'MATCHING', 'MEMORY', 'SPIN_WHEEL', 'NAME_RACE'])

/** Game illustration, e.g. SPIN_WHEEL → /assets/icons/games/spin-wheel.svg, GOLDEN_BELL → its card art. */
export const gameIcon = (type: GameType) =>
  ICONS.has(type) ? `/assets/icons/games/${toFileName(type)}.svg` : `/assets/games/card-${toFileName(type)}.svg`

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
