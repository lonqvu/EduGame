import { App, Switch } from 'antd'
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  areaWidth,
  BASELINE_LI,
  DEFAULT_SHEET,
  FIRST_PAGE_HEAD,
  layoutSheet,
  LI_PX,
  OTHER_PAGE_HEAD,
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  parseSamples,
  columnLines,
  horizontalLines,
  PAPER_KINDS,
  PAPERS,
  type PaperKind,
  type RuleColor,
  ROW_LI,
  RULE_ABOVE_LI,
  RULE_BELOW_LI,
  rowHeight,
  WRITING_START_LI,
  rowsPerPage,
  type LetterSize,
  sampleStride,
  H_LI,
  zoneScale,
  type GlyphReach,
  type ZoneScale,
  type LetterStyle,
  type RowsPerSample,
  type SheetOptions,
  type SheetPage,
} from '@/utils/handwriting'

/**
 * The handwriting fonts, from Google Fonts with their Vietnamese letters, and how tall an "a" and a "b" are and how
 * deep a "g" goes (em), for when the browser cannot measure them.
 *
 * Cursive is Playwrite VN (TypeTogether): drawn after the Ministry's school cursive in use since 2002, upright and
 * with even strokes, as children learn it.
 */
const FONTS: Record<LetterStyle, { family: string; xHeight: number; ascent: number; descent: number }> = {
  cursive: { family: 'Playwrite VN', xHeight: 0.42, ascent: 1.05, descent: 0.63 },
  print: { family: 'Patrick Hand', xHeight: 0.33, ascent: 0.7, descent: 0.22 },
}
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Playwrite+VN&family=Patrick+Hand&display=swap'

/** Ruling colours, after the school papers: thin lines, bold lines. */
const RULES: Record<RuleColor, { thin: string; bold: string }> = {
  purple: { thin: '#DCCBF5', bold: '#9F7FDB' },
  blue: { thin: '#B5DDE6', bold: '#2F7A8C' },
  pink: { thin: '#E6C8F2', bold: '#D0607F' },
  black: { thin: '#C9CDD5', bold: '#4A505C' },
}
const COLORS: RuleColor[] = ['purple', 'blue', 'pink', 'black']
/** The red margin line of an exercise book. */
const MARGIN_RED = '#E8858B'

/** A 2D context to measure letters with, none where the browser has no canvas (tests). */
function context2d(): CanvasRenderingContext2D | null {
  return typeof document !== 'undefined' ? (document.createElement('canvas').getContext?.('2d') ?? null) : null
}

/** The height of a, o, e… in em, measured on the font (the stored value where the browser cannot measure). */
function xHeightEm(style: LetterStyle): number {
  const font = FONTS[style]
  const context = context2d()
  if (!context) return font.xHeight
  context.font = `100px "${font.family}"`
  // The median of letters with a flat or round top, so one overshooting letter does not set it.
  const tops = ['a', 'c', 'e', 'm', 'n', 'o', 'u', 'v', 'x'].map((c) => context.measureText(c).actualBoundingBoxAscent).sort((a, b) => a - b)
  const median = tops[Math.floor(tops.length / 2)]
  return median > 0 ? median / 100 : font.xHeight
}

/**
 * Cursive: the font size that makes a, o, e… exactly H (2 li); the other letters are then brought to the model's
 * heights one by one (`ModelText`). Print, an extra display that is not the model: the same size, capped so ascenders
 * and descenders stay within the row.
 */
function fontSize(options: SheetOptions): number {
  const li = LI_PX[options.size]
  const size = (H_LI * li) / xHeightEm(options.style)
  if (options.style === 'cursive') return size
  const font = FONTS[options.style]
  return Math.min(size, (5 * li) / font.ascent, (3 * li) / font.descent)
}

