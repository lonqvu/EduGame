import i18n from 'i18next'
import { translatedLabels } from '@/i18n/labels'
import type { QuestionRequest } from '@/types/api'
import type { Rows } from '@/utils/classListFile'
import { fold } from '@/utils/classrooms'
import { OPTION_LETTERS } from '@/utils/gameItems'
import { draftProblem, draftToRequest, emptyDraft, MAX_OPTIONS, type QuestionDraft, trueFalseOptions } from '@/utils/questionSets'

/**
 * Questions from a file (Excel or CSV, read by readSheetFile), one per row, in the columns of the template
 * (public/assets/question-sets/mau-cau-hoi.xlsx):
 *
 *   Câu hỏi | Đáp án đúng | Đáp án sai 1 | Đáp án sai 2 | Đáp án sai 3 | Giải thích
 *
 * The kind follows what is filled, so there is no "type" column: wrong answers make a multiple choice question, the
 * right answer alone a short answer, "Đúng" or "Sai" alone a true / false one. Headers are matched loosely (case,
 * accents, any number of "Đáp án sai" columns); without a header the columns are taken in that order. Exam-style
 * files (options A, B, C, D and the right letter) are read too.
 */

export const MAX_EXPLANATION = 500
export const QUESTION_TEMPLATE = '/assets/question-sets/mau-cau-hoi.xlsx'

/** True / false is a multiple choice question with the options Đúng, Sai (in that order). */
export type ImportedKind = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'TRUE_FALSE'

export interface ImportedQuestion {
  /** 1-based row of the file */
  row: number
  question?: QuestionRequest
  kind?: ImportedKind
  problem?: string
}

/** Where things are in the sheet. */
interface Layout {
  /** Index of the header row; -1 without one. */
  headerRow: number
  text: number
  explanation?: number
  /** The right answer: its text, or a letter when `letters`. */
  correct: number
  /** Wrong answers, or every option (in order A, B, C...) when `letters`. */
  options: number[]
  /**
   * The right answers are letters (exam style); undefined when the columns are not named, and every right answer of
   * the file being a letter says so (named "Đáp án sai" columns hold answers, even "B").
   */
  letters?: boolean
}

const TRUE_FALSE: Record<string, number> = { dung: 0, d: 0, true: 0, sai: 1, s: 1, false: 1 }
const trueFalse = (cell: string) => TRUE_FALSE[fold(cell).replace(/[^a-z]/g, '')]

const header = (cell: string) => fold(cell).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const isText = (h: string) => /^(noi dung )?cau hoi\b/.test(h) || /^(noi dung|de bai|cau|question)$/.test(h)
const isExplanation = (h: string) => /^(giai thich|loi giai|explanation)\b/.test(h)
const isCorrect = (h: string) => /^(dap an|dap an dung|dap an chinh xac|dung|tra loi|cau tra loi|correct|answer)$/.test(h)
/** "A", "Phương án B", "Đáp án C": an option of an exam-style file; its letter. */
const optionLetter = (h: string) => /^(?:(?:phuong an|dap an|lua chon) )?([a-f])$/.exec(h)?.[1]
const isWrong = (h: string) => /\bsai\b|^(phuong an|dap an khac|lua chon)\b|wrong/.test(h)

/** A header row names the question column, or the right answer next to wrong answers or options. */
function isHeader(row: string[]): boolean {
  // Not "Đúng" / "Sai" alone: a true / false question of a file without a header has them in these columns.
  const names = row.map(header).filter((h) => !(h in TRUE_FALSE))
  return names.some(isText) || (names.some(isCorrect) && names.some((h) => isWrong(h) || !!optionLetter(h)))
}

/**
 * The header row (in the first rows; it and the title rows above it are skipped) and its columns; else the template's
 * order from the first row.
 */
