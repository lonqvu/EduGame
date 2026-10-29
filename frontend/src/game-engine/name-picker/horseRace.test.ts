import { describe, expect, it } from 'vitest'
import { horseRacePlan, RACE_STRETCHES } from '@/game-engine/name-picker/horseRace'

/** A seeded random, so a failing race can be replayed. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('horse race plan', () => {
  it('the winner crosses the line last of all moments, the others stop short of it, nobody goes back', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const plan = horseRacePlan(5, seed % 5, 960, seeded(seed))
      expect(plan).toHaveLength(5)
      plan.forEach((xs, lane) => {
        expect(xs).toHaveLength(RACE_STRETCHES + 1)
        expect(xs[0]).toBe(0)
        for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1])
        if (lane === seed % 5) expect(xs.at(-1)).toBe(960)
        else expect(xs.at(-1)).toBeLessThanOrEqual(930)
        // Only the winner reaches the line, and only at the end.
        expect(Math.max(...xs.slice(0, -1))).toBeLessThan(960)
      })
    }
  })

  it('the winner is not always ahead halfway: the lead changes', () => {
    let behindHalfway = 0
    for (let seed = 1; seed <= 200; seed++) {
      const plan = horseRacePlan(5, 0, 960, seeded(seed))
      const half = RACE_STRETCHES / 2
      if (plan.some((xs, lane) => lane !== 0 && xs[half] > plan[0][half])) behindHalfway++
    }
    expect(behindHalfway).toBeGreaterThan(100)
  })
})
