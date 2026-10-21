import { describe, expect, it } from 'vitest'
import { DAILY_TIPS, homeTip } from '@/utils/homeTips'

const all = { hasClass: true, hasStudents: true, hasGames: true, hasQuestionSets: true }

describe('homeTip', () => {
  it('points at the first missing step', () => {
    expect(homeTip({ ...all, hasGames: false, hasClass: false }).to).toBe('/games/new')
    expect(homeTip({ ...all, hasClass: false, hasStudents: false }).link).toBe('Tạo lớp')
    expect(homeTip({ ...all, hasStudents: false }).link).toBe('Thêm học sinh')
    expect(homeTip({ ...all, hasQuestionSets: false }).to).toBe('/question-sets')
  })

  it('shows one daily tip all day, and another the next day', () => {
    const morning = homeTip(all, new Date(2026, 9, 21, 7, 0))
    expect(homeTip(all, new Date(2026, 9, 21, 22, 30))).toBe(morning)
    expect(homeTip(all, new Date(2026, 9, 22, 7, 0))).not.toBe(morning)
    expect(DAILY_TIPS).toContain(morning)
  })
})
