import { describe, expect, it } from 'vitest'
import { MIN_DOUBLE, stakeOf, WHEEL_SEGMENTS } from '@/game-engine/point-wheel/pointWheel'

describe('stakeOf', () => {
  it('is the points of the segment, the team score for "Nhân đôi", nothing for "Mất lượt"', () => {
    expect(stakeOf({ label: '50', kind: 'points', points: 50 }, 80)).toBe(50)
    expect(stakeOf({ label: 'Nhân đôi', kind: 'double' }, 80)).toBe(80)
    expect(stakeOf({ label: 'Nhân đôi', kind: 'double' }, 0)).toBe(MIN_DOUBLE)
    expect(stakeOf({ label: 'Mất lượt', kind: 'lose' }, 80)).toBe(0)
  })

  it('has one segment of each special kind on the wheel', () => {
    expect(WHEEL_SEGMENTS.filter((s) => s.kind === 'double')).toHaveLength(1)
    expect(WHEEL_SEGMENTS.filter((s) => s.kind === 'lose')).toHaveLength(1)
  })
})
