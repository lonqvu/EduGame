import type { AdminAction, AdminAuditEntry, FeedbackStatus, UserRole, UserStatus } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { FEEDBACK_KINDS } from '@/utils/feedback'

/** Labels of "Quản trị". */

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khoá',
  DELETED: 'Đã xoá',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  TEACHER: 'Giáo viên',
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: 'Mới',
  SEEN: 'Đã xem',
  DONE: 'Đã xử lý',
}

export const feedbackKindLabel = (kind: string) => FEEDBACK_KINDS.find((k) => k.kind === kind)?.label ?? kind

export const ACTION_LABELS: Record<AdminAction, string> = {
  TEACHER_LOCKED: 'Khoá tài khoản',
  TEACHER_UNLOCKED: 'Mở khoá tài khoản',
  TEACHER_SIGNED_OUT: 'Đăng xuất mọi thiết bị',
  ADMIN_GRANTED: 'Cấp quyền quản trị',
  ADMIN_REVOKED: 'Bỏ quyền quản trị',
  LOGIN_UNBLOCKED: 'Mở chặn đăng nhập',
  FEEDBACK_STATUS_CHANGED: 'Đổi trạng thái góp ý',
  FEEDBACK_EXPORTED: 'Tải file góp ý',
}

/** Periods of the overview, in days. */
export const DASHBOARD_PERIODS = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '90 ngày' },
] as const

const number = (value: unknown) => (typeof value === 'number' ? value : null)
const text = (value: unknown) => (typeof value === 'string' && value ? value : null)
const feedbackStatus = (value: unknown) => FEEDBACK_STATUS_LABELS[value as FeedbackStatus] ?? String(value)

/** What else the log line says, in words: "Lý do: …", "Mới → Đã xử lý", "12 dòng"... */
export function auditDetail(entry: Pick<AdminAuditEntry, 'action' | 'details'>): string {
  const d = entry.details ?? {}
  const parts: string[] = []
  switch (entry.action) {
    case 'TEACHER_LOCKED':
      if (text(d.reason)) parts.push(`Lý do: ${text(d.reason)}`)
      break
    case 'FEEDBACK_STATUS_CHANGED':
      parts.push(`${feedbackStatus(d.from)} → ${feedbackStatus(d.to)}`)
      break
    case 'FEEDBACK_EXPORTED':
      if (number(d.rows) !== null) parts.push(`${number(d.rows)} góp ý`)
      break
    default:
      break
  }
  const ended = number(d.sessionsEnded)
  if (ended) parts.push(`kết thúc ${ended} phiên đăng nhập`)
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
export const count = (n: number) => n.toLocaleString('vi-VN')

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
      return 'Cô không thao tác trên tài khoản của chính mình ở đây được.'
    case 'ADMIN_CANNOT_BE_LOCKED':
      return 'Cần bỏ quyền quản trị trước khi khoá tài khoản này.'
    case 'TEACHER_LOCKED':
      return 'Tài khoản đang bị khoá. Mở khoá trước khi cấp quyền quản trị.'
    case 'LAST_ADMIN':
      return 'Lớp Vui cần ít nhất một quản trị viên.'
    default:
      return apiErrorMessage(error)
  }
}
