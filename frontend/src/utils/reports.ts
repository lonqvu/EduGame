import type { ClassReport, ReportSession } from '@/types/api'

// --- Periods ------------------------------------------------------------------------------------------------------

/** The periods a teacher thinks in; each runs to today. */
export const PERIOD_PRESETS = [
  { key: 'week', label: 'Tuần này', name: 'tuần này' },
  { key: 'month', label: 'Tháng này', name: 'tháng này' },
  { key: 'term', label: 'Học kỳ này', name: 'học kỳ này' },
] as const

export type PresetKey = (typeof PERIOD_PRESETS)[number]['key']
export type PeriodKey = PresetKey | 'custom'

/** Same limit as the server. */
export const MAX_REPORT_DAYS = 366

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10-18" of a local date. */
export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A local date from "2026-10-18" (never shifted by the time zone, unlike `new Date("2026-10-18")`). */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

/** Whole days from `from` to `to`, both included. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000) + 1
}

/**
 * The days of a preset, today included: the week from Monday, the month from the 1st, the term from its start
 * (term 1 from 1 September, term 2 from 16 January; the summer stays with term 2).
 */
export function presetRange(key: PresetKey, today: Date = new Date()): { from: string; to: string } {
  const to = isoDate(today)
  if (key === 'week') return { from: addDays(to, -((today.getDay() + 6) % 7)), to }
  if (key === 'month') return { from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to }
  const y = today.getFullYear()
  const m = today.getMonth()
  const from = m >= 8 ? new Date(y, 8, 1) : m === 0 && today.getDate() < 16 ? new Date(y - 1, 8, 1) : new Date(y, 0, 16)
  return { from: isoDate(from), to }
}

/** Why a custom period cannot be shown, or null. */
export function rangeProblem(from: string, to: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return 'Cô chọn ngày bắt đầu và ngày kết thúc nhé.'
  if (from > to) return 'Ngày bắt đầu phải trước ngày kết thúc.'
  if (daysBetween(from, to) > MAX_REPORT_DAYS) return 'Mỗi báo cáo xem tối đa 1 năm.'
  return null
}

/** "12/10" or "12/10/2025" when not this year. */
export function shortDate(iso: string, today: Date = new Date()): string {
  const date = parseIsoDate(iso)
  const dm = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
  return date.getFullYear() === today.getFullYear() ? dm : `${dm}/${date.getFullYear()}`
}

/** "12/10 – 18/10/2026", the period a report covers. */
export function periodLabel(from: string, to: string): string {
  const a = parseIsoDate(from)
  const b = parseIsoDate(to)
  const head = a.getFullYear() === b.getFullYear() ? `${pad(a.getDate())}/${pad(a.getMonth() + 1)}` : `${pad(a.getDate())}/${pad(a.getMonth() + 1)}/${a.getFullYear()}`
  return from === to ? `${pad(b.getDate())}/${pad(b.getMonth() + 1)}/${b.getFullYear()}` : `${head} – ${pad(b.getDate())}/${pad(b.getMonth() + 1)}/${b.getFullYear()}`
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/** "T2, 12/10" */
export function weekdayDate(iso: string): string {
  const date = parseIsoDate(iso)
  return `${WEEKDAYS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

/** "08:05 · T2, 12/10" of a moment, in this browser's time zone. */
export function sessionTime(isoInstant: string): string {
  const date = new Date(isoInstant)
  return `${pad(date.getHours())}:${pad(date.getMinutes())} · ${weekdayDate(isoDate(date))}`
}

// --- Figures ------------------------------------------------------------------------------------------------------

/** "45 phút", "2 giờ", "2 giờ 5 phút", "0 phút". */
export function durationLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const hours = Math.floor(m / 60)
  const rest = m % 60
  if (hours === 0) return `${rest} phút`
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`
}

/** "45 phút", "2 giờ", "1 giờ 48": a duration short enough for a tile. */
export function shortDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  return m >= 60 && m % 60 !== 0 ? `${Math.floor(m / 60)} giờ ${m % 60}` : durationLabel(m)
}

/** Completed share, 0–100 (0 when nothing was played). */
export const completionRate = (completed: number, activities: number) => (activities > 0 ? Math.round((completed / activities) * 100) : 0)

/** How a figure moved since the period before: "+3", "−2", or none when both are 0. */
export function trend(now: number, before: number): { direction: 'up' | 'down' | 'same'; text: string } | null {
  if (now === 0 && before === 0) return null
  const diff = now - before
  if (diff === 0) return { direction: 'same', text: 'Bằng kỳ trước' }
  return { direction: diff > 0 ? 'up' : 'down', text: `${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('vi-VN')} so với kỳ trước` }
}