/** Whether a face of `family` has been downloaded and can be measured. */
function fontLoaded(family: string): boolean {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined
  if (!fonts) return false
  let loaded = false
  fonts.forEach((face) => {
    if (face.family.replace(/["']/g, '') === family && face.status === 'loaded') loaded = true
  })
  return loaded
}

/** How far each letter of a font reaches above and below the baseline, in H; measured once per letter. */
const reachCache = new Map<string, GlyphReach>()
function glyphReach(style: LetterStyle): (s: string) => GlyphReach {
  const family = FONTS[style].family
  const h = xHeightEm(style) * 100
  const context = context2d()
  return (s) => {
    const key = `${family}|${s}`
    let r = reachCache.get(key)
    if (!r) {
      if (!context) return { up: 1, down: 0 }
      context.font = `100px "${family}"`
      const m = context.measureText(s)
      r = { up: m.actualBoundingBoxAscent / h, down: m.actualBoundingBoxDescent / h }
      // Not cached before the font is in, or the fallback font's letters would be remembered. (`fonts.check` will not
      // do: it is true for a family the page does not know yet.)
      if (fontLoaded(family)) reachCache.set(key, r)
    }
    return r
  }
}

/** The Google Fonts stylesheet, added once; resolves when its @font-face rules are known (or it failed). */
let stylesheetLoaded: Promise<void> | null = null
function loadFontsStylesheet(): Promise<void> {
  stylesheetLoaded ??= new Promise<void>((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_URL
    link.onload = () => resolve()
    link.onerror = () => resolve()
    document.head.appendChild(link)
  })
  return stylesheetLoaded
}

/**
 * Loads the two fonts once (only this page needs them); true once they can be measured and drawn. The stylesheet
 * must be in first: before it, `document.fonts.load` knows no such font and resolves at once, and the samples would
 * be measured with a fallback font (copies then overlap once the real one shows).
 */
function useHandwritingFonts(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    const fonts = document.fonts
    if (!fonts) return
    // Letters with Vietnamese marks, so the Vietnamese part of each font loads too ("bé Mẹ").
    void loadFontsStylesheet()
      .then(() => Promise.all(Object.values(FONTS).map((f) => fonts.load(`40px "${f.family}"`, 'b\u00e9 M\u1eb9'))))
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return ready
}

/** How much room a sample takes, in px. */
interface Ink {
  /** From the leftmost to the rightmost ink. */
  width: number
  /** How far the ink starts left of the pen position (a cursive "M" begins with a lead-in stroke). */
  lead: number
}

/**
 * The ink of a sample, measured with its font (an estimate where the browser cannot measure). Cursive strokes reach
 * past the letters' advance (the lead-in of "M", the horn of "ơ"), so the ink box is used, not the advance.
 */
function measurer(options: SheetOptions): (text: string) => Ink {
  const size = fontSize(options)
  const context = context2d()
  if (!context) return (text) => ({ width: text.length * size * 0.5, lead: 0 })
  context.font = `${size}px "${FONTS[options.style].family}"`
  return (text) => {
    const m = context.measureText(text)
    const lead = Math.max(0, m.actualBoundingBoxLeft || 0)
    const right = Math.max(m.width, m.actualBoundingBoxRight || 0)
    return { width: lead + right, lead }
  }
}

/** How a sample is painted: dark or light letters, or a dashed outline. */
type Paint = { fill: string } | { fill: 'none'; stroke: string; strokeWidth: number; strokeDasharray: string }

/**
 * A sample in cursive, each letter at the model's heights (`zoneScale`). The text is drawn whole, so the font keeps
 * its joins between letters; then, letter by letter (clipped to its advance), the part above H is redrawn stretched
 * or squeezed from the H line and the part below the baseline from the baseline. The body between the two lines is
 * left as the font draws it, and the joins run there, so they stay unbroken. Print text is drawn as it is.
 */
function ModelText({ text, x, baseline, size, h, style, paint }: {
  text: string
  x: number
  baseline: number
  size: number
  /** H in px. */
  h: number
  style: LetterStyle
  paint: Paint
}) {
  const id = `mt${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const context = context2d()
  const chars = Array.from(text)
  const scales: ZoneScale[] = style === 'cursive' ? chars.map((c) => zoneScale(c, glyphReach(style))) : []
  const plain = <text x={x} y={baseline} {...paint}>{text}</text>
  if (!context || scales.every((s) => s.up === 1 && s.down === 1 && s.uniform === 1)) return plain

  context.font = `${size}px "${FONTS[style].family}"`
  // Pen position of each letter, and of the end.
  const xs = [x]
  let prefix = ''
  for (const c of chars) {
    prefix += c
    xs.push(x + context.measureText(prefix).width)
  }
  const yH = baseline - h
  const top = baseline - 5 * h
  const bottom = baseline + 3 * h
  // Seams overlap a little, so no hairline shows between the layers.
  const seam = 0.5
  const layers = new Map<string, { transform?: string; rects: { x: number; y: number; w: number; h: number }[] }>()
  const add = (key: string, transform: string | undefined, x1: number, y1: number, x2: number, y2: number) => {
    const layer = layers.get(key) ?? { transform, rects: [] }
    layer.rects.push({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 })
    layers.set(key, layer)
  }
  const about = (y: number, k: number) => `translate(0 ${y}) scale(1 ${k}) translate(0 ${-y})`
  chars.forEach((_, i) => {
    // The first and last letters' ranges reach past the ends: lead-in and exit strokes.
    const x1 = i === 0 ? xs[0] - size : xs[i]
    const x2 = i === chars.length - 1 ? xs[i + 1] + size : xs[i + 1]
    const s = scales[i]
    if (s.uniform !== 1) {
      const k = s.uniform.toFixed(3)
      add(`u${k}`, about(baseline, s.uniform), x1, top, x2, bottom)
      return
    }
    add('mid', undefined, x1, yH - seam, x2, baseline + seam)
    add(`a${s.up.toFixed(3)}`, s.up === 1 ? undefined : about(yH, s.up), x1, top, x2, yH + seam)
    add(`d${s.down.toFixed(3)}`, s.down === 1 ? undefined : about(baseline, s.down), x1, baseline - seam, x2, bottom)
  })

  const entries = [...layers.entries()].map(([key, layer], n) => ({ key, layer, clip: `${id}-${n}` }))
  return (
    <g>
      <defs>
        {entries.map(({ key, layer, clip }) => (
          <clipPath key={key} id={clip} clipPathUnits="userSpaceOnUse">
            {layer.rects.map((r, i) => (
              <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />
            ))}
          </clipPath>
        ))}
      </defs>
      {entries.map(({ key, layer, clip }) => (
        <g key={key} clipPath={`url(#${clip})`}>
          <text x={x} y={baseline} transform={layer.transform} {...paint}>
            {text}
          </text>
        </g>
      ))}
    </g>
  )
}

