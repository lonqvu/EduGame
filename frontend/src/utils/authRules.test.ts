import { describe, expect, it } from 'vitest'
import { passwordTooLong } from '@/utils/authRules'
import { apiErrorMessage } from '@/utils/apiError'

describe('passwordTooLong', () => {
  it('counts UTF-8 bytes like the backend (BCrypt limit 72)', () => {
    expect(passwordTooLong('a'.repeat(72))).toBe(false)
    expect(passwordTooLong('a'.repeat(73))).toMatch(/quá dài/)
    expect(passwordTooLong('ệ'.repeat(24))).toBe(false)
    expect(passwordTooLong('ệ'.repeat(25))).toMatch(/quá dài/)
  })
})

describe('apiErrorMessage', () => {
  it('explains a sign-in lock in Vietnamese', () => {
    expect(
      apiErrorMessage({ status: 429, code: 'TOO_MANY_LOGIN_ATTEMPTS', message: 'Too many failed sign-ins, try again in 12 min' }),
    ).toBe('Cô đã nhập sai nhiều lần. Vì an toàn, cô thử lại sau 12 phút hoặc dùng “Quên mật khẩu?” nhé.')
  })
})
