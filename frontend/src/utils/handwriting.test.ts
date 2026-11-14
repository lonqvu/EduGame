import { describe, expect, it } from 'vitest'
import {
  areaWidth,
  BASELINE_LI,
  copiesThatFit,
  DEFAULT_SHEET,
  isBoldLine,
  layoutSheet,
  LI_PX,
  PAGE_MARGIN,
  PAGE_WIDTH,
  parseSamples,
  ROW_LI,
  rowsPerPage,
  RULE_ABOVE_LI,
  RULE_BELOW_LI,
  sampleStride,
  zoneScale,
  COLUMN_LI,
  H_LI,
  horizontalLines,
  type GlyphReach,
  type PaperKind,
} from '@/utils/handwriting'

/** Every letter 20 px wide. */
const measure = (text: string) => text.length * 20

describe('handwriting sheet', () => {
  it('takes one sample a line, trimmed, without empty lines', () => {
    expect(parseSamples(' b \n\n  bé  \nMẹ   đi  chợ\n')).toEqual(['b', 'bé', 'Mẹ đi chợ'])
    expect(parseSamples(Array.from({ length: 60 }, () => 'a').join('\n'))).toHaveLength(40)
  })

  it('puts every baseline on a bold line, a big square apart from the next bold one', () => {
    for (let row = 0; row < 5; row++) expect(isBoldLine(row * ROW_LI + BASELINE_LI)).toBe(true)
    expect(isBoldLine(BASELINE_LI - 4)).toBe(true)
    expect(isBoldLine(BASELINE_LI - 2)).toBe(false)
    // The ruling starts and ends on a bold line.
    expect(isBoldLine(-RULE_ABOVE_LI)).toBe(true)
    expect(isBoldLine(ROW_LI * 3 + RULE_BELOW_LI)).toBe(true)
  })

  describe('papers', () => {
    const at = (paper: PaperKind, weight: string) => horizontalLines(paper, 2).filter((l) => l.weight === weight).map((l) => l.li)

    it('vở 4 ô li and small squares: a line every li, bold on the baselines', () => {
      for (const paper of ['oli', 'grid'] as const) {
        const lines = horizontalLines(paper, 2)
        expect(lines).toHaveLength(2 * ROW_LI + RULE_ABOVE_LI + RULE_BELOW_LI + 1)
        expect(at(paper, 'bold')).toEqual(expect.arrayContaining([BASELINE_LI, ROW_LI + BASELINE_LI]))
      }
      expect(COLUMN_LI.oli).toBe(4)
      expect(COLUMN_LI.grid).toBe(1)
    })

    it('guide lines: the model zones of each row, 2.5H up and 1.5H down from the baseline', () => {
      expect(at('guides', 'bold')).toEqual([BASELINE_LI, ROW_LI + BASELINE_LI])
      expect(at('guides', 'guide')).toEqual([BASELINE_LI - H_LI, ROW_LI + BASELINE_LI - H_LI])
      // Tall letters' top; the last row's tail line (1.5H down) closes the page.
      expect(at('guides', 'thin')).toEqual([BASELINE_LI - 2.5 * H_LI, ROW_LI + BASELINE_LI - 2.5 * H_LI, ROW_LI + BASELINE_LI + 1.5 * H_LI])
      expect(COLUMN_LI.guides).toBe(0)
    })

    it('lined: only the baselines', () => {
      expect(horizontalLines('lined', 2)).toEqual([
        { li: BASELINE_LI, weight: 'bold' },
        { li: ROW_LI + BASELINE_LI, weight: 'bold' },
      ])
    })
  })

  it('rules whole big squares inside the margins', () => {
    for (const size of [1, 2, 4] as const) {
      const w = areaWidth(size)
      expect(w % (LI_PX[size] * 4)).toBeCloseTo(0)
      expect(w).toBeLessThanOrEqual(PAGE_WIDTH - 2 * PAGE_MARGIN)
    }
  })

  it('starts every copy a whole number of big squares after the last, with at least 2 li of space', () => {
    const li = LI_PX[2]
    const square = 4 * li
    for (const width of [1, 3 * li, 6 * li, 6.5 * li, 30 * li]) {
      const stride = sampleStride(width, 2)
      expect(stride % square).toBeCloseTo(0)
      expect(stride - width).toBeGreaterThanOrEqual(2 * li)
      expect(stride - width).toBeLessThan(2 * li + square)
    }
  })

  describe('letter model heights (QĐ 31/2002, CV 5150), from what Playwrite VN draws', () => {
    // Measured on Playwrite VN, in H (the height of a): above and below the baseline.
    const FONT: Record<string, GlyphReach> = {
      a: { up: 1, down: 0.03 }, e: { up: 1, down: 0.03 }, o: { up: 1, down: 0.06 }, i: { up: 1.5, down: 0.03 },
      ơ: { up: 1.34, down: 0.06 }, é: { up: 1.59, down: 0.03 }, ố: { up: 1.88, down: 0.06 }, ạ: { up: 1, down: 0.44 },
      ẹ: { up: 1, down: 0.44 }, ợ: { up: 1.34, down: 0.44 }, r: { up: 1.15, down: 0.03 }, s: { up: 1.09, down: 0.06 },
      t: { up: 1.38, down: 0.03 }, d: { up: 2.41, down: 0.03 }, đ: { up: 2.41, down: 0.03 }, p: { up: 1, down: 1.47 },
      q: { up: 1, down: 1.47 }, b: { up: 2.41, down: 0.06 }, h: { up: 2.41, down: 0.03 }, g: { up: 1, down: 1.47 },
      y: { up: 0.97, down: 1.47 }, A: { up: 2.41, down: 0.03 }, B: { up: 2.41, down: 0.06 }, M: { up: 2.38, down: 0.03 },
      G: { up: 2.41, down: 1.47 }, Y: { up: 2.41, down: 1.47 }, '0': { up: 2.41, down: 0.06 }, '7': { up: 2.35, down: 0.06 },
    }
    const reach = (s: string) => FONT[s] ?? { up: 1, down: 0 }
    /** Where the letter ends up, in H, once scaled. */
    const drawn = (ch: string) => {
      const s = zoneScale(ch, reach)
      const r = reach(ch)
      if (s.uniform !== 1) return { up: r.up * s.uniform, down: r.down * s.uniform }
      return { up: r.up > 1 ? 1 + (r.up - 1) * s.up : r.up, down: r.down * s.down }
    }

    it.each([
      ['r', 1.25], ['s', 1.25], ['t', 1.5], ['d', 2], ['đ', 2], ['b', 2.5], ['h', 2.5], ['A', 2.5], ['B', 2.5], ['M', 2.5],
      ['0', 2], ['7', 2],
    ])('"%s" is %sH above the baseline', (ch, up) => {
      expect(drawn(ch).up).toBeCloseTo(up, 5)
    })

    it.each([
      ['p', 1], ['q', 1], ['g', 1.5], ['y', 1.5], ['G', 1.5], ['Y', 1.5],
    ])('"%s" goes %sH below the baseline', (ch, down) => {
      expect(drawn(ch).down).toBeCloseTo(down, 5)
    })

    it('leaves small letters at 1H and their marks within one li each above it', () => {
      for (const ch of ['a', 'e', 'o']) expect(zoneScale(ch, reach)).toEqual({ up: 1, down: 1, uniform: 1 })
      expect(drawn('é').up).toBeCloseTo(1.5, 5) // a tone mark in the li above H
      expect(drawn('ố').up).toBeCloseTo(1.88, 5) // hat and tone mark: two li, the font's own fits
      expect(zoneScale('ơ', reach).up).toBe(1) // the horn stays within its li
      expect(zoneScale('i', reach).up).toBe(1) // so does the dot
      expect(drawn('ẹ').down).toBeCloseTo(0.44, 5) // the dot under: in the li below the baseline
    })

    it('a capital G or Y is 4H in all', () => {
      for (const ch of ['G', 'Y']) expect(drawn(ch).up + drawn(ch).down).toBeCloseTo(4, 5)
    })

    it('leaves spaces and punctuation alone', () => {
      for (const ch of [' ', ',', '.', '!']) expect(zoneScale(ch, reach)).toEqual({ up: 1, down: 1, uniform: 1 })
    })
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
