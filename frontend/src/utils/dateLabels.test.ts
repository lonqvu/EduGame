import { describe, expect, it } from 'vitest'
import { dayLabel, relativeTimeLabel } from '@/utils/dateLabels'

const now = new Date(2026, 9, 9, 10, 0) // Fri 9 Oct 2026, 10:00 local time

describe('relativeTimeLabel', () => {
  it('labels today, yesterday and recent days', () => {
    expect(relativeTimeLabel(new Date(2026, 9, 9, 9, 59, 30).toISOString(), now)).toBe('Vừa xong')
    expect(relativeTimeLabel(new Date(2026, 9, 9, 8, 5).toISOString(), now)).toBe('Hôm nay 08:05')
    expect(relativeTimeLabel(new Date(2026, 9, 8, 14, 30).toISOString(), now)).toBe('Hôm qua 14:30')
    expect(relativeTimeLabel(new Date(2026, 9, 7, 23, 59).toISOString(), now)).toBe('2 ngày trước')
    expect(relativeTimeLabel(new Date(2026, 8, 12).toISOString(), now)).toBe('12/09/2026')
  })

  it('is empty for missing or broken input', () => {
    expect(relativeTimeLabel(undefined, now)).toBe('')
    expect(relativeTimeLabel('not a date', now)).toBe('')
  })
})

describe('dayLabel', () => {
  it('names the weekday the Vietnamese way', () => {
    expect(dayLabel(new Date(2026, 9, 9))).toBe('Thứ 6, 9 Tháng 10')
    expect(dayLabel(new Date(2026, 9, 11))).toBe('Chủ nhật, 11 Tháng 10')
    expect(dayLabel(new Date(2026, 9, 12))).toBe('Thứ 2, 12 Tháng 10')
  })
})
