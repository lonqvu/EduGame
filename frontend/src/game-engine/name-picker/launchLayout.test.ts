import { describe, expect, it } from 'vitest'
import { FIELD, launchLayout, MAX_ROCKETS, PAD_TOP, UNIT_H, UNIT_W } from '@/game-engine/name-picker/launchLayout'

describe('launchLayout', () => {
  it('has one rocket per student, up to the most the field holds', () => {
    expect(launchLayout(4).pads).toHaveLength(4)
    expect(launchLayout(30).pads).toHaveLength(30)
    expect(launchLayout(90).pads).toHaveLength(MAX_ROCKETS)
  })

  it('keeps a handful at full size and makes them smaller as the class grows', () => {
    expect(launchLayout(4).scale).toBe(1)
    const scales = [4, 12, 30, 50].map((n) => launchLayout(n).scale)
    expect([...scales].sort((a, b) => b - a)).toEqual(scales)
  })

  it('keeps every rocket on the field, none overlapping its neighbour', () => {
    for (const n of [1, 4, 13, 30, 50]) {
      const { scale, pads } = launchLayout(n)
      const w = UNIT_W * scale
      for (const p of pads) {
        expect(p.x - w / 2).toBeGreaterThanOrEqual(FIELD.left - 1)
        expect(p.x + w / 2).toBeLessThanOrEqual(FIELD.right + 1)
        expect(p.top).toBeGreaterThanOrEqual(FIELD.top - 1)
        expect(p.top + UNIT_H * scale).toBeLessThanOrEqual(FIELD.bottom)
      }
      const rows = new Map<number, number[]>()
      for (const p of pads) rows.set(p.top, [...(rows.get(p.top) ?? []), p.x])
      for (const xs of rows.values()) {
        xs.sort((a, b) => a - b)
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(w)
      }
    }
  })
})

describe('launchLayout ground', () => {
  it('raises the moon surface under the back row, so no pad hangs in the sky', () => {
    for (const n of [4, 13, 30, 50]) {
      const { ground, scale, pads } = launchLayout(n)
      for (const p of pads) expect(p.top + PAD_TOP * scale).toBeGreaterThan(ground + 40)
    }
    expect(launchLayout(50).ground).toBeLessThan(launchLayout(4).ground)
  })
})
