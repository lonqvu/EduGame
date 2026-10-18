import { useState, type ReactNode } from 'react'
import { ArrowRightIcon } from '@/components/ui/icons'
import type { ReportSession } from '@/types/api'
import { axisLabelIndexes, niceMax, resultLabel, sessionTime, shortDate, durationLabel, weekdayDate, type ChartBucket } from '@/utils/reports'

/** White block of the reports page. */
export function ReportCard({
  title,
  text,
  action,
  className = '',
  children,
}: {
  title: string
  text?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className={`flex min-w-0 flex-col gap-4 rounded-[20px] bg-white p-[18px] shadow-[0_1px_2px_rgba(31,42,68,0.04)] sm:p-[22px] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-[18px] leading-tight font-black">{title}</h2>
          {text && <p className="m-0 text-[13.5px] text-ink-muted">{text}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A figure of the period, and how it moved since the period before. */
export function StatTile({
  label,
  value,
  detail,
  trend,
  icon,
  tint,
}: {
  label: string
  value: string
  detail?: string
  trend?: { direction: 'up' | 'down' | 'same'; text: string } | null
  icon: ReactNode
  /** Background of the round icon, e.g. "bg-[#E3ECFF] text-primary". */
  tint: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-[18px] bg-white p-[18px] shadow-[0_1px_2px_rgba(31,42,68,0.04)]">
      <div className="flex items-center gap-2.5">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tint}`}>{icon}</span>
        <span className="text-[14px] font-bold text-ink-soft">{label}</span>
      </div>
      <span className="text-[30px] leading-none font-black tabular-nums">{value}</span>
      {detail && <span className="text-[13px] text-ink-muted">{detail}</span>}
      {trend && (
        <span className={`text-[13px] font-bold ${trend.direction === 'up' ? 'text-success' : 'text-ink-muted'}`}>
          <span aria-hidden="true">{trend.direction === 'up' ? '▲ ' : trend.direction === 'down' ? '▼ ' : ''}</span>
          {trend.text}
        </span>
      )}
    </div>
  )
}

/**
 * Games per day (or week): one column each, the completed share in the tooltip. Every column is focusable and
 * names its figures, and a table carries the same numbers for screen readers.
 */
