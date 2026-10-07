/** Rotation that brings the centre of segment `index` under the top pointer. */
export function rotationFor(index: number, count: number, current: number, extraTurns = 6): number {
  const seg = 360 / count
  const jitter = (Math.random() - 0.5) * seg * 0.6
  const target = -((index + 0.5) * seg + jitter)
  const delta = (((target - current) % 360) + 360) % 360
  return current + extraTurns * 360 + delta
}
