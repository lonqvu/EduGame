import i18n from 'i18next'
import type { Translation } from '@/i18n/locales/vi'

type Named = keyof Translation['games']['names']

const isNamed = (type: string): type is Named => i18n.exists(`games.names.${type}`)

/**
 * A game's name in the teacher's language ("Đua thuyền", "Boat Race"), by its type; `fallback` (the server's name)
 * for a type the translations do not know yet.
 */
export function gameName(type: string, fallback = type): string {
  return isNamed(type) ? i18n.t(`games.names.${type}`) : fallback
}

/** A game's description in the teacher's language, by its type; `fallback` for a type not translated. */
export function gameDescription(type: string, fallback = ''): string {
  return isNamed(type) ? i18n.t(`games.descriptions.${type}`) : fallback
}