export function ActivityChart({ buckets, unit }: { buckets: ChartBucket[]; unit: 'day' | 'week' }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const top = niceMax(Math.max(0, ...buckets.map((b) => b.activities)))
  const labelled = new Set(axisLabelIndexes(buckets.length))
  const name = (b: ChartBucket) => (unit === 'day' ? weekdayDate(b.start) : `Tuần ${shortDate(b.start)} – ${shortDate(b.end)}`)
  const describe = (b: ChartBucket) => `${name(b)}: ${b.activities} hoạt động, ${b.completed} hoàn thành`
  const shown = hovered === null ? null : buckets[hovered]

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-[200px] gap-2">
        {/* Axis: 0, half, top. */}
        <div aria-hidden="true" className="flex w-6 shrink-0 flex-col justify-between text-right text-[12px] text-ink-muted tabular-nums">
          <span className="-translate-y-1/2">{top}</span>
          <span>{top >= 2 && top % 2 === 0 ? top / 2 : ''}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
            <span className="border-t border-line-soft" />
            <span className="border-t border-line-soft" />
            <span className="border-t border-line" />
          </div>
          <ul
            aria-label={`Hoạt động theo ${unit === 'day' ? 'ngày' : 'tuần'}`}
            className="relative m-0 flex h-full list-none items-end gap-[2px] p-0"
            onPointerLeave={() => setHovered(null)}
          >
            {buckets.map((b, i) => (
              <li key={b.start} className="flex h-full min-w-0 flex-1 justify-center">
                <button
                  type="button"
                  aria-label={describe(b)}
                  onPointerEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  className={`flex h-full w-full cursor-default items-end justify-center rounded-md border-0 bg-transparent p-0 outline-none focus-visible:bg-primary-soft ${hovered === i ? 'bg-[#F1F5FD]' : ''}`}
                >
                  {b.activities > 0 && (
                    <span
                      className={`block w-full max-w-6 rounded-t-[4px] bg-primary transition-[filter] ${hovered === i ? 'brightness-110' : ''}`}
                      style={{ height: `${(b.activities / top) * 100}%` }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
          {shown && hovered !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute -top-2 z-10 flex -translate-x-1/2 -translate-y-full flex-col gap-0.5 rounded-[10px] bg-[#1F2A44] px-3 py-2 text-[12.5px] whitespace-nowrap text-white shadow-lg"
              style={{ left: `clamp(70px, ${((hovered + 0.5) / buckets.length) * 100}%, calc(100% - 70px))` }}
            >
              <span className="text-[15px] font-black tabular-nums">{shown.activities} hoạt động</span>
              <span className="text-white/80">{shown.completed} hoàn thành · {name(shown)}</span>
            </div>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="flex gap-2 pl-8 text-[12px] text-ink-muted">
        <div className="flex min-w-0 flex-1 gap-[2px]">
          {buckets.map((b, i) => (
            <span key={b.start} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
              {labelled.has(i) ? shortDate(b.start) : ''}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Hoạt động theo {unit === 'day' ? 'ngày' : 'tuần'}</caption>
        <thead>
          <tr>
            <th>{unit === 'day' ? 'Ngày' : 'Tuần'}</th>
            <th>Hoạt động</th>
            <th>Hoàn thành</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.start}>
              <td>{name(b)}</td>
              <td>{b.activities}</td>
              <td>{b.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Horizontal bars of one measure, the value at the tip. */
export function BarList({ rows, unit }: { rows: { key: string; label: ReactNode; value: number; title: string }[]; unit: string }) {
  const top = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-1.5" title={`${r.title}: ${r.value} ${unit}`}>
          <div className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="min-w-0 truncate font-bold">{r.label}</span>
            <span className="shrink-0 font-black tabular-nums">
              {r.value} <span className="font-semibold text-ink-muted">{unit}</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#EEF2FA]">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (Math.max(0, r.value) / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const PAGE = 10

/** Games played, newest first, ten more at a time. */
export function SessionHistory({ sessions }: { sessions: ReportSession[] }) {
  const [count, setCount] = useState(PAGE)
  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 flex list-none flex-col p-0">
        {sessions.slice(0, count).map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-1.5 border-b border-line-soft py-3 last:border-b-0 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_200px] md:items-center md:gap-4"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[15px] font-bold">{s.gameTitle}</span>
              <span className="text-[13px] text-ink-muted">
                {s.templateName} · {sessionTime(s.startedAt)}
              </span>
            </div>
            <span className="min-w-0 text-[14px] text-ink-soft">{resultLabel(s)}</span>
            <span className="flex shrink-0 items-center gap-3 md:justify-end">
              {s.minutes !== undefined && <span className="text-[13.5px] text-ink-muted tabular-nums">{durationLabel(s.minutes)}</span>}
              <span
                className={`rounded-full px-2.5 py-1 text-[12.5px] font-bold ${s.status === 'ENDED' ? 'bg-[#E3F6EA] text-success' : 'bg-chip text-ink-soft'}`}
              >
                {s.status === 'ENDED' ? '✓ Hoàn thành' : 'Dở dang'}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {sessions.length > count && (
        <button
          type="button"
          onClick={() => setCount((n) => n + PAGE * 2)}
          className="flex cursor-pointer items-center gap-1.5 self-center rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[14px] font-bold text-primary hover:border-primary"
        >
          Xem thêm ({sessions.length - count})
          <ArrowRightIcon size={16} className="rotate-90" />
        </button>
      )}
    </div>
  )
}

/** "Tải CSV" of a block. */
export function CsvButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="cursor-pointer rounded-full border border-line bg-white px-3.5 py-1.5 font-[inherit] text-[13.5px] font-bold text-ink-soft hover:border-primary hover:text-primary"
    >
      Tải CSV
    </button>
  )
}
