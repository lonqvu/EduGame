import i18n from 'i18next'
import { env } from '@/utils/env'

/** "Hồ sơ của tôi": the rules the backend checks too (ProfileRules), and how the profile is shown. */

export const MAX_DISPLAY_NAME = 100

/** Pictures a teacher can pick: the teacher drawing (default) or a class animal. */
export const AVATARS = ['teacher', 'bear', 'rabbit', 'lion', 'cat', 'fox', 'panda', 'owl', 'frog'] as const
export type AvatarKey = (typeof AVATARS)[number]

/** The name of a picture, in the current language. */
export const avatarLabel = (key: AvatarKey) => i18n.t(`profile.avatars.${key}`)

const isAvatar = (value: string | undefined): value is AvatarKey => !!value && (AVATARS as readonly string[]).includes(value)

/** users.avatar of a teacher who uploaded a picture. */
export const UPLOADED = 'upload'

/**
 * Picture of a profile: the uploaded one (its address is on the API server, `apiBase` is env.apiBaseUrl), a class
 * animal, or the teacher drawing (default, unknown).
 */
export function avatarSrc(avatar?: string, avatarUrl?: string, apiBase: string = env.apiBaseUrl): string {
  if (avatar === UPLOADED && avatarUrl) return new URL(avatarUrl, new URL(apiBase, globalThis.location?.href)).href
  return isAvatar(avatar) && avatar !== 'teacher' ? `/assets/classes/avatar-${avatar}.svg` : '/assets/classes/teacher.svg'
}

/** Picture files the browser can read and turn into the JPEG sent (the backend takes JPEG and PNG). */
const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
/** Larger files are refused before reading them; what is sent is much smaller (see AVATAR_SIDE). */
export const MAX_PICTURE_BYTES = 15 * 1024 * 1024
/** Side of the square picture sent; the backend makes it 256 px. */
export const AVATAR_SIDE = 512

/** Form rule for a picked file: false or the message to show. */
export function pictureError(file: { type: string; size: number }): string | false {
  if (!PICTURE_TYPES.includes(file.type)) return i18n.t('profile.edit.pictureType')
  if (file.size > MAX_PICTURE_BYTES) return i18n.t('profile.edit.pictureTooLarge')
  return false
}

/** The centre square of a picture: where to cut it from. */
export function centreSquare(width: number, height: number): { x: number; y: number; side: number } {
  const side = Math.min(width, height)
  return { x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), side }
}

const SEPARATORS = /[\s.\-()]/g
const PHONE = /^\+?\d{9,15}$/

/** The phone as stored: separators removed; '' when blank; null when it is not a phone number. */
export function normalizePhone(value: string): string | null {
  const digits = value.trim().replace(SEPARATORS, '')
  if (!digits) return ''
  return PHONE.test(digits) ? digits : null
}

/** Form rule: false or the message to show. */
export function phoneError(value: string): string | false {
  return normalizePhone(value) === null ? i18n.t('profile.edit.phoneInvalid') : false
}

/** "0987 654 321" for a 10-digit Vietnamese number; other numbers as they are. */
export function formatPhone(phone?: string): string {
  if (!phone) return ''
  const m = /^(\d{4})(\d{3})(\d{3})$/.exec(phone)
  return m ? `${m[1]} ${m[2]} ${m[3]}` : phone
}

/** "15/08/2025" in the teacher's time zone; '' when unknown. */
export function joinedLabel(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  // "15/08/2025" in Vietnamese; "August 15, 2025" in English (day and month in that order would be ambiguous).
  if (i18n.language === 'en') return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

/** "Giáo viên" for teachers, "Quản trị viên" for admins. */
export const roleLabel = (role: 'ADMIN' | 'TEACHER') => (role === 'ADMIN' ? i18n.t('profile.card.admin') : i18n.t('profile.card.teacher'))

/** 1234 -> "1.234" (Vietnamese grouping). */
export const countLabel = (n: number) => n.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN')
