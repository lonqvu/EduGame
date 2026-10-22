/** A segment of the wheel: points for the question, double the team's score, or the turn lost. */
export type WheelSegment = { label: string; kind: 'points'; points: number } | { label: string; kind: 'double' } | { label: string; kind: 'lose' }

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { label: '10', kind: 'points', points: 10 },
  { label: '20', kind: 'points', points: 20 },
  { label: 'Mất lượt', kind: 'lose' },
  { label: '30', kind: 'points', points: 30 },
  { label: '50', kind: 'points', points: 50 },
  { label: 'Nhân đôi', kind: 'double' },
  { label: '20', kind: 'points', points: 20 },
  { label: '100', kind: 'points', points: 100 },
]

/** Least a "Nhân đôi" is worth, so a team that has no points yet still gains something. */
export const MIN_DOUBLE = 20

/** Points a right answer earns after landing on `segment`, for a team that has `score`; 0 when the turn is lost. */
export function stakeOf(segment: WheelSegment, score: number): number {
  switch (segment.kind) {
    case 'points':
      return segment.points
    case 'double':
      return Math.max(score, MIN_DOUBLE)
    case 'lose':
      return 0
  }
}
