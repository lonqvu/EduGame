/** Most horses in a race: one per student of a big class. */
export const MAX_HORSES = 50

/** The track between its two white rails, and where the horses line up behind the start. */
export const TRACK = { top: 176, bottom: 586, startLeft: 30, startWidth: 390 }
/** A horse is drawn in a 112 × 96 box, scaled to fit. */
export const HORSE_W = 112
export const HORSE_H = 96
/** The finish line: the winner's nose crosses it at the end of the race. */
export const FINISH_X = 1128
const MAX_LANES = 12
/** A horse may stand a little taller than its lane: the one behind is partly hidden, as in a real field. */
const LANE_OVERLAP = 1.15

export interface HorseSpot {
  /** Where the horse's box starts (stage pixels) and how far it runs to put its nose on the finish line. */
  left: number
  top: number
  distance: number
  lane: number
}

export interface RaceLayout {
  scale: number
  lanes: number
  spots: HorseSpot[]
}

/**
 * Where `count` horses line up: the number of lanes that gives the biggest horses, the horses dealt to the lanes in
 * turn, so a big class lines up a few deep behind the start.
 */
export function raceLayout(count: number): RaceLayout {
  const n = Math.max(1, Math.min(MAX_HORSES, Math.round(count)))
  const height = TRACK.bottom - TRACK.top
  const options = Array.from({ length: Math.min(n, MAX_LANES) }, (_, k) => {
    const lanes = k + 1
    const deep = Math.ceil(n / lanes)
    return { lanes, deep, scale: Math.min(1, ((height / lanes) * LANE_OVERLAP) / HORSE_H, (TRACK.startWidth / deep - 6) / HORSE_W) }
  })
  // Nearly as big with fewer horses one behind the other is better: each one's run is easier to follow.
  const biggest = Math.max(...options.map((o) => o.scale))
  const { lanes, scale } = options.filter((o) => o.scale >= biggest * 0.9).sort((a, b) => a.deep - b.deep || b.scale - a.scale)[0]
  const laneH = height / lanes
  const deep = Math.ceil(n / lanes)
  const step = HORSE_W * scale + 6
  const spots: HorseSpot[] = Array.from({ length: n }, (_, i) => {
    const lane = i % lanes
    // Row 0 is at the start line, the next ones behind it.
    const row = Math.floor(i / lanes)
    const left = Math.round(TRACK.startLeft + (deep - 1 - row) * step)
    return {
      left,
      top: Math.round(TRACK.top + laneH * (lane + 1) - HORSE_H * scale - 4),
      distance: Math.round(FINISH_X - HORSE_W * scale - left),
      lane,
    }
  })
  return { scale, lanes, spots }
}
