import { describe, expect, it } from 'vitest'
import { FINISH_X, HORSE_H, HORSE_W, MAX_HORSES, raceLayout, TRACK } from '@/game-engine/name-picker/raceLayout'

describe('raceLayout', () => {
  it('has one horse per student, up to the most a race holds', () => {
    expect(raceLayout(5).spots).toHaveLength(5)
    expect(raceLayout(30).spots).toHaveLength(30)
    expect(raceLayout(80).spots).toHaveLength(MAX_HORSES)
  })

  it('keeps a small race at full size and makes horses smaller as the class grows', () => {
    expect(raceLayout(5).lanes).toBe(5)
    const scales = [5, 15, 30, 50].map((n) => raceLayout(n).scale)
    expect([...scales].sort((a, b) => b - a)).toEqual(scales)
  })

  it('lines every horse up on the track behind the start, none overlapping in its lane', () => {
    for (const n of [1, 5, 13, 30, 50]) {
      const { scale, spots } = raceLayout(n)
      const w = HORSE_W * scale
      for (const s of spots) {
        expect(s.left).toBeGreaterThanOrEqual(TRACK.startLeft)
        expect(s.left + w).toBeLessThanOrEqual(TRACK.startLeft + TRACK.startWidth + 1)
        expect(s.top + HORSE_H * scale).toBeLessThanOrEqual(TRACK.bottom)
        // A horse in the back lane may stand a little above the rail, as one behind another does.
        expect(s.top).toBeGreaterThanOrEqual(TRACK.top - HORSE_H * scale * 0.3)
      }
      const byLane = new Map<number, number[]>()
      for (const s of spots) byLane.set(s.lane, [...(byLane.get(s.lane) ?? []), s.left])
      for (const xs of byLane.values()) {
        xs.sort((a, b) => a - b)
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(w)
      }
    }
  })

  it('makes every horse run exactly to the finish line', () => {
    const { scale, spots } = raceLayout(30)
    for (const s of spots) expect(s.left + s.distance + HORSE_W * scale).toBeCloseTo(FINISH_X, -1)
  })
})
