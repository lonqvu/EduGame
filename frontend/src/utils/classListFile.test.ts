// Reads the spreadsheet fixtures from disk (tests run in Node).
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ClassListFileError,
  decodeText,
  detectNameColumns,
  extractNames,
  looksLikeName,
  parseCsv,
  readClassListFile,
  reviewNames,
  type Rows,
} from '@/utils/classListFile'

const fixture = (name: string) => new Blob([readFileSync(`src/utils/__fixtures__/class-lists/${name}`)])
const text = (s: string) => new Blob([new TextEncoder().encode(s)])

/** The names a file gives with the guessed columns. */
async function namesOf(file: Blob) {
  const rows = await readClassListFile(file)
  const detection = detectNameColumns(rows)
  return detection.choice ? extractNames(rows, detection.headerRow, detection.choice.columns) : []
}

describe('Excel files', () => {
  it('a school export: title rows, other columns, capitals, a blank row and a signed footer', async () => {
    const rows = await readClassListFile(fixture('vnedu.xlsx'))
    const detection = detectNameColumns(rows)
    expect(detection.headerRow).toBe(5)
    expect(detection.choice?.label).toBe('Cột C: Họ và tên')
    // Every used column can be picked instead.
    expect(detection.choices.map((c) => c.label)).toEqual([
      'Cột A: STT',
      'Cột B: Mã học sinh',
      'Cột C: Họ và tên',
      'Cột D: Ngày sinh',
      'Cột E: Giới tính',
    ])
    expect(extractNames(rows, detection.headerRow, detection.choice!.columns)).toEqual([
      { name: 'Nguyễn Minh Anh', row: 7 },
      { name: 'Trần Gia Huy', row: 8 },
      // "Tống" is a family name, not the footer's "Tổng số".
      { name: 'Tống Sơn Tùng', row: 9 },
      { name: 'Lê Bảo Ngọc', row: 10 },
      { name: 'Phạm Thu Hà', row: 12 },
    ])
  })

  it('"Họ đệm" and "Tên" in two columns are joined', async () => {
    const rows = await readClassListFile(fixture('split.xlsx'))
    const detection = detectNameColumns(rows)
    expect(detection.choice).toMatchObject({ label: 'Cột B + C: Họ đệm + Tên', columns: { first: 1, second: 2 } })
    expect(detection.choices[0]).toBe(detection.choice)
    expect((await namesOf(fixture('split.xlsx'))).map((n) => n.name)).toEqual(['Nguyễn Minh Anh', 'Trần Gia Huy', 'Võ An'])
  })

  it('without a header, the column that looks like names wins', async () => {
    const rows = await readClassListFile(fixture('no-header.xlsx'))
    const detection = detectNameColumns(rows)
    expect(detection.headerRow).toBe(-1)
    expect(detection.choice?.columns).toEqual({ first: 1 })
    expect((await namesOf(fixture('no-header.xlsx'))).map((n) => [n.name, n.row])).toEqual([
      ['Nguyễn Minh Anh', 1],
      ['Trần Gia Huy', 2],
      ['Lê Bảo Ngọc', 3],
    ])
  })

  it('the downloadable template reads back', async () => {
    const names = await namesOf(new Blob([readFileSync('public/assets/classes/mau-danh-sach-lop.xlsx')]))
    expect(names.map((n) => n.name)).toEqual(['Nguyễn Minh Anh', 'Trần Gia Huy', 'Lê Bảo Ngọc'])
  })
})

describe('files that cannot be read', () => {
  it('says what to do with an old .xls, a broken .xlsx, an empty or too big file', async () => {
    const xls = new Blob([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])])
    await expect(readClassListFile(xls)).rejects.toThrow(/\.xls.*\.xlsx/)
    await expect(readClassListFile(new Blob([new Uint8Array([0x50, 0x4b, 3, 4, 0, 0])]))).rejects.toThrow('Không đọc được file Excel')
    await expect(readClassListFile(text(' ;\n;;\n'))).rejects.toThrow('File không có dữ liệu.')
    await expect(readClassListFile(new Blob([new Uint8Array(2 * 1024 * 1024 + 1)]))).rejects.toThrow(ClassListFileError)
  })
})

