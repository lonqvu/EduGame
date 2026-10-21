import { shuffle } from '@/game-engine/shared/shuffle'

/** Fewest / most groups the teacher can ask for. */
export const MIN_GROUPS = 2
export const MAX_GROUPS = 8

/**
 * Splits the class into `count` random groups whose sizes differ by at most one (students are shuffled, then dealt
 * round-robin). Never more groups than students.
 */
export function makeGroups<T>(students: readonly T[], count: number, random: () => number = Math.random): T[][] {
  const n = Math.max(1, Math.min(Math.round(count) || MIN_GROUPS, MAX_GROUPS, students.length))
  const groups: T[][] = Array.from({ length: n }, () => [])
  shuffle(students, random).forEach((student, i) => groups[i % n].push(student))
  return groups
}

/** "05:00", "1:02:03" for a countdown on the projector. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const two = (v: number) => String(v).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`
}

/** Longest countdown (2 hours). */
export const MAX_TIMER_SECONDS = 2 * 60 * 60

/** Seconds left of a running countdown that ends at `endsAt` (ms since epoch); computed from the clock, so it never drifts. */
export const secondsLeft = (endsAt: number, now: number) => Math.max(0, (endsAt - now) / 1000)

export const MAX_DICE = 3

/** `count` dice (1-3), each 1-6. */
export function rollDice(count: number, random: () => number = Math.random): number[] {
  const n = Math.max(1, Math.min(Math.round(count) || 1, MAX_DICE))
  return Array.from({ length: n }, () => 1 + Math.floor(random() * 6))
}

export type CoinSide = 'HEADS' | 'TAILS'

/** One toss of the coin. */
export const flipCoin = (random: () => number = Math.random): CoinSide => (random() < 0.5 ? 'HEADS' : 'TAILS')

/** Widest range of "Chọn số ngẫu nhiên". */
export const MAX_NUMBER = 999

/**
 * A number in [min, max] (bounds in either order). With `drawn` numbers to leave out (never twice), one of the others,
 * or null once every number of the range was drawn.
 */
export function drawNumber(min: number, max: number, drawn: readonly number[] = [], random: () => number = Math.random): number | null {
  const clamp = (n: number) => Math.min(MAX_NUMBER, Math.max(0, Math.round(n) || 0))
  const lo = Math.min(clamp(min), clamp(max))
  const hi = Math.max(clamp(min), clamp(max))
  const left: number[] = []
  const taken = new Set(drawn)
  for (let n = lo; n <= hi; n++) if (!taken.has(n)) left.push(n)
  return left.length ? left[Math.floor(random() * left.length)] : null
}

export type NoiseLevel = 'QUIET' | 'OK' | 'LOUD'

/**
 * A microphone reading (RMS of the samples, 0-1) on a 0-100 scale for the class to see: logarithmic, as ears hear,
 * from about -60 dBFS (a silent room) to 0 dBFS.
 */
export function noiseScore(rms: number): number {
  if (!(rms > 0)) return 0
  const db = 20 * Math.log10(rms)
  return Math.round(Math.min(100, Math.max(0, ((db + 60) / 60) * 100)))
}

/** How the class sounds against the teacher's `limit` (0-100): quiet well under it, loud over it. */
export const noiseLevel = (score: number, limit: number): NoiseLevel => (score > limit ? 'LOUD' : score > limit * 0.7 ? 'OK' : 'QUIET')

export const MIN_SCOREBOARD_TEAMS = 2
export const MAX_SCOREBOARD_TEAMS = 6
