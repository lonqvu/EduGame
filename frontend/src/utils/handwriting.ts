/**
 * "Phiếu luyện viết ô li": the rows of a handwriting sheet, on A4 pages ruled like a Vietnamese exercise book (vở ô
 * li): a thin line every li (2 mm in a real book), a bold one every 4 li (the edge of a big square), a column line
 * every big square, a red margin on the left.
 *
 * As the Ministry's letter models ask, letters stand on a bold line: small letters (a, o, m…) are 2 li tall, b, h, k,
 * l 5 li, and g, y 2 li above it and 3 li below. A writing row is 8 li, two big squares: from 5 li above its baseline
 * to 3 li below, so the baseline of every row is a bold line and rows follow each other without overlapping.
 * `size` picks how big a li is printed (small, medium, large).
 */

/** How big the li are: 1 small, 2 medium, 4 large. */
export type LetterSize = 1 | 2 | 4

/** How many rows each sample gets; 'page': rows until the page is full. */
export type RowsPerSample = 1 | 2 | 3 | 'page'

export type LetterStyle = 'cursive' | 'print'

export type RuleColor = 'purple' | 'grey'

export interface SheetOptions {
  size: LetterSize
  rowsPerSample: RowsPerSample
  /** Light copies to trace over after the sample. */
  trace: boolean
  /** Those copies as dashed outlines instead of light letters. */
  dashed: boolean
  /** "Họ và tên … Ngày …" at the top of the first page. */
  nameLine: boolean
  style: LetterStyle
  color: RuleColor
}

export const DEFAULT_SHEET: SheetOptions = {
  size: 2,
  rowsPerSample: 2,
  trace: true,
  dashed: false,
  nameLine: true,
  style: 'cursive',
  color: 'purple',
}

/** A4 at 96 px per inch. */
export const PAGE_WIDTH = 794
export const PAGE_HEIGHT = 1123
export const PAGE_MARGIN = 52
/** A li in px, by size. */
export const LI_PX: Record<LetterSize, number> = { 1: 5, 2: 7.5, 4: 11 }
/** Li in a writing row, and where its baseline is (a bold line). */
export const ROW_LI = 8
export const BASELINE_LI = 5
/** Ruling above the first row and below the last one, so the ruled area starts and ends on a bold line. */
export const RULE_ABOVE_LI = 3
export const RULE_BELOW_LI = 1
/** The writing starts after the red margin (one big square) and 1 li, and stops 1 li before the last column. */
export const WRITING_START_LI = 5
const WRITING_END_LI = 1
/** Room above the rows: the name line and the title on the first page, a small top on the others. */
export const FIRST_PAGE_HEAD = 76
export const OTHER_PAGE_HEAD = 16

/** One writing row: the bold sample at its start (first row of a sample), then light copies, then room to write. */
export interface SheetRow {
  text: string
  /** The sample, written dark at the start. */
  sample: boolean
  /** Light copies after it (or from the start, on the next rows of the sample). */
  copies: number
}

export interface SheetPage {
  rows: SheetRow[]
}

/** The samples typed, one a line: trimmed, empty lines dropped, at most 40. */
export function parseSamples(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .slice(0, 40)
}

/** Width of the writing area, a whole number of big squares (4 li). */
export function areaWidth(size: LetterSize): number {
  const square = LI_PX[size] * 4
  return Math.floor((PAGE_WIDTH - 2 * PAGE_MARGIN) / square) * square
}

/** Height of a writing row. */
export const rowHeight = (size: LetterSize) => LI_PX[size] * ROW_LI

/** Rows a page holds. */
export function rowsPerPage(size: LetterSize, first: boolean): number {
  const room = PAGE_HEIGHT - 2 * PAGE_MARGIN - (first ? FIRST_PAGE_HEAD : OTHER_PAGE_HEAD) - (RULE_ABOVE_LI + RULE_BELOW_LI) * LI_PX[size]
  return Math.max(1, Math.floor(room / rowHeight(size)))
}

/**
 * How many copies of a sample `width` px wide fit after `used` px of a row `rowWidth` wide, with a gap of one big
 * square between them; at least 1 when the row has room for none, so a long sentence is still written once.
 */
export function copiesThatFit(width: number, used: number, rowWidth: number, gap: number): number {
  if (width <= 0) return 0
  return Math.max(0, Math.floor((rowWidth - used + gap) / (width + gap)))
}

/**
 * The rows of every sample, laid out on pages. `measure` gives the width of a sample in px at this size (the page
 * measures it with the font). The first row of a sample has the sample then light copies to the end of the row; the
 * next ones have light copies on their first half, the rest left to write; without `trace` only the sample is written.
 */
export function layoutSheet(samples: string[], options: SheetOptions, measure: (text: string) => number): SheetPage[] {
  const width = areaWidth(options.size) - (WRITING_START_LI + WRITING_END_LI) * LI_PX[options.size]
  const gap = LI_PX[options.size] * 4
  const pages: SheetPage[] = []
  let page: SheetPage = { rows: [] }
  let room = rowsPerPage(options.size, true)
  const push = (row: SheetRow) => {
    if (room === 0) {
      pages.push(page)
      page = { rows: [] }
      room = rowsPerPage(options.size, false)
    }
    page.rows.push(row)
    room--
  }

  for (const text of samples) {
    const w = measure(text)
    const firstCopies = options.trace ? copiesThatFit(w, w + gap, width, gap) : 0
    const nextCopies = options.trace ? Math.max(1, Math.ceil(copiesThatFit(w, 0, width, gap) / 2)) : 0
    // "Cả trang": the sample's rows fill what is left of the page (a whole page when it starts one).
    const count = options.rowsPerSample === 'page' ? (room > 0 ? room : rowsPerPage(options.size, false)) : options.rowsPerSample
    for (let i = 0; i < count; i++) push(i === 0 ? { text, sample: true, copies: firstCopies } : { text, sample: false, copies: nextCopies })
  }
  if (page.rows.length > 0 || pages.length === 0) pages.push(page)
  return pages
}

/** A ruled line `k` li below the first row's top is bold when it is a baseline or a big square's edge. */
export const isBoldLine = (k: number) => (((k - BASELINE_LI) % 4) + 4) % 4 === 0
