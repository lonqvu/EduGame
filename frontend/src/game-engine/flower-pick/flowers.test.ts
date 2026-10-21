import { describe, expect, it } from 'vitest'
import { flowerSpots, MAX_FLOWERS } from '@/game-engine/flower-pick/flowers'

describe('flowerSpots', () => {
  it('places one spot per flower, all inside the canopy, none twice', () => {
    for (const n of [1, 3, 7, 12, MAX_FLOWERS, 40]) {
      const spots = flowerSpots(n)
      expect(spots).toHaveLength(Math.min(n, MAX_FLOWERS))
      expect(new Set(spots.map((s) => `${s.x.toFixed(3)},${s.y}`)).size).toBe(spots.length)
      for (const s of spots) {
        expect(s.x).toBeGreaterThan(0)
        expect(s.x).toBeLessThan(1)
      }
    }
  })
})