/** The same move as a share: "▲ 12%"; none when the period before had nothing to compare with. */
export function trendPercent(now: number, before: number): { direction: 'up' | 'down' | 'same'; text: string } | null {
  if (before <= 0) return null
  const change = Math.round(((now - before) / before) * 100)
  if (change === 0) return { direction: 'same', text: 'bằng kỳ trước' }
  return { direction: change > 0 ? 'up' : 'down', text: `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}%` }
}

/** A round top for a count axis: 1, 2, 5, 10, 20, 50... at least `max`. */
export function niceMax(max: number): number {
  if (max <= 1) return 1
  const power = 10 ** Math.floor(Math.log10(max))
  for (const step of [1, 2, 5, 10]) if (step * power >= max) return step * power
  return 10 * power
}

export interface ChartBucket {
  /** First day of the bucket. */
  start: string
  /** Last day of the bucket. */
  end: string
  activities: number
  completed: number
}

/** Longest period shown day by day. */
export const MAX_CHART_DAYS = 62

/** Days for up to 45 days; weeks (from the first day) beyond, so the columns stay readable. `unit` forces one. */
export function chartBuckets(daily: ClassReport['daily'], unit?: 'day' | 'week'): { unit: 'day' | 'week'; buckets: ChartBucket[] } {
  if (unit === 'day' || (!unit && daily.length <= 45)) {
    return { unit: 'day', buckets: daily.map((d) => ({ start: d.date, end: d.date, activities: d.activities, completed: d.completed })) }
  }
  const buckets: ChartBucket[] = []
  for (let i = 0; i < daily.length; i += 7) {
    const week = daily.slice(i, i + 7)
    buckets.push({
      start: week[0].date,
      end: week[week.length - 1].date,
      activities: week.reduce((n, d) => n + d.activities, 0),
      completed: week.reduce((n, d) => n + d.completed, 0),
    })
  }
  return { unit: 'week', buckets }
}

// --- Sessions -----------------------------------------------------------------------------------------------------

/** What a game ended with, in a few words. */
export function resultLabel(session: ReportSession): string {
  if (session.status !== 'ENDED') return 'Chưa chơi đến cuối'
  const results = session.results
  if (!results) return 'Đã hoàn thành'
  if (results.teams?.length) {
    const best = Math.max(...results.teams.map((t) => t.score))
    const winners = results.teams.filter((t) => t.score === best)
    const scores = [...results.teams].sort((a, b) => b.score - a.score).map((t) => t.score).join(' – ')
    if (best <= 0) return `Hòa · ${scores}`
    return `${winners.map((t) => t.name).join(' và ')} ${winners.length > 1 ? 'cùng thắng' : 'thắng'} · ${scores}`
  }
  if (results.winners) {
    if (results.winners.length === 0) return 'Không bạn nào trụ đến cuối'
    const names = results.winners.length <= 3 ? results.winners.join(', ') : `${results.winners.slice(0, 3).join(', ')} và ${results.winners.length - 3} bạn`
    return `${names} rung chuông vàng`
  }
  return 'Đã hoàn thành'
}

/** "12 phút", "dưới 1 phút" for a game ended within the minute. */
export const sessionDuration = (minutes: number) => (Math.round(minutes) <= 0 ? 'dưới 1 phút' : durationLabel(minutes))

const WEEKDAY_NAMES = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

/** "Hôm nay · Thứ Tư 28/10", "Hôm qua · …", "Thứ Hai 26/10" of a day. */
export function dayHeading(iso: string, today: Date = new Date()): string {
  const date = parseIsoDate(iso)
  const name = `${WEEKDAY_NAMES[date.getDay()]} ${shortDate(iso, today)}`
  const todayIso = isoDate(today)
  if (iso === todayIso) return `Hôm nay · ${name}`
  if (iso === addDays(todayIso, -1)) return `Hôm qua · ${name}`
  return name
}

/** Sessions (newest first) by the day they started, in this browser's time zone. */
export function sessionsByDay(sessions: ReportSession[]): { day: string; sessions: ReportSession[] }[] {
  const days: { day: string; sessions: ReportSession[] }[] = []
  for (const s of sessions) {
    const day = isoDate(new Date(s.startedAt))
    const last = days[days.length - 1]
    if (last?.day === day) last.sessions.push(s)
    else days.push({ day, sessions: [s] })
  }
  return days
}

