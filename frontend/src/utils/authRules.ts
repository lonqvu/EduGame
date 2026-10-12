/** Rules shared by the sign-up and password reset forms; the backend checks the same. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD = 8
/** BCrypt reads at most 72 bytes; Vietnamese letters with diacritics take 2-3 bytes each. */
export const MAX_PASSWORD_BYTES = 72

const encoder = new TextEncoder()

/** Form rule: false or the message to show. */
export function passwordTooLong(value: string): string | false {
  return encoder.encode(value).length > MAX_PASSWORD_BYTES
    ? 'Mật khẩu quá dài, cô rút ngắn lại nhé (chữ có dấu tính như 2–3 ký tự).'
    : false
}
