/** Most flowers a tree holds; a game with more questions plays the first ones. */
export const MAX_FLOWERS = 20

/** Rows of the canopy, top to bottom: how many flowers fit and how far they spread (fraction of the width). */
const ROWS = [
  { y: 0.16, count: 4, spread: 0.42 },
  { y: 0.37, count: 6, spread: 0.72 },
  { y: 0.58, count: 6, spread: 0.8 },
  { y: 0.78, count: 4, spread: 0.6 },
]

/**
 * Where the flowers hang in the canopy (fractions of its box), for `count` flowers: the middle rows fill first, and
 * each row is spread evenly.
 */
export function flowerSpots(count: number): { x: number; y: number }[] {
  const n = Math.min(Math.max(count, 0), MAX_FLOWERS)
  // Fill the wide middle rows first so a small tree still looks full.
  const order = [1, 2, 0, 3]
  const perRow = ROWS.map(() => 0)
  let left = n
  while (left > 0) {
    for (const r of order) {
      if (left > 0 && perRow[r] < ROWS[r].count) {
        perRow[r]++
        left--
      }
    }
  }
  return ROWS.flatMap((row, r) =>
    Array.from({ length: perRow[r] }, (_, i) => ({
      x: 0.5 - row.spread / 2 + (perRow[r] === 1 ? row.spread / 2 : (row.spread * i) / (perRow[r] - 1)),
      y: row.y,
    })),
  )
}