function findLayout(rows: Rows): Layout {
  const at = rows.slice(0, 5).findIndex(isHeader)
  if (at >= 0) {
    const names = rows[at].map(header)
    const named = names.findIndex(isText)
    const text = named >= 0 ? named : 0
    const explanation = names.findIndex(isExplanation)
    const correct = names.findIndex((h, i) => i !== text && isCorrect(h))
    const lettered = names
      .map((h, i) => ({ letter: optionLetter(h), i }))
      .filter((o): o is { letter: string; i: number } => !!o.letter && o.i !== correct)
      .sort((a, b) => a.letter.localeCompare(b.letter))
    if (correct >= 0 && lettered.length >= 2) {
      return { headerRow: at, text, explanation: explanation >= 0 ? explanation : undefined, correct, options: lettered.map((o) => o.i), letters: true }
    }
    if (correct >= 0) {
      const options = names.flatMap((h, i) => (i !== text && i !== correct && i !== explanation && isWrong(h) ? [i] : []))
      return { headerRow: at, text, explanation: explanation >= 0 ? explanation : undefined, correct, options, letters: false }
    }
  }
  const width = Math.max(...rows.map((r) => r.length))
  const options = Array.from({ length: Math.max(0, width - 2) }, (_, i) => i + 2)
  return { headerRow: at, text: 0, correct: 1, options }
}

/** Every right answer of the file is a letter of one of its options: an exam-style file without headers. */
function allLetters(rows: Rows, layout: Layout): boolean {
  const data = rows.slice(layout.headerRow + 1).filter((r) => r[layout.text])
  return (
    data.length >= 2 &&
    data.every((r) => {
      const index = OPTION_LETTERS.indexOf((r[layout.correct] ?? '').toUpperCase())
      const filled = layout.options.filter((i) => r[i]).length
      return (r[layout.correct] ?? '').length === 1 && index >= 0 && index < filled
    })
  )
}

/** The questions of the file, row by row; empty rows are skipped, a row that cannot become a question says why. */
export function parseQuestionRows(rows: Rows): ImportedQuestion[] {
  const layout = findLayout(rows)
  const letters = layout.letters ?? allLetters(rows, layout)
  const result: ImportedQuestion[] = []
  rows.forEach((r, index) => {
    if (index <= layout.headerRow || !r.some(Boolean)) return
    const row = index + 1
    const cell = (i: number | undefined) => (i === undefined ? '' : (r[i] ?? '').trim())
    const text = cell(layout.text)
    const correct = cell(layout.correct)
    const options = layout.options.map(cell).filter(Boolean)
    const explanation = cell(layout.explanation)
    if (!text) return result.push({ row, problem: i18n.t('questionSets.import.noQuestion') })
    if (!correct) return result.push({ row, problem: i18n.t('questionSets.import.noCorrect') })
    if (explanation.length > MAX_EXPLANATION) return result.push({ row, problem: i18n.t('questionSets.import.explanationTooLong', { count: MAX_EXPLANATION }) })

    let draft: QuestionDraft
    let kind: ImportedKind
    const tf = trueFalse(correct)
    if (letters) {
      const byLetter = correct.length === 1 ? OPTION_LETTERS.indexOf(correct.toUpperCase()) : -1
      const right = byLetter >= 0 ? byLetter : options.findIndex((o) => fold(o) === fold(correct))
      if (right < 0 || right >= options.length) return result.push({ row, problem: i18n.t('questionSets.import.noMatch', { answer: correct }) })
      draft = { ...emptyDraft(), text, options, correctOption: right, explanation }
      kind = 'MULTIPLE_CHOICE'
    } else if (tf !== undefined && options.every((o) => trueFalse(o) !== undefined)) {
      draft = { ...emptyDraft(), text, options: trueFalseOptions(), correctOption: tf, explanation }
      kind = 'TRUE_FALSE'
    } else if (!options.length) {
      draft = { ...emptyDraft('SHORT_ANSWER'), text, answer: correct, explanation }
      kind = 'SHORT_ANSWER'
    } else {
      draft = { ...emptyDraft(), text, options: [correct, ...options], correctOption: 0, explanation }
      kind = 'MULTIPLE_CHOICE'
    }
    if (draft.type === 'MULTIPLE_CHOICE' && draft.options.length > MAX_OPTIONS) {
      return result.push({ row, problem: i18n.t('questionSets.add.tooManyOptions', { count: MAX_OPTIONS }) })
    }
    const problem = draftProblem(draft)
    result.push(problem ? { row, problem } : { row, kind, question: draftToRequest(draft) })
  })
  return result
}

export const KIND_LABELS = translatedLabels<ImportedKind>(['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'TRUE_FALSE'], (kind) => `questionSets.kinds.${kind}`)
