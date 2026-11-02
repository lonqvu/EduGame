import i18n from 'i18next'

const DAY_MS = 24 * 60 * 60 * 1000

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** "Vừa xong", "Hôm nay 09:10", "Hôm qua 14:30", "3 ngày trước", "2 tuần trước", "4 tháng trước". */
export function relativeTimeLabel(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS)
  if (days <= 0) return now.getTime() - date.getTime() < 60_000 ? i18n.t('time.justNow') : i18n.t('time.today', { time: hhmm(date) })
  if (days === 1) return i18n.t('time.yesterday', { time: hhmm(date) })
  // One way of saying it everywhere: how long ago, never a date beside "3 ngày trước".
  if (days < 7) return i18n.t('time.daysAgo', { count: days })
  if (days < 30) return i18n.t('time.weeksAgo', { count: Math.floor(days / 7) })
  if (days < 365) return i18n.t('time.monthsAgo', { count: Math.floor(days / 30) })
  return i18n.t('time.overAYear')
}

/** "Thứ 6, 6 Tháng 10"; Sunday is "Chủ nhật". In English "Friday, October 6". */
export function dayLabel(date: Date = new Date()): string {
  if (i18n.language === 'en') return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const weekday = date.getDay() === 0 ? 'Chủ nhật' : `Thứ ${date.getDay() + 1}`
  return `${weekday}, ${date.getDate()} Tháng ${date.getMonth() + 1}`
}
