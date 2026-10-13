import { fold, MAX_NAME_LENGTH } from '@/utils/classrooms'

/**
 * Reading a class list from a file: Excel (.xlsx) or CSV, as exported by school software (vnEdu, SMAS...) or typed
 * by the teacher. Only the students' names are kept.
 *
 * Real files are messy: title rows above the table, "Họ đệm" and "Tên" in two columns, a footer ("Tổng số…",
 * signatures), names in capitals, CSV saved by Excel on Windows (Windows-1258, ";" between columns). The functions
 * here find the names anyway, and say why when they cannot.
 */

/** A sheet as text: rows of cells. */
export type Rows = string[][]

export const MAX_FILE_BYTES = 2 * 1024 * 1024

/** A problem with the file itself, said to the teacher. */
export class ClassListFileError extends Error {}

const ZIP = [0x50, 0x4b] // .xlsx is a zip archive
const OLE = [0xd0, 0xcf, 0x11, 0xe0] // old .xls
const startsWith = (bytes: Uint8Array, magic: number[]) => magic.every((b, i) => bytes[i] === b)

/** The rows of the file's first sheet (or of the CSV), every cell as trimmed text; rows keep their place. */
export async function readClassListFile(file: Blob): Promise<Rows> {
  if (file.size > MAX_FILE_BYTES) throw new ClassListFileError('File lớn quá (tối đa 2 MB). Cô chọn file danh sách lớp nhé.')
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  if (startsWith(bytes, OLE)) {
    throw new ClassListFileError('Đây là file Excel đời cũ (.xls). Cô mở file, chọn Lưu thành (Save As) dạng .xlsx rồi chọn lại nhé.')
  }
  let rows: Rows
  if (startsWith(bytes, ZIP)) {
    try {
      // Loaded only when a teacher imports a file, so the app stays light.
      const { readSheet } = await import('read-excel-file/universal')
      rows = (await readSheet(buffer)).map((row) => row.map(cellText))
    } catch {
      throw new ClassListFileError('Không đọc được file Excel này. Cô kiểm tra lại file (.xlsx) nhé.')
    }
  } else {
    rows = parseCsv(decodeText(bytes))
  }
  // Empty rows stay: the preview tells the teacher which row of the file each name comes from.
  if (!rows.some((row) => row.some(Boolean))) throw new ClassListFileError('File không có dữ liệu.')
  return rows
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toLocaleDateString('vi-VN')
  return String(value).replace(/\s+/g, ' ').trim()
}

/**
 * Text of a CSV file: UTF-8 (with or without BOM), UTF-16 (Excel "Unicode Text"), else Windows-1258 (Excel's CSV on
 * Vietnamese Windows).
 */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  const body = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body)
  } catch {
    return new TextDecoder('windows-1258').decode(body)
  }
}

/**
 * CSV rows (RFC 4180: quoted cells may hold the separator, line breaks and doubled quotes). The separator is the one
 * of ";", "," or tab found most in the first lines.
 */
export function parseCsv(text: string): Rows {
  const separator = guessSeparator(text)
  const rows: Rows = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (ch === separator) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((c) => c.replace(/\s+/g, ' ').trim()))
}

function guessSeparator(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 10).join('\n').replace(/"[^"]*"/g, '')
  const counts = [';', ',', '\t'].map((s) => [s, sample.split(s).length - 1] as const)
  const [best, count] = counts.reduce((a, b) => (b[1] > a[1] ? b : a))
  return count > 0 ? best : ','
}

// --- Finding the names ----------------------------------------------------------------------------------------

/** Where the names are: one column, or "Họ đệm" + "Tên" in two. */
export interface NameColumns {
  first: number
  second?: number
}

export interface ColumnChoice {
  key: string
  /** "Cột C: Họ và tên" */
  label: string
  columns: NameColumns
}

export interface Detection {
  /** Index of the header row, -1 when the file has none */
  headerRow: number
  /** Columns the teacher can pick */
  choices: ColumnChoice[]
  /** The guess, if any */
  choice: ColumnChoice | null
}

const FULL_NAME_HEADERS = ['ho va ten', 'ho ten', 'hoten', 'hovaten', 'ten hoc sinh', 'ho va ten hoc sinh', 'ho ten hoc sinh', 'full name', 'name', 'student name', 'student']
const FAMILY_HEADERS = ['ho dem', 'ho va ten dem', 'ho va dem', 'ho lot', 'ho va lot', 'ho', 'last name']
const GIVEN_HEADERS = ['ten', 'first name']
/**
 * Rows that end the table: "Tổng số…", "Người lập biểu", signatures. Whole words only: "Tống" is a family name. Lines
 * with digits ("Hà Nội, ngày 5 tháng 9…") are skipped anyway, as no name has digits.
 */
const FOOTER_STARTS = ['tong so', 'tong cong', 'nguoi lap', 'hieu truong', 'giao vien', 'xac nhan', 'ky ten', 'ky ghi ro']
const isFooter = (key: string) => FOOTER_STARTS.some((f) => key === f || key.startsWith(`${f} `))

const headerKey = (text: string) => fold(text).replace(/[^a-z& ]+/g, ' ').replace(/\s+/g, ' ').trim()
const columnLetter = (index: number) =>
  index < 26 ? String.fromCharCode(65 + index) : String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26))

