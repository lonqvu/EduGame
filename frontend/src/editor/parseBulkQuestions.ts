import type { Question } from '@/types/game'

/**
 * Parses pasted text, one question per line, answer after "=":
 *   "Con gì kêu meo meo? = Con mèo"
 * A line ending with "= ?" keeps "?" as part of the question (e.g. "25 + 13 = ? = 38").
 */
export function parseBulkQuestions(text: string, points: number): Omit<Question, 'id'>[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const splitAt = line.lastIndexOf('=')
      if (splitAt < 0) return { text: line, answer: '', points }
      const answer = line.slice(splitAt + 1).trim()
      const question = line.slice(0, splitAt).trim()
      // "25 + 13 = ?" with no answer: the "=" belongs to the question.
      if (answer === '?') return { text: line, answer: '', points }
      return { text: question, answer, points }
    })
    .filter((q) => q.text.length > 0)
}
