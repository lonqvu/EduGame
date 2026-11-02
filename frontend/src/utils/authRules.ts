import i18n from 'i18next'

/** Rules shared by the sign-up and password reset forms; the backend checks the same. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD = 8
/** BCrypt reads at most 72 bytes; Vietnamese letters with diacritics take 2-3 bytes each. */
export const MAX_PASSWORD_BYTES = 72

const encoder = new TextEncoder()

/** Form rule: false or the message to show. */
export function passwordTooLong(value: string): string | false {
  return encoder.encode(value).length > MAX_PASSWORD_BYTES ? i18n.t('auth.passwordTooLong') : false
}
