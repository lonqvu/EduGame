/** Most fish in the pond: one per student of a big class. */
export const MAX_FISH = 50

/** The open water of the pond picture, clear of the dock (left) and the frog (top right). */
export const WATER = { left: 450, top: 385, right: 1180, bottom: 705 }

/** A fish picture is about 1.36 times as wide as it is high. */
const FISH_RATIO = 1.36
const MAX_FISH_W = 150
const MIN_FISH_W = 56

/** A place in the pond: where a fish starts, or where it swims to next. */
export interface FishSpot {
  x: number
  y: number
}

export interface PondLayout {
  fishW: number
  fishH: number
  /** Widest a name label may be, so names of neighbours do not overlap at the start. */
  labelW: number
  /** Swimming speed, in stage pixels a second (smaller fish swim a little slower). */
  speed: number
  /** Where each fish starts: spread over the open water, then it wanders anywhere in it. */
  spots: FishSpot[]
}

/**
 * How `count` fish fill the pond: their size (7 fish are big, 50 share the pond as smaller ones) and where each starts,
 * in rows over the open water, every other row shifted by a quarter cell.
 */
export function pondLayout(count: number): PondLayout {
  const n = Math.max(1, Math.min(MAX_FISH, Math.round(count)))
  const width = WATER.right - WATER.left
  const height = WATER.bottom - WATER.top
  const cols = Math.max(1, Math.round(Math.sqrt((n * width) / height / FISH_RATIO)))
  const rows = Math.ceil(n / cols)
  const cellW = width / cols
  const cellH = height / rows
  // Always some room left between neighbours.
  const fishW = Math.round(Math.min(cellW - 12, Math.max(MIN_FISH_W, Math.min(MAX_FISH_W, cellW * 0.72, cellH * 0.95 * FISH_RATIO))))
  const fishH = Math.round(fishW / FISH_RATIO)
  const spots: FishSpot[] = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    // The last row, when not full, is centred.
    const inRow = row === rows - 1 ? n - row * cols : cols
    const shift = inRow > 1 ? (row % 2 ? 0.25 : -0.25) : 0
    spots.push({
      x: Math.round(WATER.left + cellW * (col + 0.5 + (cols - inRow) / 2 + shift)),
      y: Math.round(WATER.top + cellH * (row + 0.5)),
    })
  }
  return { fishW, fishH, labelW: Math.round(Math.max(fishW, cellW - 6)), speed: Math.round(35 + fishW * 0.25), spots }
}

/** A random place in the open water where a fish of `w` × `h` fits. */
export function randomSpot(w: number, h: number, random: () => number = Math.random): FishSpot {
  return {
    x: Math.round(WATER.left + w / 2 + random() * (WATER.right - WATER.left - w)),
    y: Math.round(WATER.top + h / 2 + random() * (WATER.bottom - WATER.top - h)),
  }
}
