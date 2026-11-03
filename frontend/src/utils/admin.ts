import type { AdminAction, AdminAuditEntry, FeedbackStatus, UserRole, UserStatus } from '@/types/api'
import i18n from 'i18next'
import { translatedLabels } from '@/i18n/labels'
import { apiErrorMessage } from '@/utils/apiError'
import { FEEDBACK_KINDS } from '@/utils/feedback'

/** Labels of "Quản trị". */

export const USER_STATUS_LABELS = translatedLabels<UserStatus>(['ACTIVE', 'LOCKED', 'DELETED'], (status) => `admin.status.${status}`)

export const ROLE_LABELS = translatedLabels<UserRole>(['ADMIN', 'TEACHER'], (role) => `admin.roles.${role}`)

export const FEEDBACK_STATUS_LABELS = translatedLabels<FeedbackStatus>(['NEW', 'SEEN', 'DONE'], (status) => `admin.feedbackStatus.${status}`)

export const feedbackKindLabel = (kind: string) => FEEDBACK_KINDS.find((k) => k.kind === kind)?.label ?? kind

export const ACTION_LABELS = translatedLabels<AdminAction>(
  ['TEACHER_LOCKED', 'TEACHER_UNLOCKED', 'TEACHER_SIGNED_OUT', 'ADMIN_GRANTED', 'ADMIN_REVOKED', 'LOGIN_UNBLOCKED', 'FEEDBACK_STATUS_CHANGED', 'FEEDBACK_EXPORTED'],
  (action) => `admin.actions.${action}`,
)

/** Periods of the overview, in days. */
const period = <D extends number>(days: D) => ({
  days,
  get label() {
    return i18n.t('admin.days', { count: days as number })
  },
})

export const DASHBOARD_PERIODS = [period(7), period(30), period(90), period(365)] as const

const number = (value: unknown) => (typeof value === 'number' ? value : null)
const text = (value: unknown) => (typeof value === 'string' && value ? value : null)
const feedbackStatus = (value: unknown) => FEEDBACK_STATUS_LABELS[value as FeedbackStatus] ?? String(value)

/** What else the log line says, in words: "Lý do: …", "Mới → Đã xử lý", "12 dòng"... */
export function auditDetail(entry: Pick<AdminAuditEntry, 'action' | 'details'>): string {
  const d = entry.details ?? {}
  const parts: string[] = []
  switch (entry.action) {
    case 'TEACHER_LOCKED':
      if (text(d.reason)) parts.push(i18n.t('admin.detail.reason', { reason: text(d.reason) }))
      break
    case 'FEEDBACK_STATUS_CHANGED':
      parts.push(`${feedbackStatus(d.from)} → ${feedbackStatus(d.to)}`)
      break
    case 'FEEDBACK_EXPORTED':
      if (number(d.rows) !== null) parts.push(i18n.t('admin.detail.rows', { count: number(d.rows) ?? 0 }))
      break
    default:
      break
  }
  const ended = number(d.sessionsEnded)
  if (ended) parts.push(i18n.t('admin.detail.sessions', { count: ended }))
  return parts.join(' · ')
}

/** "21/10/2026 14:05" in the browser's time. */
export function dateTime(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`
}

/** "1.234" */
export const count = (n: number) => n.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN')

/** A page number from the URL: 0 for anything that is not a whole number ≥ 0. */
export function pageParam(value: string | null): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 0
}

/** Pick one of the allowed values from the URL, or the fallback. */
export function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** The answer to an admin action, in words: the rules the server enforces, else the usual messages. */
export function adminErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : null
  switch (code) {
    case 'CANNOT_CHANGE_OWN_ACCOUNT':
    case 'ADMIN_CANNOT_BE_LOCKED':
    case 'TEACHER_LOCKED':
    case 'LAST_ADMIN':
      return i18n.t(`admin.errors.${code}`)
    default:
      return apiErrorMessage(error)
  }
}
