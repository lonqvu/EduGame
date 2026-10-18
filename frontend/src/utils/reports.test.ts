import { describe, expect, it } from 'vitest'
import type { ClassReport, ReportSession } from '@/types/api'
import {
  addDays,
  axisLabelIndexes,
  chartBuckets,
  completionRate,
  csvFileName,
  daysBetween,
  durationLabel,
  niceMax,
  periodLabel,
  presetRange,
  rangeProblem,
  resultLabel,
  sessionsCsv,
  starsCsv,
  toCsv,
  trend,
  weekdayDate,
} from '@/utils/reports'

const session = (patch: Partial<ReportSession>): ReportSession => ({
  id: 1,
  gameCode: 'g-1',
  gameTitle: 'Đố vui',
  templateCode: 'QUIZ',
  templateName: 'Trắc nghiệm',
  status: 'ENDED',
  startedAt: '2026-10-12T02:05:00Z',
  endedAt: '2026-10-12T02:30:00Z',
  minutes: 25,
  ...patch,
})

describe('periods', () => {
  it('the last N days end today, today included', () => {
    expect(presetRange(7, new Date(2026, 9, 18))).toEqual({ from: '2026-10-12', to: '2026-10-18' })
    expect(presetRange(30, new Date(2026, 2, 1))).toEqual({ from: '2026-01-31', to: '2026-03-01' })
  })

  it('counts days without being fooled by daylight saving or month ends', () => {
    expect(daysBetween('2026-10-12', '2026-10-18')).toBe(7)
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(31)
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(2)
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('checks a custom period like the server does', () => {
    expect(rangeProblem('2026-10-01', '2026-10-18')).toBeNull()
    expect(rangeProblem('2026-10-18', '2026-10-18')).toBeNull()
    expect(rangeProblem('2026-10-19', '2026-10-18')).toBe('Ngày bắt đầu phải trước ngày kết thúc.')
    expect(rangeProblem('2025-10-17', '2026-10-18')).toBe('Mỗi báo cáo xem tối đa 1 năm.')
    expect(rangeProblem('2025-10-18', '2026-10-18')).toBeNull()
    expect(rangeProblem('', '2026-10-18')).toBe('Cô chọn ngày bắt đầu và ngày kết thúc nhé.')
  })

  it('names a period and a day', () => {
    expect(periodLabel('2026-10-12', '2026-10-18')).toBe('12/10 – 18/10/2026')
    expect(periodLabel('2025-12-20', '2026-01-05')).toBe('20/12/2025 – 05/01/2026')
    expect(periodLabel('2026-10-18', '2026-10-18')).toBe('18/10/2026')
    expect(weekdayDate('2026-10-12')).toBe('T2, 12/10')
    expect(weekdayDate('2026-10-18')).toBe('CN, 18/10')
  })
})

describe('figures', () => {
  it('writes durations the way teachers say them', () => {
    expect(durationLabel(0)).toBe('0 phút')
    expect(durationLabel(45)).toBe('45 phút')
    expect(durationLabel(60)).toBe('1 giờ')
    expect(durationLabel(125)).toBe('2 giờ 5 phút')
  })

  it('a completion rate of nothing played is 0', () => {
    expect(completionRate(0, 0)).toBe(0)
    expect(completionRate(2, 3)).toBe(67)
    expect(completionRate(3, 3)).toBe(100)
  })

  it('says how a figure moved since the period before', () => {
    expect(trend(0, 0)).toBeNull()
    expect(trend(5, 2)).toEqual({ direction: 'up', text: '+3 so với kỳ trước' })
    expect(trend(1, 4)).toEqual({ direction: 'down', text: '−3 so với kỳ trước' })
    expect(trend(4, 4)).toEqual({ direction: 'same', text: 'Bằng kỳ trước' })
  })

  it('rounds the top of the axis up to 1, 2 or 5 times a power of ten', () => {
    expect(niceMax(0)).toBe(1)
    expect(niceMax(1)).toBe(1)
    expect(niceMax(3)).toBe(5)
    expect(niceMax(7)).toBe(10)
    expect(niceMax(12)).toBe(20)
    expect(niceMax(50)).toBe(50)
    expect(niceMax(51)).toBe(100)
  })
})

describe('chart buckets', () => {
  const days = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ date: addDays('2026-01-01', i), activities: i % 3, completed: i % 2 }))

  it('one column per day up to 45 days', () => {
    const { unit, buckets } = chartBuckets(days(30))
    expect(unit).toBe('day')
    expect(buckets).toHaveLength(30)
    expect(buckets[4]).toEqual({ start: '2026-01-05', end: '2026-01-05', activities: 1, completed: 0 })
  })

  it('one column per week beyond, the last one shorter, nothing lost', () => {
    const daily = days(90)
    const { unit, buckets } = chartBuckets(daily)
    expect(unit).toBe('week')
    expect(buckets).toHaveLength(13)
    expect(buckets[0]).toMatchObject({ start: '2026-01-01', end: '2026-01-07' })
    expect(buckets[12]).toMatchObject({ start: addDays('2026-01-01', 84), end: addDays('2026-01-01', 89) })
    expect(buckets.reduce((n, b) => n + b.activities, 0)).toBe(daily.reduce((n, d) => n + d.activities, 0))
  })
})

