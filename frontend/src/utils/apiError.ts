import i18n from 'i18next'
import type { errors } from '@/i18n/locales/vi/errors'
import type { ApiError } from '@/types/api'

const isApiError = (error: unknown): error is ApiError =>
  typeof error === 'object' && error !== null && 'code' in error && 'status' in error

/** Error codes the teacher is told about in their own words (errors.*). */
type KnownCode = Exclude<keyof typeof errors, 'generic' | 'sessionExpired' | 'notFound' | 'TOO_MANY_LOGIN_ATTEMPTS'>
const isKnown = (code: string): code is KnownCode => code !== 'TOO_MANY_LOGIN_ATTEMPTS' && i18n.exists(`errors.${code}`)

/** Short message, in the teacher's language, for a failed request (the backend messages are for developers). */
export function apiErrorMessage(error: unknown): string {
  if (!isApiError(error)) return i18n.t('errors.generic')
  if (error.code === 'TOO_MANY_LOGIN_ATTEMPTS') {
    return i18n.t('errors.TOO_MANY_LOGIN_ATTEMPTS', { minutes: /(\d+) min/.exec(error.message)?.[1] ?? '15' })
  }
  if (isKnown(error.code)) return i18n.t(`errors.${error.code}`)
  if (error.status === 401) return i18n.t('errors.sessionExpired')
  if (error.status === 404) return i18n.t('errors.notFound')
  return i18n.t('errors.generic')
}

export const isNotFound = (error: unknown) => isApiError(error) && error.status === 404
