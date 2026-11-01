/** Stretches of a race: each horse runs each one at its own speed, so the lead changes along the way. */
export const RACE_STRETCHES = 10

/** Slowest and fastest stretch, relative to a horse's average pace. */
const MIN_PACE = 0.3
const MAX_PACE = 1.7

/**
 * Where each horse is at the end of every stretch (from 0): `winner` crosses `winX` at the very end, the others stop
 * 30 to 290 short of it. Paces are random on every stretch; half of the races the winner starts slow and comes back
 * on the last stretches, the others it may lead from the start, so who wins cannot be guessed early.
 */
export function horseRacePlan(count: number, winner: number, winX: number, random: () => number = Math.random): number[][] {
  const comeback = random() < 0.5
  return Array.from({ length: count }, (_, lane) => {
    const paces = Array.from({ length: RACE_STRETCHES }, (_, i) => {
      const pace = MIN_PACE + random() * (MAX_PACE - MIN_PACE)
      if (lane !== winner || !comeback) return pace
      return i < RACE_STRETCHES / 2 ? pace * 0.75 : i >= RACE_STRETCHES - 3 ? pace * 1.5 : pace
    })
    const total = paces.reduce((a, b) => a + b, 0)
    const finish = lane === winner ? winX : winX - 30 - Math.round(random() * 260)
    const xs = [0]
    for (const pace of paces) xs.push(xs[xs.length - 1] + (pace / total) * finish)
    xs[xs.length - 1] = finish
    return xs.map((x) => Math.round(x))
  })
}
