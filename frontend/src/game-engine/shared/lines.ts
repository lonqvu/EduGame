/** A run of cells owned by one team on a grid (row-major indexes). */
export interface Line {
  owner: string
  cells: number[]
}

/**
 * The first run of `length` cells in a row (across, down or diagonal) owned by the same team on a `rows`×`cols` grid,
 * or null.
 */
export function findLine(cells: readonly (string | null)[], rows: number, cols: number, length: number): Line | null {
  const at = (r: number, c: number) => (r >= 0 && r < rows && c >= 0 && c < cols ? cells[r * cols + c] : null)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const owner = at(r, c)
      if (!owner) continue
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ]) {
        const run = Array.from({ length }, (_, k) => [r + dr * k, c + dc * k] as const)
        if (run.every(([rr, cc]) => at(rr, cc) === owner)) return { owner, cells: run.map(([rr, cc]) => rr * cols + cc) }
      }
    }
  }
  return null
}

/** Row a disc dropped in column `col` lands on (the lowest free one), or -1 when the column is full. */
export function dropRow(cells: readonly (string | null)[], rows: number, cols: number, col: number): number {
  for (let r = rows - 1; r >= 0; r--) if (!cells[r * cols + col]) return r
  return -1
}
