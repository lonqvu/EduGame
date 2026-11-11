import { describe, expect, it } from 'vitest'
import {
  areaWidth,
  copiesThatFit,
  DEFAULT_SHEET,
  layoutSheet,
  LI_PX,
  PAGE_MARGIN,
  PAGE_WIDTH,
  parseSamples,
  rowsPerPage,
} from '@/utils/handwriting'

/** Every letter 20 px wide. */
const measure = (text: string) => text.length * 20

describe('handwriting sheet', () => {
  it('takes one sample a line, trimmed, without empty lines', () => {
    expect(parseSamples(' b \n\n  bé  \nMẹ   đi  chợ\n')).toEqual(['b', 'bé', 'Mẹ đi chợ'])
    expect(parseSamples(Array.from({ length: 60 }, () => 'a').join('\n'))).toHaveLength(40)
  })

  it('rules whole big squares inside the margins', () => {
    for (const size of [1, 2, 4] as const) {
      const w = areaWidth(size)
      expect(w % (LI_PX[size] * 4)).toBeCloseTo(0)
      expect(w).toBeLessThanOrEqual(PAGE_WIDTH - 2 * PAGE_MARGIN)
    }
  })

  it('fits copies with a gap between them, none when there is no room', () => {
    expect(copiesThatFit(40, 0, 200, 20)).toBe(3) // 40 + 20 + 40 + 20 + 40 = 160 ≤ 200; a 4th makes 220
    expect(copiesThatFit(40, 190, 200, 20)).toBe(0)
    expect(copiesThatFit(0, 0, 200, 20)).toBe(0)
  })

  it('writes the sample then light copies, the next rows half light, half to write', () => {
    const [page] = layoutSheet(['b', 'bé'], DEFAULT_SHEET, measure)
    expect(page.rows.map((r) => [r.text, r.sample])).toEqual([
      ['b', true],
      ['b', false],
      ['bé', true],
      ['bé', false],
    ])
    expect(page.rows[0].copies).toBeGreaterThan(page.rows[1].copies)
    expect(page.rows[1].copies).toBeGreaterThan(0)
  })

  it('without tracing, only the sample is written', () => {
    const [page] = layoutSheet(['b'], { ...DEFAULT_SHEET, trace: false }, measure)
    expect(page.rows.every((r) => r.copies === 0)).toBe(true)
  })

  it('goes on to a new page when one is full, and "Cả trang" fills the page', () => {
    const perFirst = rowsPerPage(2, true)
    const samples = Array.from({ length: perFirst }, (_, i) => `s${i}`)
    const pages = layoutSheet(samples, DEFAULT_SHEET, measure)
    expect(pages).toHaveLength(2)
    expect(pages[0].rows).toHaveLength(perFirst)

    const full = layoutSheet(['b', 'bé'], { ...DEFAULT_SHEET, rowsPerSample: 'page' }, measure)
    expect(full).toHaveLength(2)
    expect(full[0].rows.every((r) => r.text === 'b')).toBe(true)
    expect(full[1].rows).toHaveLength(rowsPerPage(2, false))
  })

  it('an empty sheet is one blank page', () => {
    expect(layoutSheet([], DEFAULT_SHEET, measure)).toEqual([{ rows: [] }])
  })
})
