import { shuffle } from '@/game-engine/shared/shuffle'

/** Most stars on the board, lucky ones included. */
export const MAX_STARS = 25

/** A star of the board: the question it hides (index in the questions dealt), or a lucky star. */
export type StarCell = { kind: 'question'; question: number } | { kind: 'lucky' }

/**
 * The board of a round: one star per question and `lucky` lucky stars, placed at random; at most MAX_STARS stars
 * (lucky ones first, so a long quiz still has them).
 */
export function layStars(questionCount: number, lucky: number, random: () => number = Math.random): StarCell[] {
  const luckyCount = Math.min(Math.max(lucky, 0), MAX_STARS - 1, questionCount)
  const questions = Math.min(questionCount, MAX_STARS - luckyCount)
  const cells: StarCell[] = [
    ...Array.from({ length: questions }, (_, question) => ({ kind: 'question' as const, question })),
    ...Array.from({ length: luckyCount }, () => ({ kind: 'lucky' as const })),
  ]
  return shuffle(cells, random)
}
