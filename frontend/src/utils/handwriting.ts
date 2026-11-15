/**
 * "Phiếu luyện viết ô li": the rows of a handwriting sheet, on A4 pages ruled like a Vietnamese exercise book (vở ô
 * li): a thin line every li (2 mm in a real book), a bold one every 4 li (the edge of a big square), a column line
 * every big square, a red margin on the left.
 *
 * As the Ministry's letter models ask (upright cursive, even strokes, "cỡ vừa"), letters stand on a bold line: small
 * letters (a, o, m…) are 2 li tall, t 3 li, d, đ, p, q 4 li, b, h, k, l 5 li, and g, y 2 li above it and 3 li below. A writing row is 8 li, two big squares: from 5 li above its baseline
 * to 3 li below, so the baseline of every row is a bold line and rows follow each other without overlapping.
 * `size` picks how big a li is printed (small, medium, large).
 */

/** How big the li are: 1 small, 2 medium, 4 large. */
export type LetterSize = 1 | 2 | 4

/** How many rows each sample gets; 'page': rows until the page is full. */
export type RowsPerSample = 1 | 2 | 3 | 'page'

export type LetterStyle = 'cursive' | 'print'

/** The ruling colours of the usual school papers: purple, blue-green, pink-red, black. */
export type RuleColor = 'purple' | 'blue' | 'pink' | 'black'

/**
 * The paper the rows are ruled on, after the "mẫu giấy 4 ô li" schools hand out (Quyết định 31 sets the letter model,
 * not the paper). All of them have a line every li and a bold one every 4 li; they differ in their column lines:
 * - `standard` (4 ô li chuẩn): a column line every li, a bold one every big square;
 * - `columns` (4 ô li ngang): column lines only at the big squares, as in an exercise book;
 * - `dotted` (4 ô li nét chấm): like `standard`, the thin lines dotted so the letters stand out;
 * - `slanted` (4 ô li nghiêng): the column lines lean `SLANT_DEG` to the right, for slanted handwriting; the model
 *   letters lean with them.
 * The big and small papers ("4 ô li to", "4 ô li nhỏ") are the letter size.
 */
export type PaperKind = 'standard' | 'columns' | 'dotted' | 'slanted'

export const PAPER_KINDS: PaperKind[] = ['standard', 'columns', 'dotted', 'slanted']

export interface PaperRuling {
  /** Li between column lines. */
  columnLi: number
  /** Thin lines dotted. */
  dotted: boolean
  /** How far the column lines (and the letters) lean right, in degrees from upright. */
  slant: number
}

/** The slant of slanted handwriting: 15° from upright. */
export const SLANT_DEG = 15

export const PAPERS: Record<PaperKind, PaperRuling> = {
  standard: { columnLi: 1, dotted: false, slant: 0 },
  columns: { columnLi: 4, dotted: false, slant: 0 },
  dotted: { columnLi: 1, dotted: true, slant: 0 },
  slanted: { columnLi: 1, dotted: false, slant: SLANT_DEG },
}

/** A horizontal ruled line, `li` below the top of the first row; bold: a baseline or a big square's edge. */
export interface RuledLine {
  li: number
  weight: 'bold' | 'thin'
}

/** The horizontal lines of a page of `rows` rows: one every li, from a bold line above the first row to one below the last. */
export function horizontalLines(rows: number): RuledLine[] {
  const lines: RuledLine[] = []
  for (let k = -RULE_ABOVE_LI; k <= rows * ROW_LI + RULE_BELOW_LI; k++) lines.push({ li: k, weight: isBoldLine(k) ? 'bold' : 'thin' })
  return lines
}

/**
 * The column lines of a ruled area `width` × `height` px with li `li` px, as [x at the top, x at the bottom, bold]
 * from its left edge: every `columnLi` li, leaning `slant` degrees; slanted ones start left of the area so that its
 * bottom left corner is covered too (the page clips them to the area).
 */
export function columnLines(paper: PaperKind, width: number, height: number, li: number): [number, number, boolean][] {
  const { columnLi, slant } = PAPERS[paper]
  const shift = height * Math.tan((slant * Math.PI) / 180)
  const step = columnLi * li
  const out: [number, number, boolean][] = []
  for (let n = shift > 0 ? -Math.ceil(shift / step) : 0; n * step <= width + 0.5; n++) {
    const bottom = n * step
    out.push([bottom + shift, bottom, (((n * columnLi) % 4) + 4) % 4 === 0])
  }
  return out
}