describe('axis labels', () => {
  it('labels every column when there are few', () => {
    expect(axisLabelIndexes(0)).toEqual([])
    expect(axisLabelIndexes(5)).toEqual([0, 1, 2, 3, 4])
  })

  it('spaces the labels evenly, keeps the last, and never crowds it', () => {
    expect(axisLabelIndexes(30)).toEqual([0, 5, 10, 15, 20, 25, 29])
    expect(axisLabelIndexes(31)).toEqual([0, 5, 10, 15, 20, 25, 30])
    // 24 would sit next to 26: it gives way.
    expect(axisLabelIndexes(27, 7)).toEqual([0, 5, 10, 15, 20, 26])
    for (const n of [8, 13, 45, 53]) {
      const picked = axisLabelIndexes(n)
      expect(picked[0]).toBe(0)
      expect(picked.at(-1)).toBe(n - 1)
      expect(picked.length).toBeLessThanOrEqual(7)
    }
  })
})

describe('results of a game', () => {
  it('names the winning team and the scores, best first', () => {
    const teams = [
      { name: 'Đội Xanh', score: 30, correct: 3 },
      { name: 'Đội Đỏ', score: 40, correct: 4 },
    ]
    expect(resultLabel(session({ results: { teams } }))).toBe('Đội Đỏ thắng · 40 – 30')
  })

  it('says when teams tie at the top, or nobody scored', () => {
    expect(resultLabel(session({ results: { teams: [{ name: 'A', score: 20, correct: 2 }, { name: 'B', score: 20, correct: 2 }] } }))).toBe(
      'A và B cùng thắng · 20 – 20',
    )
    expect(resultLabel(session({ results: { teams: [{ name: 'A', score: 0, correct: 0 }, { name: 'B', score: 0, correct: 0 }] } }))).toBe('Hòa · 0 – 0')
  })

  it('names who rang the golden bell, shortening long lists', () => {
    expect(resultLabel(session({ results: { winners: ['An'], players: 20 } }))).toBe('An rung chuông vàng')
    expect(resultLabel(session({ results: { winners: ['An', 'Bình', 'Chi', 'Dũng', 'Hà'], players: 20 } }))).toBe(
      'An, Bình, Chi và 2 bạn rung chuông vàng',
    )
    expect(resultLabel(session({ results: { winners: [], players: 20 } }))).toBe('Không bạn nào trụ đến cuối')
  })

  it('a game without kept results, or not finished', () => {
    expect(resultLabel(session({ results: undefined }))).toBe('Đã hoàn thành')
    expect(resultLabel(session({ status: 'IN_PROGRESS', minutes: undefined, endedAt: undefined }))).toBe('Chưa chơi đến cuối')
  })
})

describe('CSV', () => {
  it('starts with a BOM for Excel, quotes what needs it and keeps formulas as text', () => {
    const csv = toCsv([
      ['Tên', 'Ghi chú'],
      ['Nguyễn "Bé" An', 'a, b'],
      ['=1+1', -2],
    ])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual(['Tên,Ghi chú', '"Nguyễn ""Bé"" An","a, b"', "'=1+1,-2", ''])
  })

  const report = {
    classroom: { code: 'c-3a', name: 'Lớp 3A Đặc biệt', grade: 3, studentCount: 2 },
    from: '2026-10-12',
    to: '2026-10-18',
    students: [
      { id: 1, displayName: 'An', rollNumber: 1, stars: 3 },
      { id: 2, displayName: 'Bình', stars: 0 },
    ],
    sessions: [session({ results: { teams: [{ name: 'Đội Đỏ', score: 40, correct: 4 }] } }), session({ id: 2, status: 'IN_PROGRESS', minutes: undefined })],
  } as unknown as ClassReport

  it('exports the history and the stars', () => {
    const history = sessionsCsv(report).slice(1).split('\r\n')
    expect(history[0]).toBe('Bắt đầu,Trò chơi,Loại trò chơi,Trạng thái,Thời lượng (phút),Kết quả')
    expect(history[1]).toMatch(/,Đố vui,Trắc nghiệm,Hoàn thành,25,Đội Đỏ thắng · 40$/)
    expect(history[2]).toMatch(/,Chưa chơi đến cuối,,Chưa chơi đến cuối$/)

    expect(starsCsv(report).slice(1).split('\r\n')).toEqual(['STT,Học sinh,Sao (12/10 – 18/10/2026)', '1,An,3', ',Bình,0', ''])
  })

  it('names the file after the class and the period, without accents', () => {
    expect(csvFileName(report, 'sao')).toBe('bao-cao-lop-3a-dac-biet-2026-10-12-2026-10-18-sao.csv')
  })
})
