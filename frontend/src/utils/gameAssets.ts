import type { GameType } from '@/types/game'

const toFileName = (type: GameType) => type.toLowerCase().replace(/_/g, '-')

/** 320×200 game illustration, e.g. SPIN_WHEEL → /assets/icons/games/spin-wheel.svg */
export const gameIcon = (type: GameType) => `/assets/icons/games/${toFileName(type)}.svg`

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
