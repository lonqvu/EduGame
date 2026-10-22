import { describe, expect, it } from 'vitest'
import { auditDetail, dateTime, oneOf, pageParam } from '@/utils/admin'

describe('auditDetail', () => {
  it('says why a teacher was locked and how many sessions ended', () => {
    expect(auditDetail({ action: 'TEACHER_LOCKED', details: { reason: 'Tài khoản bị lộ', sessionsEnded: 2 } })).toBe(
      'Lý do: Tài khoản bị lộ · kết thúc 2 phiên đăng nhập',
    )
    expect(auditDetail({ action: 'TEACHER_LOCKED', details: { sessionsEnded: 0 } })).toBe('')
  })

  it('says how a feedback moved and how many were exported', () => {
    expect(auditDetail({ action: 'FEEDBACK_STATUS_CHANGED', details: { from: 'NEW', to: 'DONE' } })).toBe('Mới → Đã xử lý')
    expect(auditDetail({ action: 'FEEDBACK_EXPORTED', details: { rows: 12, statuses: [] } })).toBe('12 góp ý')
  })

  it('copes with missing or unexpected details', () => {
    expect(auditDetail({ action: 'ADMIN_GRANTED', details: {} })).toBe('')
    expect(auditDetail({ action: 'TEACHER_LOCKED', details: { reason: 42 } })).toBe('')
  })
})

describe('dateTime', () => {
  it('writes the local day and time', () => {
    const iso = new Date(2026, 9, 21, 9, 5).toISOString()
    expect(dateTime(iso)).toBe('21/10/2026 09:05')
    expect(dateTime(undefined)).toBe('')
    expect(dateTime('not a date')).toBe('')
  })
})

describe('URL parameters', () => {
  it('reads a page number, 0 for anything else', () => {
    expect(pageParam('3')).toBe(3)
    expect(pageParam(null)).toBe(0)
    expect(pageParam('-1')).toBe(0)
    expect(pageParam('2.5')).toBe(0)
    expect(pageParam('abc')).toBe(0)
  })

  it('keeps only allowed values', () => {
    const sorts = ['NEWEST', 'NAME'] as const
    expect(oneOf('NAME', sorts, 'NEWEST')).toBe('NAME')
    expect(oneOf('DROP TABLE', sorts, 'NEWEST')).toBe('NEWEST')
    expect(oneOf(null, sorts, 'NEWEST')).toBe('NEWEST')
  })
})