/**
 * /utilities/handwriting — "Phiếu luyện viết ô li": samples typed one a line become A4 pages ruled like a vở ô li, the
 * sample dark at the start of a row, light (or dashed) copies to trace, room to write. Printed with the browser's own
 * dialog, which also saves a PDF; nothing leaves the browser.
 */
export function HandwritingSheetPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const fontsReady = useHandwritingFonts()
  const [text, setText] = useState(() => t('utilities.handwriting.samplesPlaceholder'))
  const [options, setOptions] = useState<SheetOptions>(DEFAULT_SHEET)
  const set = (patch: Partial<SheetOptions>) => setOptions((o) => ({ ...o, ...patch }))

  const samples = parseSamples(text)
  const pages = useMemo(
    () => {
      const measure = measurer(options)
      return layoutSheet(samples, options, (text) => measure(text).width)
    },
    // The fonts change the widths once loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [samples.join('\n'), options, fontsReady],
  )

  const print = (pdf: boolean) => {
    if (pdf) message.info(t('utilities.handwriting.pdfTip'), 4)
    // After the message shows: the print dialog stops the page.
    window.setTimeout(() => window.print(), pdf ? 400 : 0)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('utilities.handwriting.title')}
        text={t('utilities.handwriting.text')}
        back={{ to: '/utilities', label: t('utilities.handwriting.back') }}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label={t('utilities.handwriting.title')} className="flex flex-col gap-4 rounded-[20px] bg-white p-4 sm:p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-black text-[#5B6580]">{t('utilities.handwriting.samples')}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="resize-y rounded-[12px] border-2 border-[#DCE5F5] px-3 py-2.5 font-[inherit] text-[15px] leading-relaxed text-ink outline-none focus:border-primary"
            />
          </label>
          <PaperPicker value={options.paper} color={options.color} onChange={(paper) => set({ paper })} />
          <Choice
            label={t('utilities.handwriting.color')}
            value={options.color}
            options={COLORS.map((color) => ({ value: color, label: t(`utilities.handwriting.colors.${color}`) }))}
            onChange={(color) => set({ color })}
          />
          <Toggle label={t('utilities.handwriting.frame')} checked={options.frame} onChange={(frame) => set({ frame })} />
          <Choice
            label={t('utilities.handwriting.style')}
            value={options.style}
            options={[
              { value: 'cursive', label: t('utilities.handwriting.cursive') },
              { value: 'print', label: t('utilities.handwriting.print') },
            ]}
            onChange={(style) => set({ style })}
          />
          <Choice
            label={t('utilities.handwriting.size')}
            value={String(options.size)}
            options={([1, 2, 4] as const).map((s) => ({ value: String(s), label: t(`utilities.handwriting.sizes.s${s}`) }))}
            onChange={(size) => set({ size: Number(size) as LetterSize })}
          />
          <Choice
            label={t('utilities.handwriting.rows')}
            value={String(options.rowsPerSample)}
            options={[
              ...([1, 2, 3] as const).map((n) => ({ value: String(n), label: t('utilities.handwriting.rowCount', { count: n }) })),
              { value: 'page', label: t('utilities.handwriting.page') },
            ]}
            onChange={(rows) => set({ rowsPerSample: (rows === 'page' ? 'page' : Number(rows)) as RowsPerSample })}
          />
          <div className="flex flex-col gap-2.5">
            <Toggle label={t('utilities.handwriting.trace')} checked={options.trace} onChange={(trace) => set({ trace })} />
            <Toggle label={t('utilities.handwriting.dashed')} checked={options.dashed} disabled={!options.trace} onChange={(dashed) => set({ dashed })} />
            <Toggle label={t('utilities.handwriting.nameLine')} checked={options.nameLine} onChange={(nameLine) => set({ nameLine })} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => print(false)}
              disabled={samples.length === 0}
              className="h-12 flex-1 cursor-pointer rounded-full border-0 bg-primary font-[inherit] text-[15px] font-black text-white shadow-[0_6px_16px_rgba(53,99,233,0.3)] hover:bg-primary-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('utilities.handwriting.printSheet')}
            </button>
            <button
              type="button"
              onClick={() => print(true)}
              disabled={samples.length === 0}
              className="h-12 flex-1 cursor-pointer rounded-full border-2 border-[#DCE5F5] bg-white font-[inherit] text-[15px] font-black text-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('utilities.handwriting.pdf')}
            </button>
          </div>
          <p className="m-0 text-[12.5px] text-ink-muted">{t('utilities.handwriting.note')}</p>
        </section>

        <section aria-label={t('utilities.handwriting.preview')} className="flex flex-col items-center gap-3 rounded-[20px] bg-[#E9EEF6] p-3 sm:p-5">
          {samples.length === 0 ? (
            <p className="m-0 py-16 text-center text-[15px] text-ink-muted">{t('utilities.handwriting.empty')}</p>
          ) : (
            <div className="print-sheets flex w-full flex-col items-center gap-4">
              {pages.map((page, i) => (
                <figure key={i} className="m-0 flex w-full max-w-[600px] flex-col gap-1.5">
                  <figcaption className="text-[13px] font-extrabold text-[#5B6580] print:hidden">
                    {t('utilities.handwriting.pageOf', { page: i + 1, count: pages.length })}
                  </figcaption>
                  <SheetSvg page={page} first={i === 0} options={options} samples={samples} />
                </figure>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/** One A4 page: the head on the first one, the ruling over the whole writing area, the rows' letters. */
function SheetSvg({ page, first, options, samples }: { page: SheetPage; first: boolean; options: SheetOptions; samples: string[] }) {
  const { t } = useTranslation()
  const li = LI_PX[options.size]
  const width = areaWidth(options.size)
  const left = (PAGE_WIDTH - width) / 2
  // Top of the first writing row; the ruling starts 3 li above it, on a bold line.
  const top = PAGE_MARGIN + (first ? FIRST_PAGE_HEAD : OTHER_PAGE_HEAD) + RULE_ABOVE_LI * LI_PX[options.size]
  const rows = rowsPerPage(options.size, first)
  const ruleTop = top - RULE_ABOVE_LI * li
  const ruleBottom = top + (rows * ROW_LI + RULE_BELOW_LI) * li
  const rule = RULES[options.color]
  const size = fontSize(options)
  const family = FONTS[options.style].family
  const measure = measurer(options)
  const gap = li * 4

  const paper = PAPERS[options.paper]
  const clipId = `area${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  // Thin lines dotted on the dotted paper.
  const thin = { stroke: rule.thin, strokeWidth: paper.dotted ? 0.8 : 0.6, strokeDasharray: paper.dotted ? '1 1.6' : undefined }
  const columns = columnLines(options.paper, width, ruleBottom - ruleTop, li).map(([xTop, xBottom, edge], n) => (
    <line
      key={`v${n}`}
      x1={left + xTop}
      x2={left + xBottom}
      y1={ruleTop}
      y2={ruleBottom}
      {...(edge ? { stroke: rule.bold, strokeWidth: 0.7 } : thin)}
    />
  ))
  const lines: ReactNode[] = [
    // Slanted columns run past the area's sides; it clips them.
    <clipPath key="clip" id={clipId}>
      <rect x={left} y={ruleTop} width={width} height={ruleBottom - ruleTop} />
    </clipPath>,
    <g key="columns" clipPath={`url(#${clipId})`}>
      {columns}
    </g>,
  ]
  for (const { li: k, weight } of horizontalLines(rows)) {
    const y = top + k * li
    lines.push(<line key={`h${k}`} x1={left} x2={left + width} y1={y} y2={y} {...(weight === 'bold' ? { stroke: rule.bold, strokeWidth: 1.1 } : thin)} />)
  }
  // The area's sides, and the red margin one big square in: the letters start after it.
  lines.push(
    <rect key="edge" x={left} y={ruleTop} width={width} height={ruleBottom - ruleTop} fill="none" stroke={rule.bold} strokeWidth={0.8} />,
    <line key="margin" x1={left + gap} x2={left + gap} y1={ruleTop} y2={ruleBottom} stroke={MARGIN_RED} strokeWidth={1.2} />,
  )
  // On slanted paper the letters lean with the columns, about their baseline.
  const skew = paper.slant ? (baseline: number) => `translate(0 ${baseline}) skewX(${-paper.slant}) translate(0 ${-baseline})` : undefined

  const letters = page.rows.flatMap((row, r): ReactNode[] => {
    const baseline = top + r * rowHeight(options.size) + BASELINE_LI * li
    const ink = measure(row.text)
    const w = ink.width
    // The pen position, so the ink (lead-in stroke included) starts 1 li after the column line.
    const x0 = left + WRITING_START_LI * li + ink.lead
    const out: ReactNode[] = []
    const draw = (key: string, x: number, paint: Paint) => (
      <ModelText key={key} text={row.text} x={x} baseline={baseline} size={size} h={H_LI * li} style={options.style} paint={paint} />
    )
    if (row.sample) out.push(draw(`s${r}`, x0, { fill: '#1A2440' }))
    // Every copy starts a whole number of big squares after the previous one, the same place after a column line.
    const stride = sampleStride(w, options.size)
    const copy: Paint = options.dashed ? { fill: 'none', stroke: '#9AA3B5', strokeWidth: 1.1, strokeDasharray: '3 2.5' } : { fill: '#C3CAD8' }
    for (let i = 0; i < row.copies; i++) out.push(draw(`c${r}-${i}`, x0 + (row.sample ? i + 1 : i) * stride, copy))
    return skew ? [<g key={`r${r}`} transform={skew(baseline)}>{out}</g>] : out
  })

  return (
    <svg
      viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
      className="block h-auto w-full bg-white shadow-[0_8px_24px_rgba(31,42,68,0.15)] print:shadow-none"
      role="img"
      aria-label={t('utilities.handwriting.heading', { samples: samples.join(', ') })}
    >
      <rect width={PAGE_WIDTH} height={PAGE_HEIGHT} fill="#fff" />
      {options.frame && <PageFrame color={rule.bold} />}
      {first && (
        <g fontFamily="Nunito, sans-serif" fill="#3D4766">
          {options.nameLine && (
            <>
              <text x={left} y={PAGE_MARGIN + 16} fontSize={14}>
                {t('utilities.handwriting.name')}
              </text>
              <text x={left + width} y={PAGE_MARGIN + 16} fontSize={14} textAnchor="end">
                {t('utilities.handwriting.date')}
              </text>
            </>
          )}
          <text x={left} y={PAGE_MARGIN + (options.nameLine ? 48 : 22)} fontSize={16} fontWeight={800} fill="#1A2440">
            {t('utilities.handwriting.heading', { samples: samples.join(', ') }).slice(0, 90)}
          </text>
        </g>
      )}
      {lines}
      <g fontFamily={`"${family}", cursive`} fontSize={size}>
        {letters}
      </g>
      <text x={left + width} y={PAGE_HEIGHT - PAGE_MARGIN / 2} fontSize={11} fill="#9AA3B5" textAnchor="end" fontFamily="Nunito, sans-serif">
        {t('utilities.handwriting.footer')}
      </text>
    </svg>
  )
}

/**
 * A frame around the page, as on the decorated school papers: a double line with its corners cut in a quarter circle,
 * and a small diamond in each corner.
 */
function PageFrame({ color }: { color: string }) {
  const outline = (inset: number, r: number) => {
    const [x0, y0, x1, y1] = [inset, inset, PAGE_WIDTH - inset, PAGE_HEIGHT - inset]
    return (
      `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 0 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 0 ${x1 - r} ${y1}` +
      `H${x0 + r}A${r} ${r} 0 0 0 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 0 ${x0 + r} ${y0}Z`
    )
  }
  const corners = [
    [12, 12],
    [PAGE_WIDTH - 12, 12],
    [12, PAGE_HEIGHT - 12],
    [PAGE_WIDTH - 12, PAGE_HEIGHT - 12],
  ]
  return (
    <g fill="none" stroke={color}>
      <path d={outline(12, 22)} strokeWidth={1.8} />
      <path d={outline(18, 16)} strokeWidth={0.7} />
      {corners.map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y - 5}L${x + 5} ${y}L${x} ${y + 5}L${x - 5} ${y}Z`} fill={color} stroke="none" />
      ))}
    </g>
  )
}

/** "Mẫu giấy": the papers, each with a small drawing of its ruling. */
function PaperPicker({ value, color, onChange }: { value: PaperKind; color: RuleColor; onChange: (paper: PaperKind) => void }) {
  const { t } = useTranslation()
  const label = t('utilities.handwriting.paper')
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-black text-[#5B6580]">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
        {PAPER_KINDS.map((paper) => (
          <button
            key={paper}
            type="button"
            role="radio"
            aria-checked={value === paper}
            onClick={() => onChange(paper)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-[12px] border-2 bg-white p-2 text-left font-[inherit] ${
              value === paper ? 'border-primary' : 'border-[#DCE5F5] hover:border-[#B9C7E4]'
            }`}
          >
            <PaperThumb paper={paper} color={color} />
            <span className="flex min-w-0 flex-col">
              <span className="text-[13.5px] font-extrabold text-ink">{t(`utilities.handwriting.papers.${paper}`)}</span>
              <span className="text-[11.5px] leading-tight text-ink-muted">{t(`utilities.handwriting.paperHints.${paper}`)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** A 40 × 40 sample of a paper's ruling, 3 px a li, in the colour chosen. */
function PaperThumb({ paper, color }: { paper: PaperKind; color: RuleColor }) {
  const li = 3
  const rule = RULES[color]
  const { dotted } = PAPERS[paper]
  const thin = { stroke: rule.thin, strokeWidth: dotted ? 0.8 : 0.5, strokeDasharray: dotted ? '0.6 1' : undefined }
  const out: ReactNode[] = []
  for (let k = 0; k * li <= 40; k++) {
    // Bold every 4 li, as on the page (a baseline every other bold line).
    const bold = k % 4 === 1
    out.push(<line key={`h${k}`} x1={0} x2={40} y1={k * li} y2={k * li} {...(bold ? { stroke: rule.bold, strokeWidth: 0.9 } : thin)} />)
  }
  columnLines(paper, 40, 40, li).forEach(([xTop, xBottom, edge], n) =>
    out.push(<line key={`v${n}`} x1={xTop} x2={xBottom} y1={0} y2={40} {...(edge ? { stroke: rule.bold, strokeWidth: 0.6 } : thin)} />),
  )
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden className="shrink-0 overflow-hidden rounded-[6px] border border-[#E6EBF4] bg-white">
      {out}
    </svg>
  )
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-black text-[#5B6580]">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap rounded-[14px] bg-[#F2F5FA] p-[3px]">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-w-0 flex-1 cursor-pointer rounded-[11px] border-0 px-2.5 py-1.5 font-[inherit] text-[13.5px] font-extrabold whitespace-nowrap ${
              value === o.value ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'bg-transparent text-[#5B6580]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between gap-3 text-[14px] font-bold ${disabled ? 'text-ink-muted' : 'text-ink'}`}>
      {label}
      <Switch checked={checked} disabled={disabled} onChange={onChange} aria-label={label} />
    </label>
  )
}