export interface SheetOptions {
  paper: PaperKind
  /** A decorative frame around the page. */
  frame: boolean
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
  paper: 'standard',
  frame: false,
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

/**
 * The letter model's height unit H (the height of a, o, e…) in li of the ruling: 2 li, so the baseline, H (đường kẻ
 * 3), 1.5H, 2H, 2.5H and the 1.5H below fall on the ruled lines. A product choice, not a rule of the decision.
 */
export const H_LI = 2

/**
 * Heights of the letter model (Quyết định 31/2002/QĐ-BGD&ĐT, công văn 5150/TH), in H: above the baseline (`up`) and
 * below it (`down`). Small letters a, ă, â, e, ê, i, o, ô, ơ, u, ư, c, n, m, v, x are 1H; marks are not part of it.
 */
const LOWER_TARGETS: Record<string, { up?: number; down?: number }> = {
  r: { up: 1.25 },
  s: { up: 1.25 },
  t: { up: 1.5 },
  d: { up: 2 },
  [String.fromCharCode(0x111)]: { up: 2 }, // d with stroke
  p: { down: 1 },
  q: { down: 1 },
  b: { up: 2.5 },
  h: { up: 2.5 },
  k: { up: 2.5 },
  l: { up: 2.5 },
  g: { down: 1.5 },
  y: { down: 1.5 },
}
/** Capitals are 2.5H; G and Y go 1.5H further down (4H in all). Digits are 2H. */
export const CAPITAL_H = 2.5
export const CAPITAL_DOWN: Record<string, number> = { G: 1.5, Y: 1.5 }
export const DIGIT_H = 2
/** A tone mark (and a hat or breve) fits a square 0.5H high: each one gets the li above the letter. */
export const MARK_H = 0.5

/** Marks over a letter (grave, acute, hat, tilde, breve, hook, horn) and the dot under it, once decomposed. */
const MARKS_ABOVE = /[̛̀́̂̃̆̉]/g
const MARK_BELOW = /̣/

/** How far a glyph reaches above and below the baseline, in H. */
export interface GlyphReach {
  up: number
  down: number
}

/**
 * How a letter is drawn to the model's heights without changing its strokes: the part above H (`up`) is stretched or
 * squeezed toward the H line, the part below the baseline (`down`) toward the baseline; the body between them is left
 * as drawn. Digits are scaled as a whole (`uniform`), their shape having no H line.
 */
export interface ZoneScale {
  up: number
  down: number
  uniform: number
}

const NO_SCALE: ZoneScale = { up: 1, down: 1, uniform: 1 }

/**
 * The scales that bring `ch` to the model's heights, from what the font draws (`reach`, measured on the font, in H).
 * Letters with a set height (t, d, b, capitals…) are measured without their marks; marks over a small letter are kept
 * within one li each above H (0.5H), the dot under it within the li below the baseline.
 */
export function zoneScale(ch: string, reach: (s: string) => GlyphReach): ZoneScale {
  const parts = ch.normalize('NFD')
  const base = parts[0] ?? ''
  const marks = parts.slice(1)
  if (/[0-9]/.test(base)) {
    const r = reach(base)
    return r.up > 0 ? { ...NO_SCALE, uniform: DIGIT_H / r.up } : NO_SCALE
  }
  const capital = base !== base.toLowerCase()
  const target = capital ? { up: CAPITAL_H, down: CAPITAL_DOWN[base] } : LOWER_TARGETS[base]
  if (!capital && base === base.toUpperCase()) return NO_SCALE // not a letter
  let up = 1
  let down = 1
  if (target?.up) {
    const r = reach(base)
    if (r.up > 1.05) up = (target.up - 1) / (r.up - 1)
  } else {
    // A small letter: only its marks (the dot of i, the horn of ơ included) reach above H, one li each.
    const above = (marks.match(MARKS_ABOVE) ?? []).length + (base === 'i' || base === 'j' ? 1 : 0)
    const r = reach(ch)
    const cap = 1 + MARK_H * Math.max(1, above)
    if (r.up > cap) up = (cap - 1) / (r.up - 1)
  }
  if (target?.down) {
    const r = reach(base)
    if (r.down > 0.05) down = target.down / r.down
  } else if (MARK_BELOW.test(marks)) {
    const r = reach(ch)
    if (r.down > MARK_H) down = MARK_H / r.down
  }
  return { up, down, uniform: 1 }
}

/** The samples typed, one a line: trimmed, empty lines dropped, at most 40. Vietnamese letters composed (NFC). */
export function parseSamples(text: string): string[] {
  return text
    .normalize('NFC')
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
 * From the start of a copy to the start of the next: whole big squares, so every copy starts at the same place after a
 * column line (where the pen is put down in a vở tập viết), with at least 2 li (about one "o") of space after it.
 */
export function sampleStride(width: number, size: LetterSize): number {
  const li = LI_PX[size]
  return Math.max(1, Math.ceil((width + 2 * li) / (4 * li))) * 4 * li
}

/**
 * The rows of every sample, laid out on pages. `measure` gives the width of a sample in px at this size (the page
 * measures it with the font). The first row of a sample has the sample then light copies to the end of the row; the
 * next ones have light copies on their first half, the rest left to write; without `trace` only the sample is written.
 */
export function layoutSheet(samples: string[], options: SheetOptions, measure: (text: string) => number): SheetPage[] {
  const width = areaWidth(options.size) - (WRITING_START_LI + WRITING_END_LI) * LI_PX[options.size]
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
    // Copies start a whole number of big squares apart: the gap after each is what is left of its last square.
    const stride = sampleStride(w, options.size)
    const gap = stride - w
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
