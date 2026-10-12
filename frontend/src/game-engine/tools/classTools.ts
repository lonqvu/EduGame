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
