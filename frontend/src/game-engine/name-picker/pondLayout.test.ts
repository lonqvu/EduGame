import { describe, expect, it } from 'vitest'
import { MAX_FISH, pondLayout, randomSpot, WATER } from '@/game-engine/name-picker/pondLayout'

describe('pondLayout', () => {
  it('has one fish per student, up to the most the pond holds', () => {
    expect(pondLayout(7).spots).toHaveLength(7)
    expect(pondLayout(1).spots).toHaveLength(1)
    expect(pondLayout(80).spots).toHaveLength(MAX_FISH)
  })

  it('makes the fish smaller as the class grows', () => {
    const sizes = [5, 15, 30, 50].map((n) => pondLayout(n).fishW)
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes)
    expect(pondLayout(5).fishW).toBe(150)
    expect(pondLayout(50).fishW).toBeLessThan(80)
  })

  it('starts every fish in the water, each in a place of its own', () => {
    for (const n of [1, 7, 20, 35, 50]) {
      const { fishW, spots } = pondLayout(n)
      for (const s of spots) {
        expect(s.x).toBeGreaterThan(WATER.left - fishW / 2)
        expect(s.x).toBeLessThan(WATER.right + fishW / 2)
        expect(s.y).toBeGreaterThan(WATER.top)
        expect(s.y).toBeLessThan(WATER.bottom)
      }
      expect(new Set(spots.map((s) => `${s.x},${s.y}`)).size).toBe(n)
    }
  })
})

describe('randomSpot', () => {
  it('keeps the whole fish in the open water', () => {
    for (const r of [0, 0.5, 0.999]) {
      const s = randomSpot(100, 70, () => r)
      expect(s.x - 50).toBeGreaterThanOrEqual(WATER.left)
      expect(s.x + 50).toBeLessThanOrEqual(WATER.right)
      expect(s.y - 35).toBeGreaterThanOrEqual(WATER.top)
      expect(s.y + 35).toBeLessThanOrEqual(WATER.bottom)
    }
  })
})
