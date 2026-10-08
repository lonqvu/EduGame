import type { Draft, PairSet, QuizQuestion } from '@/types/game'
import { localId, MAX_OPTIONS, MAX_PAIRS, TRUE_FALSE_OPTIONS } from '@/utils/gameItems'

const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

/** Splits "left = right" at the last "=" (so "5 + 3 = 8" keeps "5 + 3" on the left); no "=" means no right side. */
function splitAtLastEquals(line: string): [string, string] {
  const at = line.lastIndexOf('=')
  if (at < 0) return [line, '']
  return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
}

const TRUE_WORDS = ['đúng', 'd', 'đ', 'true']
const FALSE_WORDS = ['sai', 's', 'false']

/**
 * Quiz questions, one per line: question, "=", then the right answer first and the wrong ones after "|":
 *   "Thủ đô của Việt Nam? = Hà Nội | Huế | Đà Nẵng"
 * A single answer "Đúng" or "Sai" makes a true / false question: "Mặt trời mọc ở đằng Đông = Đúng".
 * The projector shuffles the options, so the right one does not stay first.
 */
export function parseBulkQuiz(text: string): Draft<QuizQuestion>[] {
  return lines(text).flatMap((line): Draft<QuizQuestion>[] => {
    let [question, rest] = splitAtLastEquals(line)
    // "25 + 13 = ?" with no answers: the "=" belongs to the question.
    if (rest === '?') [question, rest] = [line, '']
    if (!question) return []
    const answers = rest
      .split('|')
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, MAX_OPTIONS)

    const single = answers.length === 1 ? answers[0].toLowerCase() : null
    if (single && (TRUE_WORDS.includes(single) || FALSE_WORDS.includes(single))) {
      return [{
        trueFalse: true,
        text: question,
        options: TRUE_FALSE_OPTIONS.map((o) => ({ ...o })),
        correctId: TRUE_WORDS.includes(single) ? 'true' : 'false',
      }]
    }

    const texts = answers.length >= 2 ? answers : [...answers, '', '', ''].slice(0, 4)
    const options = texts.map((t, i) => ({ id: 'abcdef'[i], text: t }))
    return [{ trueFalse: false, text: question, options, correctId: answers.length ? 'a' : null }]
  })
}

/**
 * Pairs, one per line, the two sides split by "=": "Hà Nội = Hồ Gươm". Lines are grouped into sets of at most
 * {@link MAX_PAIRS} pairs (one set = one round on the projector).
 */
export function parseBulkPairs(text: string): Draft<PairSet>[] {
  const pairs = lines(text)
    .map(splitAtLastEquals)
    .filter(([a, b]) => a || b)
    .map(([a, b]) => ({ id: localId('p'), a, b }))
  const sets: Draft<PairSet>[] = []
  for (let i = 0; i < pairs.length; i += MAX_PAIRS) sets.push({ pairs: pairs.slice(i, i + MAX_PAIRS) })
  return sets
}
