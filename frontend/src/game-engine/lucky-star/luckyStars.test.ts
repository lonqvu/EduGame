import { describe, expect, it } from 'vitest'
import { layStars, MAX_STARS } from '@/game-engine/lucky-star/luckyStars'

describe('layStars', () => {
  it('has a star per question plus the lucky ones, every question once', () => {
    const cells = layStars(8, 3)
    expect(cells).toHaveLength(11)
    expect(cells.filter((c) => c.kind === 'lucky')).toHaveLength(3)
    const asked = cells.flatMap((c) => (c.kind === 'question' ? [c.question] : [])).sort((a, b) => a - b)
    expect(asked).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('keeps the board small enough, and never more lucky stars than questions', () => {
    expect(layStars(40, 3)).toHaveLength(MAX_STARS)
    expect(layStars(2, 5).filter((c) => c.kind === 'lucky')).toHaveLength(2)
    expect(layStars(5, 0).every((c) => c.kind === 'question')).toBe(true)
  })
})
