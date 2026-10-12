import { describe, expect, it } from 'vitest'
import { formatClock, makeGroups, rollDice, secondsLeft } from '@/game-engine/tools/classTools'

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

describe('Chia nhóm', () => {
  const classOf = (n: number) => Array.from({ length: n }, (_, i) => `s${i + 1}`)

  it('puts every student in exactly one group, sizes differing by at most one', () => {
    for (const [size, count] of [[28, 4], [28, 5], [27, 8], [10, 3], [5, 2]]) {
      const groups = makeGroups(classOf(size), count, seeded(size + count))
      expect(groups).toHaveLength(count)
      expect(groups.flat().sort()).toEqual(classOf(size).sort())
      const sizes = groups.map((g) => g.length)
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    }
  })

  it('never makes more groups than students, nor more than 8, nor fewer than 2', () => {
    expect(makeGroups(classOf(3), 6)).toHaveLength(3)
    expect(makeGroups(classOf(40), 12)).toHaveLength(8)
    expect(makeGroups(classOf(10), 0)).toHaveLength(2)
    expect(makeGroups([], 4)).toEqual([[]])
  })

  it('splits differently from one time to the next', () => {
    const random = seeded(3)
    const a = makeGroups(classOf(28), 4, random)
    const b = makeGroups(classOf(28), 4, random)
    expect(a).not.toEqual(b)
  })
})

describe('Đồng hồ đếm ngược', () => {
  it('shows minutes and seconds, rounding up, never below zero', () => {
    expect(formatClock(300)).toBe('05:00')
    expect(formatClock(59.2)).toBe('01:00')
    expect(formatClock(0.4)).toBe('00:01')
    expect(formatClock(-3)).toBe('00:00')
    expect(formatClock(3723)).toBe('1:02:03')
  })

  it('counts from the end time, so a slow tab does not make it drift', () => {
    const endsAt = 1_000_000 + 90_000
    expect(secondsLeft(endsAt, 1_000_000)).toBe(90)
    expect(secondsLeft(endsAt, 1_000_000 + 89_500)).toBe(0.5)
    expect(secondsLeft(endsAt, endsAt + 5000)).toBe(0)
  })
})

describe('Xúc xắc', () => {
  it('rolls 1 to 3 dice with faces 1 to 6, all faces coming up', () => {
    const random = seeded(9)
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const roll = rollDice(2, random)
      expect(roll).toHaveLength(2)
      roll.forEach((face) => {
        expect(face).toBeGreaterThanOrEqual(1)
        expect(face).toBeLessThanOrEqual(6)
        seen.add(face)
      })
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6])
    expect(rollDice(9)).toHaveLength(3)
    expect(rollDice(0)).toHaveLength(1)
    expect(rollDice(1, () => 0.999999)).toEqual([6])
  })
})
