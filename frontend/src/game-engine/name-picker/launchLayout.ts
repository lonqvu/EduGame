/** Most rockets on the launch field: one per student of a big class. */
export const MAX_ROCKETS = 50

/** The launch field: clear of the start / result panel on the left, under the moon, down to the ground. */
export const FIELD = { left: 490, right: 1255, top: 290, bottom: 715 }

/** A rocket on its pad is drawn in a 120 × 210 box (rocket above, pad below), scaled to fit its cell. */
export const UNIT_W = 120
export const UNIT_H = 210
/** The pad in the rocket's box: its top, where the rocket stands on it. */
export const PAD_TOP = 150
/** Room under each pad for the student's name, which keeps a readable size. */
const LABEL_H = 20

export interface LaunchPad {
  /** Centre of the pad. */
  x: number
  /** Top of the rocket's box on the stage. */
  top: number
}

export interface LaunchLayout {
  /** How much the rockets are scaled (1 for a handful, about 0.4 for 50). */
  scale: number
  /** Width a name label may take. */
  labelW: number
  /** Top of the moon's surface: high enough that the back row's pads stand on it. */
  ground: number
  pads: LaunchPad[]
}

/**
 * Where `count` rockets stand: the rows and columns that give them the biggest size, each row centred, the front row on
 * the ground. Pads are listed back row first, so the front rockets are drawn over the ones behind.
 */
export function launchLayout(count: number): LaunchLayout {
  const n = Math.max(1, Math.min(MAX_ROCKETS, Math.round(count)))
  const width = FIELD.right - FIELD.left
  const height = FIELD.bottom - FIELD.top
  let best = { cols: n, rows: 1, scale: 0 }
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    const scale = Math.min(1, width / cols / (UNIT_W + 6), (height / rows - LABEL_H) / UNIT_H)
    if (scale > best.scale) best = { cols, rows, scale }
  }
  const { cols, rows, scale } = best
  const cellW = width / cols
  const cellH = height / rows
  const pads: LaunchPad[] = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols)
    const inRow = row === rows - 1 ? n - row * cols : cols
    const col = i % cols
    const bottom = FIELD.top + cellH * (row + 1) - LABEL_H
    pads.push({
      x: Math.round(FIELD.left + width / 2 + (col - (inRow - 1) / 2) * cellW),
      top: Math.round(bottom - UNIT_H * scale),
    })
  }
  // The surface is a wide dome: its top sits well above the back row so the row's ends, lower on the curve, stand on it too.
  const backPads = pads[0].top + PAD_TOP * scale
  return { scale, labelW: Math.round(Math.min(130, cellW - 4)), ground: Math.round(Math.min(590, backPads - 48)), pads }
}
