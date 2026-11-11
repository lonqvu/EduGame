import { App, Switch } from 'antd'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  isBoldLine,
  ROW_LI,
  RULE_ABOVE_LI,
  RULE_BELOW_LI,
  rowHeight,
  WRITING_START_LI,
  rowsPerPage,
  type LetterSize,
  type LetterStyle,
  type RowsPerSample,
  type SheetOptions,
  type SheetPage,
} from '@/utils/handwriting'

/**
 * The handwriting fonts, from Google Fonts with their Vietnamese letters, and how tall a "b" is and how deep a "g"
 * goes (em), for when the browser cannot measure them.
 */
const FONTS: Record<LetterStyle, { family: string; ascent: number; descent: number }> = {
  cursive: { family: 'Dancing Script', ascent: 0.72, descent: 0.3 },
  print: { family: 'Patrick Hand', ascent: 0.7, descent: 0.22 },
}
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500&family=Patrick+Hand&display=swap&subset=vietnamese'

const RULES: Record<SheetOptions['color'], { thin: string; bold: string }> = {
  purple: { thin: '#DCCBF5', bold: '#9F7FDB' },
  grey: { thin: '#E0E4EB', bold: '#98A1B2' },
}
/** The red margin line of an exercise book. */
const MARGIN_RED = '#E8858B'

/** A 2D context to measure letters with, none where the browser has no canvas (tests). */
function context2d(): CanvasRenderingContext2D | null {
  return typeof document !== 'undefined' ? (document.createElement('canvas').getContext?.('2d') ?? null) : null
}

/**
 * The font size that makes a "b" 5 li tall from the baseline, as the letter models have it, and keeps a "g" within 3
 * li below it: measured on the font itself once loaded.
 */
function fontSize(options: SheetOptions): number {
  const li = LI_PX[options.size]
  const font = FONTS[options.style]
  const context = context2d()
  let ascent = font.ascent
  let descent = font.descent
  if (context) {
    context.font = `100px "${font.family}"`
    const b = context.measureText('bhkl')
    const g = context.measureText('gy')
    if (b.actualBoundingBoxAscent > 0) ascent = b.actualBoundingBoxAscent / 100
    if (g.actualBoundingBoxDescent > 0) descent = g.actualBoundingBoxDescent / 100
  }
  return Math.min((5 * li) / ascent, (3 * li) / descent)
}

/** Loads the two fonts once (only this page needs them); true once they can be measured and drawn. */
function useHandwritingFonts(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONTS_URL}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = FONTS_URL
      document.head.appendChild(link)
    }
    let cancelled = false
    const fonts = document.fonts
    if (!fonts) return
    // Letters with Vietnamese marks, so the Vietnamese part of each font loads too ("bé Mẹ").
    void Promise.all(Object.values(FONTS).map((f) => fonts.load(`40px "${f.family}"`, 'b\u00e9 M\u1eb9')))
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

/** Width of a sample in px, measured with its font (an estimate where the browser cannot measure). */
function measurer(options: SheetOptions): (text: string) => number {
  const size = fontSize(options)
  const context = context2d()
  if (!context) return (text) => text.length * size * 0.5
  context.font = `${size}px "${FONTS[options.style].family}"`
  return (text) => context.measureText(text).width
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
    () => layoutSheet(samples, options, measurer(options)),
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
          <Choice
            label={t('utilities.handwriting.color')}
            value={options.color}
            options={[
              { value: 'purple', label: t('utilities.handwriting.purple') },
              { value: 'grey', label: t('utilities.handwriting.grey') },
            ]}
            onChange={(color) => set({ color })}
          />
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

  const lines: ReactNode[] = []
  for (let k = -RULE_ABOVE_LI; k <= rows * ROW_LI + RULE_BELOW_LI; k++) {
    const y = top + k * li
    const bold = isBoldLine(k)
    lines.push(<line key={`h${k}`} x1={left} x2={left + width} y1={y} y2={y} stroke={bold ? rule.bold : rule.thin} strokeWidth={bold ? 1.1 : 0.6} />)
  }
  for (let x = left; x <= left + width + 0.5; x += li * 4) {
    lines.push(<line key={`v${x}`} x1={x} x2={x} y1={ruleTop} y2={ruleBottom} stroke={rule.bold} strokeWidth={0.6} />)
  }
  // The red margin, one big square in: the letters start after it.
  lines.push(<line key="margin" x1={left + gap} x2={left + gap} y1={ruleTop} y2={ruleBottom} stroke={MARGIN_RED} strokeWidth={1.2} />)

  const letters = page.rows.flatMap((row, r) => {
    const baseline = top + r * rowHeight(options.size) + BASELINE_LI * li
    const w = measure(row.text)
    const x0 = left + WRITING_START_LI * li
    const out: ReactNode[] = []
    if (row.sample) {
      out.push(
        <text key={`s${r}`} x={x0} y={baseline} fill="#1A2440">
          {row.text}
        </text>,
      )
    }
    for (let i = 0; i < row.copies; i++) {
      const x = x0 + (row.sample ? i + 1 : i) * (w + gap)
      out.push(
        <text
          key={`c${r}-${i}`}
          x={x}
          y={baseline}
          {...(options.dashed ? { fill: 'none', stroke: '#9AA3B5', strokeWidth: 1.1, strokeDasharray: '3 2.5' } : { fill: '#C3CAD8' })}
        >
          {row.text}
        </text>,
      )
    }
    return out
  })

  return (
    <svg
      viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
      className="block h-auto w-full bg-white shadow-[0_8px_24px_rgba(31,42,68,0.15)] print:shadow-none"
      role="img"
      aria-label={t('utilities.handwriting.heading', { samples: samples.join(', ') })}
    >
      <rect width={PAGE_WIDTH} height={PAGE_HEIGHT} fill="#fff" />
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
