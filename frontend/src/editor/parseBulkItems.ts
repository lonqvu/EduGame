import { answerLetters } from '@/game-engine/crossword/letters'
import type { CrosswordRow, Draft, OrderSet, PairSet, QuizQuestion, SortSet } from '@/types/game'
import {
  localId,
  MAX_GROUPS,
  MAX_OPTIONS,
  MAX_ORDER_ENTRIES,
  MAX_PAIRS,
  MAX_SORT_CARDS,
  TRUE_FALSE_OPTIONS,
} from '@/utils/gameItems'

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

/**
 * Crossword rows, one per line: clue, "=", answer, with the keyword letter in brackets:
 *   "Thứ gì mọc ở đằng Đông? = MẶT T[R]ỜI"
 * Without brackets the row comes in without its key letter (the teacher picks it in the form).
 */
export function parseBulkCrossword(text: string): Draft<CrosswordRow>[] {
  return lines(text).flatMap((line): Draft<CrosswordRow>[] => {
    const [clue, raw] = splitAtLastEquals(line)
    if (!clue && !raw) return []
    const marked = /^(.*?)\[(.)\](.*)$/u.exec(raw)
    if (!marked) return [{ clue, answer: raw, keyIndex: null }]
    const [, before, key, after] = marked
    return [{ clue, answer: `${before}${key}${after}`, keyIndex: answerLetters(before).length }]
  })
}

/**
 * Orderings, one per line: the task, "=", then the cards in the right order split by "|":
 *   "Xếp từ bé đến lớn = 12 | 25 | 38"
 * A line with no "=" is only cards.
 */
export function parseBulkOrder(text: string): Draft<OrderSet>[] {
  return lines(text).flatMap((line): Draft<OrderSet>[] => {
    const [task, rest] = line.includes('=') ? splitAtLastEquals(line) : ['', line]
    const entries = rest
      .split('|')
      .map((e) => e.trim())
      .filter(Boolean)
      .slice(0, MAX_ORDER_ENTRIES)
      .map((e) => ({ id: localId('e'), text: e }))
    return entries.length ? [{ text: task, entries }] : []
  })
}

/**
 * Sortings, one block per set (blocks split by an empty line). In a block, each line is a group, "=", and its cards
 * split by ",": "Ăn cỏ = Bò, Dê, Ngựa". A first line without "=" is the task.
 */
export function parseBulkSort(text: string): Draft<SortSet>[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map(lines)
    .flatMap((block): Draft<SortSet>[] => {
      const task = block[0] && !block[0].includes('=') ? block[0] : ''
      const groups: SortSet['groups'] = []
      const cards: SortSet['cards'] = []
      for (const line of block.slice(task ? 1 : 0)) {
        const [name, rest] = splitAtLastEquals(line)
        if (!name || groups.length >= MAX_GROUPS) continue
        const group = { id: localId('g'), text: name }
        groups.push(group)
        for (const card of rest.split(',').map((c) => c.trim()).filter(Boolean)) {
          if (cards.length < MAX_SORT_CARDS) cards.push({ id: localId('c'), text: card, groupId: group.id })
        }
      }
      return groups.length >= 2 && cards.length ? [{ text: task, groups, cards }] : []
    })
}
