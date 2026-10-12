import type { CrosswordRow } from '@/types/game'

/**
 * Cells of a crossword answer, as the board shows them: uppercase letters, spaces left out. Counted on NFC text,
 * like the backend, so "Ế" is one cell however it was typed.
 */
export const answerLetters = (answer: string): string[] => [...answer.normalize('NFC').toLocaleUpperCase('vi').replace(/\s+/g, '')]

/** The row can be played: a clue, an answer, and its key letter inside the answer. */
export const isPlayableRow = (row: Omit<CrosswordRow, 'id'>): row is Omit<CrosswordRow, 'id'> & { keyIndex: number } =>
  !!row.clue.trim() && row.keyIndex !== null && row.keyIndex >= 0 && row.keyIndex < answerLetters(row.answer).length

/** The keyword spelled by the key letters of the playable rows, in order. */
export const keywordOf = (rows: Omit<CrosswordRow, 'id'>[]): string =>
  rows.filter(isPlayableRow).map((r) => answerLetters(r.answer)[r.keyIndex]).join('')