describe('CSV files', () => {
  it('Excel on Vietnamese Windows: Windows-1258 and ";" between columns', async () => {
    // "STT;Họ và tên\r\n1;Lê Văn An" in Windows-1258 ("ọ" is "o" + a combining dot).
    const bytes = new Uint8Array([
      0x53, 0x54, 0x54, 0x3b, 0x48, 0x6f, 0xf2, 0x20, 0x76, 0xe0, 0x20, 0x74, 0xea, 0x6e, 0x0d, 0x0a, 0x31, 0x3b, 0x4c, 0xea,
      0x20, 0x56, 0xe3, 0x6e, 0x20, 0x41, 0x6e,
    ])
    expect((await namesOf(new Blob([bytes]))).map((n) => n.name)).toEqual(['Lê Văn An'])
  })

  it('UTF-8 with BOM, and UTF-16 ("Unicode Text") with tabs', async () => {
    expect((await namesOf(text('\uFEFFHọ và tên,Lớp\nNguyễn An,3A\n'))).map((n) => n.name)).toEqual(['Nguyễn An'])
    const utf16 = new Uint8Array([0xff, 0xfe, ...[...'Họ tên\tLớp\r\nTrần Bình\t3A'].flatMap((c) => [c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8])])
    expect(decodeText(utf16)).toBe('Họ tên\tLớp\r\nTrần Bình\t3A')
    expect((await namesOf(new Blob([utf16]))).map((n) => n.name)).toEqual(['Trần Bình'])
  })

  it('without a header, a column of full names beats a column of codes', () => {
    const rows = parseCsv('HS-A;Nguyễn An;Nam\nHS-B;Lê Bình;Nữ\n')
    expect(detectNameColumns(rows).choice?.label).toBe('Cột B: Nguyễn An')
  })

  it('quoted cells may hold the separator, quotes and line breaks', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\n"x\ny",z\r\n\nlast')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['x y', 'z'],
      [''],
      ['last'],
    ])
    expect(parseCsv('Họ và tên\nAn\nBình')).toEqual([['Họ và tên'], ['An'], ['Bình']])
  })
})

describe('names', () => {
  it('a name has letters and no digits', () => {
    for (const name of ['Nguyễn Văn An', "O'Neil", 'Hà-My', 'Lê Thị Thu Hà']) expect(looksLikeName(name), name).toBe(true)
    for (const notName of ['', 'A', '12', '3A', 'Nguyễn 2', '0123456789', '05/09/2026', 'a b c d e f g h']) {
      expect(looksLikeName(notName), notName).toBe(false)
    }
  })

  it('skips numbers and a repeated header, and stops at the footer', () => {
    const rows: Rows = [['STT', 'Họ và tên'], ['1', 'An'], ['2', '123'], ['', 'HỌ VÀ TÊN'], ['3', 'bình'], ['', 'Giáo viên chủ nhiệm'], ['', 'Cô Lan']]
    expect(extractNames(rows, 0, { first: 1 }).map((n) => n.name)).toEqual(['An', 'Bình'])
  })

  it('new names are ticked; names in the class, repeated or too long are not', () => {
    const reviewed = reviewNames(
      [
        { name: 'Nguyễn An', row: 2 },
        { name: 'Trần Bình', row: 3 },
        { name: 'nguyễn  an', row: 4 },
        { name: 'X'.repeat(51), row: 5 },
        { name: 'Lê Chi', row: 6 },
      ],
      ['TRẦN BÌNH'],
    )
    expect(reviewed.map((c) => [c.row, c.status, c.selected])).toEqual([
      [2, 'new', true],
      [3, 'in-class', false],
      [4, 'repeated', false],
      [5, 'too-long', false],
      [6, 'new', true],
    ])
  })
})