/** A name has letters, no digits, and a few words. */
export function looksLikeName(text: string): boolean {
  const value = text.trim()
  if (value.length < 2 || /\d/.test(value) || !/\p{L}/u.test(value)) return false
  const words = value.split(/\s+/)
  return words.length <= 7 && words.every((w) => /^[\p{L}'’.-]+$/u.test(w))
}

/**
 * Finds the header row (in the first 15 rows) and the name column(s) under it. Without a header, the column whose
 * cells look most like names wins.
 */
export function detectNameColumns(rows: Rows): Detection {
  const width = Math.max(0, ...rows.map((r) => r.length))
  const headerRow = rows.slice(0, 15).findIndex((row) => row.some((cell) => isNameHeader(headerKey(cell))))
  const dataRows = headerRow >= 0 ? rows.slice(headerRow + 1) : rows

  const used = Array.from({ length: width }, (_, c) => c).filter((c) => dataRows.some((row) => row[c]))
  const choices: ColumnChoice[] = used.map((c) => {
    const title = headerRow >= 0 && rows[headerRow][c] ? rows[headerRow][c] : (dataRows.find((row) => row[c])?.[c] ?? '')
    return { key: String(c), label: `Cột ${columnLetter(c)}: ${title}`, columns: { first: c } }
  })

  let choice: ColumnChoice | null = null
  if (headerRow >= 0) {
    const keys = rows[headerRow].map(headerKey)
    const full = keys.findIndex((k) => FULL_NAME_HEADERS.includes(k) || k.startsWith('ho va ten') || k.startsWith('ho ten'))
    const family = keys.findIndex((k) => FAMILY_HEADERS.includes(k))
    const given = keys.findIndex((k) => GIVEN_HEADERS.includes(k))
    if (family >= 0 && given >= 0 && full < 0) {
      const split: ColumnChoice = {
        key: `${family}+${given}`,
        label: `Cột ${columnLetter(family)} + ${columnLetter(given)}: ${rows[headerRow][family]} + ${rows[headerRow][given]}`,
        columns: { first: family, second: given },
      }
      choices.unshift(split)
      choice = split
    } else if (full >= 0) {
      choice = choices.find((c) => c.columns.first === full) ?? null
    }
  }
  if (!choice) {
    const scored = choices
      .map((c) => {
        const cells = dataRows.map((row) => row[c.columns.first] ?? '').filter(Boolean)
        const share = (test: (cell: string) => boolean) => (cells.length ? cells.filter(test).length / cells.length : 0)
        // Names usually have two words or more: that settles ties with codes such as "HS-A".
        return { c, score: share(looksLikeName) + 0.1 * share((cell) => looksLikeName(cell) && cell.includes(' ')) }
      })
      .sort((a, b) => b.score - a.score)
    if (scored[0]?.score >= 0.5) choice = scored[0].c
  }
  return { headerRow, choices, choice }
}

function isNameHeader(key: string) {
  return (
    FULL_NAME_HEADERS.includes(key) || key.startsWith('ho va ten') || key.startsWith('ho ten') || FAMILY_HEADERS.slice(0, 5).includes(key)
  )
}

export interface ImportedName {
  name: string
  /** 1-based row in the file, to tell the teacher where it came from */
  row: number
}

/**
 * The names under the header in these columns, in file order. Empty rows, numbers, a repeated header and the footer
 * are skipped. Names in all capitals (or all small letters) are written the usual way: "NGUYỄN VĂN AN" → "Nguyễn Văn An".
 */
export function extractNames(rows: Rows, headerRow: number, columns: NameColumns): ImportedName[] {
  const names: ImportedName[] = []
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r]
    const value = [row[columns.first], columns.second === undefined ? '' : row[columns.second]]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!value) continue
    const key = headerKey(value)
    if (isFooter(key)) break
    if (isNameHeader(key) || !looksLikeName(value)) continue
    names.push({ name: tidyCase(value), row: r + 1 })
  }
  return names
}

function tidyCase(name: string): string {
  const letters = name.replace(/[^\p{L}]/gu, '')
  if (letters !== letters.toLocaleUpperCase('vi') && letters !== letters.toLocaleLowerCase('vi')) return name
  return name
    .toLocaleLowerCase('vi')
    .split(' ')
    .map((w) => w.charAt(0).toLocaleUpperCase('vi') + w.slice(1))
    .join(' ')
}

// --- Choosing who to add --------------------------------------------------------------------------------------

export type CandidateStatus = 'new' | 'in-class' | 'repeated' | 'too-long'

export interface Candidate extends ImportedName {
  status: CandidateStatus
  /** Ticked at first: new names only */
  selected: boolean
}

export const STATUS_NOTES: Record<Exclude<CandidateStatus, 'new'>, string> = {
  'in-class': 'Đã có trong lớp',
  repeated: 'Trùng tên ở dòng trên',
  'too-long': `Dài quá ${MAX_NAME_LENGTH} ký tự`,
}

/**
 * Each name of the file with what to do: new names are ticked; names already in the class or repeated in the file
 * are not (the teacher may still tick them: two pupils can share a name); names too long cannot be added.
 */
export function reviewNames(names: ImportedName[], inClass: string[]): Candidate[] {
  const nameKey = (name: string) => fold(name).replace(/\s+/g, ' ').trim()
  const existing = new Set(inClass.map(nameKey))
  const seen = new Set<string>()
  return names.map((n) => {
    const key = nameKey(n.name)
    const status: CandidateStatus =
      n.name.length > MAX_NAME_LENGTH ? 'too-long' : existing.has(key) ? 'in-class' : seen.has(key) ? 'repeated' : 'new'
    seen.add(key)
    return { ...n, status, selected: status === 'new' }
  })
}