/** "08:05" of a moment. */
export function clockTime(isoInstant: string): string {
  const date = new Date(isoInstant)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "Yến", "Yến và An", "Yến, An và 3 bạn khác". */
export function namesLabel(names: string[], max = 2): string {
  if (names.length <= max) return names.join(' và ')
  return `${names.slice(0, max).join(', ')} và ${names.length - max} bạn khác`
}

// --- CSV ----------------------------------------------------------------------------------------------------------

function csvCell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  // Text is never run as a formula by the spreadsheet (a name like "=1+1" stays text).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** CSV with a BOM, so Excel opens the Vietnamese text as UTF-8. */
export function toCsv(rows: (string | number)[][]): string {
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function sessionsCsv(report: ClassReport): string {
  return toCsv([
    ['Bắt đầu', 'Trò chơi', 'Loại trò chơi', 'Trạng thái', 'Thời lượng (phút)', 'Kết quả'],
    ...report.sessions.map((s) => [
      sessionTime(s.startedAt),
      s.gameTitle,
      s.templateName,
      s.status === 'ENDED' ? 'Hoàn thành' : 'Chưa chơi đến cuối',
      s.minutes ?? '',
      resultLabel(s),
    ]),
  ])
}

export function starsCsv(report: ClassReport): string {
  return toCsv([['STT', 'Học sinh', `Sao (${periodLabel(report.from, report.to)})`], ...report.students.map((s) => [s.rollNumber ?? '', s.displayName, s.stars])])
}

/** "bao-cao-3a-2026-10-12-2026-10-18-lich-su.csv" */
export function csvFileName(report: ClassReport, what: string): string {
  const name = report.classroom.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `bao-cao-${name || 'lop'}-${report.from}-${report.to}-${what}.csv`
}

/**
 * Which of `count` columns get a date under them: evenly spaced, at most `max`, the first and the last always; a
 * label too close to the last one gives way to it.
 */
export function axisLabelIndexes(count: number, max = 7): number[] {
  if (count <= 0) return []
  if (count <= max) return Array.from({ length: count }, (_, i) => i)
  const step = Math.ceil((count - 1) / (max - 1))
  const picked: number[] = []
  for (let i = 0; i < count - 1; i += step) picked.push(i)
  if (count - 1 - picked[picked.length - 1] < step / 2) picked.pop()
  return [...picked, count - 1]
}

// --- Tips ---------------------------------------------------------------------------------------------------------

/** A thing worth doing after reading the report: a line (bold parts in `strong`) and where to do it. */
export interface ReportTip {
  key: 'praise' | 'unfinished' | 'variety'
  icon: string
  text: (string | { strong: string })[]
  link: { to: string; label: string }
}

/**
 * At most three tips from the report: who was not praised, games left before the end, one kind of game played far
 * more than the others (and a question game the class has not played). `during`: "trong tháng này".
 */
export function reportTips(
  report: ClassReport,
  during: string,
  options: { playPath: (gameCode: string, templateCode: string) => string | null; untried: (played: string[]) => string | null },
): ReportTip[] {
  const tips: ReportTip[] = []
  const unpraised = report.students.filter((s) => s.stars <= 0)
  if (unpraised.length > 0) {
    const all = unpraised.length === report.students.length
    tips.push({
      key: 'praise',
      icon: '🌱',
      text: [{ strong: all ? 'Cả lớp' : namesLabel(unpraised.map((s) => s.displayName)) }, ` chưa được khen sao nào ${during}.`],
      link: { to: `/classes/${report.classroom.code}`, label: 'Khen ngay' },
    })
  }
  const unfinished = report.sessions.filter((s) => s.status !== 'ENDED')
  const again = unfinished.map((s) => ({ s, to: options.playPath(s.gameCode, s.templateCode) })).find((x) => x.to)
  if (again?.to) {
    tips.push({
      key: 'unfinished',
      icon: '⏸',
      text: [{ strong: `${unfinished.length} lượt chơi` }, ` dừng giữa chừng, gần nhất là "${again.s.gameTitle}".`],
      link: { to: again.to, label: 'Chơi lại' },
    })
  }
  const [top] = report.byTemplate
  const untried = top ? options.untried(report.byTemplate.map((t) => t.templateCode)) : null
  if (top && untried && report.summary.activities >= 5 && top.activities * 2 >= report.summary.activities) {
    tips.push({
      key: 'variety',
      icon: '🎲',
      text: [`Lớp chơi ${top.templateName} nhiều nhất. Đổi gió với `, { strong: untried }, '?'],
      link: { to: '/games/new', label: 'Xem trò' },
    })
  }
  return tips
}
