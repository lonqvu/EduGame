import { describe, expect, it } from 'vitest'
import { avatarSrc, centreSquare, countLabel, formatPhone, joinedLabel, normalizePhone, phoneError, pictureError, roleLabel } from '@/utils/profile'

describe('phone numbers', () => {
  it('keeps the digits of a number typed in groups', () => {
    expect(normalizePhone('0987 654 321')).toBe('0987654321')
    expect(normalizePhone('0987.654.321')).toBe('0987654321')
    expect(normalizePhone('(024) 3825-1234')).toBe('02438251234')
    expect(normalizePhone(' +84 987 654 321 ')).toBe('+84987654321')
  })

  it('blank means no phone, anything else that is not a number is refused', () => {
    expect(normalizePhone('   ')).toBe('')
    expect(phoneError('')).toBe(false)
    for (const wrong of ['12345678', '0987abc321', '09876543210123456', '84+987654321']) {
      expect(normalizePhone(wrong)).toBeNull()
      expect(phoneError(wrong)).toMatch(/9–15 chữ số/)
    }
  })

  it('shows a 10-digit number in groups', () => {
    expect(formatPhone('0987654321')).toBe('0987 654 321')
    expect(formatPhone('+84987654321')).toBe('+84987654321')
    expect(formatPhone(undefined)).toBe('')
  })
})

describe('avatars', () => {
  it('a class animal has its picture, anything else is the teacher drawing', () => {
    expect(avatarSrc('owl')).toBe('/assets/classes/avatar-owl.svg')
    expect(avatarSrc('teacher')).toBe('/assets/classes/teacher.svg')
    expect(avatarSrc(undefined)).toBe('/assets/classes/teacher.svg')
    expect(avatarSrc('dragon')).toBe('/assets/classes/teacher.svg')
  })
})

describe('labels', () => {
  it('the join date is day/month/year', () => {
    expect(joinedLabel('2025-08-15T03:00:00Z')).toBe('15/08/2025')
    expect(joinedLabel(undefined)).toBe('')
    expect(joinedLabel('not a date')).toBe('')
  })

  it('names the role and groups big numbers', () => {
    expect(roleLabel('TEACHER')).toBe('Giáo viên')
    expect(roleLabel('ADMIN')).toBe('Quản trị viên')
    expect(countLabel(1234)).toBe('1.234')
  })
})

describe('uploaded pictures', () => {
  it('an uploaded picture is on the API server', () => {
    expect(avatarSrc('upload', '/api/v1/avatars/abc', 'http://localhost:8080/api')).toBe('http://localhost:8080/api/v1/avatars/abc')
    expect(avatarSrc('upload', '/api/v1/avatars/abc', 'https://edugame.vn/api')).toBe('https://edugame.vn/api/v1/avatars/abc')
    // Without its address: the default drawing.
    expect(avatarSrc('upload', undefined, 'http://localhost:8080/api')).toBe('/assets/classes/teacher.svg')
  })

  it('takes common picture files up to 15 MB', () => {
    expect(pictureError({ type: 'image/jpeg', size: 2_000_000 })).toBe(false)
    expect(pictureError({ type: 'image/webp', size: 100 })).toBe(false)
    expect(pictureError({ type: 'image/svg+xml', size: 100 })).toMatch(/JPG, PNG/)
    expect(pictureError({ type: 'application/pdf', size: 100 })).toMatch(/JPG, PNG/)
    expect(pictureError({ type: 'image/png', size: 16 * 1024 * 1024 })).toMatch(/15 MB/)
  })

  it('cuts the centre square', () => {
    expect(centreSquare(800, 400)).toEqual({ x: 200, y: 0, side: 400 })
    expect(centreSquare(300, 500)).toEqual({ x: 0, y: 100, side: 300 })
    expect(centreSquare(256, 256)).toEqual({ x: 0, y: 0, side: 256 })
    expect(centreSquare(301, 100)).toEqual({ x: 100, y: 0, side: 100 })
  })
})
