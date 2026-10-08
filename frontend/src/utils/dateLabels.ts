const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** "Vừa xong", "Hôm nay 09:10", "Hôm qua 14:30", "3 ngày trước", "12/09/2026". */
export function relativeTimeLabel(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS)
  if (days <= 0) return now.getTime() - date.getTime() < 60_000 ? 'Vừa xong' : `Hôm nay ${hhmm(date)}`
  if (days === 1) return `Hôm qua ${hhmm(date)}`
  if (days < 7) return `${days} ngày trước`
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

/** "Thứ 6, 6 Tháng 10"; Sunday is "Chủ nhật". */
export function dayLabel(date: Date = new Date()): string {
  const weekday = date.getDay() === 0 ? 'Chủ nhật' : `Thứ ${date.getDay() + 1}`
  return `${weekday}, ${date.getDate()} Tháng ${date.getMonth() + 1}`
}
