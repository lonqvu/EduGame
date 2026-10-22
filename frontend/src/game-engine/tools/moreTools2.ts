import { shuffle } from '@/game-engine/shared/shuffle'

/** "01:23.4" (or "1:01:23.4" past an hour) for the stopwatch. */
export function formatStopwatch(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100)
  const h = Math.floor(tenths / 36000)
  const m = Math.floor((tenths % 36000) / 600)
  const s = Math.floor((tenths % 600) / 10)
  const two = (v: number) => String(v).padStart(2, '0')
  return `${h > 0 ? `${h}:${two(m)}` : two(m)}:${two(s)}.${tenths % 10}`
}

/** Most cards of "Bốc thăm". */
export const MAX_CARDS = 60

/** The cards of "Bốc thăm" from the teacher's text: one per line, blank lines and repeats left out. */
export function parseCards(text: string): string[] {
  const seen = new Set<string>()
  const cards: string[] = []
  for (const line of text.split('\n')) {
    const card = line.trim().replace(/\s+/g, ' ')
    const key = card.toLocaleLowerCase('vi')
    if (!card || seen.has(key)) continue
    seen.add(key)
    cards.push(card.slice(0, 80))
    if (cards.length >= MAX_CARDS) break
  }
  return cards
}

/** One card not drawn yet, or null when every card was. */
export function drawCard(cards: string[], drawn: readonly string[], random: () => number = Math.random): string | null {
  const left = cards.filter((c) => !drawn.includes(c))
  return left.length ? left[Math.floor(random() * left.length)] : null
}

/** Seats per row of the classroom plan. */
export const SEAT_COLUMNS = [4, 6, 8] as const

/** The class in a random order: seat i of the plan (rows of `columns` seats, from the board) is `plan[i]`. */
export const arrangeSeats = <T>(students: readonly T[], random: () => number = Math.random): T[] => shuffle(students, random)

/** The plan with the students of seats `a` and `b` swapped. */
export function swapSeats<T>(plan: readonly T[], a: number, b: number): T[] {
  const next = [...plan]
  if (a < 0 || b < 0 || a >= next.length || b >= next.length) return next
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}
