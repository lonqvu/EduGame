import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon } from '@/components/ui/icons'
import { cardArt } from '@/pages/choose-game/chooserEntries'
import { ReportCard } from '@/pages/reports/ReportParts'
import type { ClassReport, ReportSession } from '@/types/api'
import type { GameType } from '@/types/game'
import { avatarSrc, CLASS_AVATARS } from '@/utils/classrooms'
import { clockTime, dayHeading, resultLabel, sessionDuration, sessionsByDay, type ReportTip } from '@/utils/reports'

/** A pill of the filter bar or a card's switch. */
export function Pill({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`h-9 shrink-0 cursor-pointer rounded-full border-0 px-3.5 font-[inherit] text-[14px] font-extrabold whitespace-nowrap ${
        on ? 'bg-primary text-white' : 'bg-[#F2F5FA] text-[#3D4766] hover:bg-primary-soft'
      }`}
    >
      {children}
    </button>
  )
}

/** Two or three choices inside a card ("Theo ngày / Theo tuần"). */
export function Switch<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-[#F2F5FA] p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-full border-0 px-3 py-1 font-[inherit] text-[13px] font-extrabold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 ${
            value === o.value ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'bg-transparent text-[#5B6580]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A figure of the period: icon, number, what it counts (and how it moved). */
export function NumberTile({
  icon,
  tint,
  value,
  label,
  trend,
}: {
  icon: string
  tint: string
  value: string
  label: string
  trend?: { direction: 'up' | 'down' | 'same'; text: string } | null
}) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 items-center gap-3 rounded-[18px] bg-white px-4 py-3 max-sm:gap-2.5 max-sm:px-3">
      <span
        aria-hidden="true"
        className="flex size-[46px] shrink-0 items-center justify-center rounded-[14px] text-[22px] max-sm:size-[38px] max-sm:text-[18px]"
        style={{ background: tint }}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <b className="text-[24px] leading-tight font-black tabular-nums max-sm:text-[20px]">{value}</b>
        <span className="text-[12.5px] text-ink-muted">
          {label}
          {trend && (
            <>
              {' · '}
              <span className={`font-extrabold ${trend.direction === 'up' ? 'text-success' : trend.direction === 'down' ? 'text-[#C2410C]' : ''}`}>
                {trend.text}
              </span>
            </>
          )}
        </span>
      </span>
    </div>
  )
}

const HISTORY_PAGE = 10

/** The games played, newest first, under the day they were played; ten more at a time. */
export function HistoryCard({ report, action }: { report: ClassReport; action?: ReactNode }) {
  const [onlyEnded, setOnlyEnded] = useState(false)
  const [count, setCount] = useState(HISTORY_PAGE)
  const shown = onlyEnded ? report.sessions.filter((s) => s.status === 'ENDED') : report.sessions
  const { summary } = report
  return (
    <ReportCard
      title="Lịch sử hoạt động"
      text={
        summary.correctAnswers > 0
          ? `${summary.activities} lượt chơi · ${summary.correctAnswers} câu trả lời đúng của các đội`
          : `${summary.activities} lượt chơi`
      }
      action={
        <div className="flex items-center gap-2">
          <Switch
            label="Lượt chơi hiện"
            value={onlyEnded ? 'ended' : 'all'}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'ended', label: 'Chơi đến cuối' },
            ]}
            onChange={(v) => {
              setOnlyEnded(v === 'ended')
              setCount(HISTORY_PAGE)
            }}
          />
          {action}
        </div>
      }
    >
      {shown.length === 0 ? (
        <p className="m-0 text-[14px] text-ink-muted">Chưa trò nào được chơi đến cuối trong kỳ này.</p>
      ) : (
        <div className="flex flex-col">
          {sessionsByDay(shown.slice(0, count)).map((d) => (
            <section key={d.day} aria-label={dayHeading(d.day)}>
              <h3 className="m-0 mt-2 mb-1 text-[12.5px] font-black tracking-[0.04em] text-ink-muted uppercase first:mt-0">{dayHeading(d.day)}</h3>
              <ul className="m-0 flex list-none flex-col p-0">
                {d.sessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {shown.length > count && (
        <button
          type="button"
          onClick={() => setCount((n) => n + HISTORY_PAGE * 2)}
          className="flex cursor-pointer items-center gap-1.5 self-center rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[14px] font-bold text-primary hover:border-primary"
        >
          Xem thêm ({shown.length - count})
          <ArrowRightIcon size={16} className="rotate-90" />
        </button>
      )}
      {summary.activities > report.sessions.length && (
        <p className="m-0 text-[13px] text-ink-muted">
          Hiện {report.sessions.length} lượt chơi gần nhất. Cô chọn khoảng thời gian ngắn hơn để xem các lượt cũ.
        </p>
      )}
    </ReportCard>
  )
}

function SessionRow({ session: s }: { session: ReportSession }) {
  const ended = s.status === 'ENDED'
  return (
    <li className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-b-0">
      <img src={cardArt(s.templateCode as GameType)} alt="" className="h-[30px] w-[46px] shrink-0 rounded-[8px] bg-surface-soft object-cover" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14.5px] font-bold">{s.gameTitle}</span>
        <span className="truncate text-[12.5px] text-ink-muted">
          {s.templateName} · {clockTime(s.startedAt)}
          {s.minutes !== undefined && ` · ${sessionDuration(s.minutes)}`}
          {ended && <span className="md:hidden"> · {resultLabel(s)}</span>}
        </span>
      </span>
      {ended && <span className="hidden max-w-[40%] truncate text-[13.5px] font-bold text-[#3D4766] md:block">{resultLabel(s)}</span>}
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-black whitespace-nowrap ${ended ? 'bg-[#E2F6E8] text-success' : 'bg-[#F2F5FA] text-ink-muted'}`}
      >
        {ended ? '✓ Đến cuối' : 'Dừng giữa chừng'}
      </span>
    </li>
  )
}

/** "Gợi ý cho cô": what to do next, each with its link. */
export function TipsCard({ tips }: { tips: ReportTip[] }) {
  return (
    <section
      aria-label="Gợi ý cho cô"
      className="flex flex-col gap-1 rounded-[20px] border-2 border-[#FFE7A3] bg-[linear-gradient(135deg,#FFF6DA,#FFFFFF)] px-[18px] py-4"
    >
      <h2 className="m-0 mb-1 text-[18px] font-black">💡 Gợi ý cho cô</h2>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {tips.map((tip) => (
          <li key={tip.key} className="flex items-start gap-2.5 text-[14px] leading-snug">
            <span aria-hidden="true" className="text-[19px] leading-none">
              {tip.icon}
            </span>
            <span>
              {tip.text.map((part, i) => (typeof part === 'string' ? part : <b key={i}>{part.strong}</b>))}{' '}
              <Link to={tip.link.to} className="font-black whitespace-nowrap text-primary hover:underline">
                {tip.link.label} →
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The animal of a student of the report (the report has no avatars: the same one the class page gives by default). */
const reportAvatar = (id: number) => avatarSrc(CLASS_AVATARS[id % CLASS_AVATARS.length])

const PODIUM = [
  { place: 2, height: 46, color: '#A9B6CF' },
  { place: 1, height: 64, color: '#F2B705' },
  { place: 3, height: 34, color: '#D89A5B' },
]

/** "Ngôi sao của lớp": the three with the most stars on a podium, the next ones, and who still waits for a star. */
export function StarsCard({ report, action }: { report: ClassReport; action?: ReactNode }) {
  const [all, setAll] = useState(false)
  const starred = report.students.filter((s) => s.stars > 0)
  const waiting = report.students.filter((s) => s.stars <= 0)
  const top = starred.slice(0, 3)
  const rest = starred.slice(3, all ? undefined : 5)
  return (
    <ReportCard title="Ngôi sao của lớp" action={action}>
      {report.students.length === 0 ? (
        <p className="m-0 text-[14px] text-ink-muted">
          Lớp chưa có học sinh. <Link to={`/classes/${report.classroom.code}`}>Thêm học sinh</Link>
        </p>
      ) : starred.length === 0 ? (
        <p className="m-0 text-[14px] text-ink-muted">Chưa em nào được thưởng sao trong kỳ này.</p>
      ) : (
        <>
          <ol aria-label="Ba bạn nhiều sao nhất" className="m-0 flex list-none items-end justify-center gap-2.5 p-0">
            {PODIUM.filter((p) => top[p.place - 1]).map((p) => {
              const s = top[p.place - 1]
              return (
                <li
                  key={s.id}
                  aria-label={`${p.place}. ${s.displayName}: ${s.stars} sao`}
                  className="flex w-[92px] min-w-0 flex-col items-center gap-1"
                >
                  <img src={reportAvatar(s.id)} alt="" className="size-[52px] rounded-full bg-[#FFF1C9]" />
                  <b className="max-w-full truncate text-[14px]">{s.displayName}</b>
                  <span className="text-[13px] font-black text-sun-ink">{s.stars} ⭐</span>
                  <span
                    aria-hidden="true"
                    className="flex w-full items-center justify-center rounded-t-[12px] font-display text-[22px] font-extrabold text-white"
                    style={{ height: p.height, background: p.color }}
                  >
                    {p.place}
                  </span>
                </li>
              )
            })}
          </ol>
          {rest.length > 0 && (
            <ol start={4} aria-label="Các bạn tiếp theo" className="m-0 flex list-none flex-col p-0">
              {rest.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2.5 py-1.5 text-[14px]">
                  <span className="w-5 text-right font-extrabold text-ink-muted tabular-nums">{i + 4}</span>
                  <img src={reportAvatar(s.id)} alt="" className="size-7 rounded-full bg-[#F2F5FA]" />
                  <b className="min-w-0 flex-1 truncate">{s.displayName}</b>
                  <span className="font-black text-sun-ink tabular-nums">{s.stars} ⭐</span>
                </li>
              ))}
            </ol>
          )}
          {starred.length > 5 && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="cursor-pointer self-start border-0 bg-transparent p-0 font-[inherit] text-[14px] font-bold text-primary hover:underline"
            >
              {all ? 'Thu gọn' : `Xem cả ${starred.length} em`}
            </button>
          )}
        </>
      )}
      {waiting.length > 0 && starred.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold text-ink-muted">Chưa được khen ({waiting.length})</span>
          <ul aria-label="Học sinh chưa được khen" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {waiting.map((s) => (
              <li key={s.id} className="rounded-full bg-[#F2F5FA] px-2.5 py-1 text-[13px] font-bold">
                {s.displayName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ReportCard>
  )
}

const TOP_ROWS = 5

/** "Trò lớp hay chơi": the kinds of game, or the teacher's games, most played first; five, the others on demand. */
export function PlaysCard({ report }: { report: ClassReport }) {
  const [by, setBy] = useState<'kind' | 'game'>('kind')
  const [all, setAll] = useState(false)
  const rows =
    by === 'kind'
      ? report.byTemplate.map((t) => ({ key: t.templateCode, name: t.templateName, to: null as string | null, value: t.activities }))
      : report.topGames.map((g) => ({ key: g.gameCode, name: g.title, to: `/games/${g.gameCode}/start`, value: g.activities }))
  const top = Math.max(1, ...rows.map((r) => r.value))
  const shown = all ? rows : rows.slice(0, TOP_ROWS)
  return (
    <ReportCard
      title="Trò lớp hay chơi"
      action={
        <Switch
          label="Xếp theo"
          value={by}
          options={[
            { value: 'kind', label: 'Loại trò' },
            { value: 'game', label: 'Trò của cô' },
          ]}
          onChange={(v) => {
            setBy(v)
            setAll(false)
          }}
        />
      }
    >
      <ul aria-label={by === 'kind' ? 'Loại trò chơi' : 'Trò chơi được chơi nhiều'} className="m-0 flex list-none flex-col gap-2 p-0">
        {shown.map((r) => (
          <li key={r.key} title={`${r.name}: ${r.value} lần`} className="flex items-center gap-2.5 text-[14px]">
            <span className="w-[130px] shrink-0 truncate font-extrabold">
              {r.to ? (
                <Link to={r.to} className="text-ink hover:text-primary">
                  {r.name}
                </Link>
              ) : (
                r.name
              )}
            </span>
            <span className="h-2 min-w-0 flex-1 rounded-full bg-[#EEF2FA]">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (r.value / top) * 100)}%` }} />
            </span>
            <span className="w-12 shrink-0 text-right font-black tabular-nums">
              {r.value} <span className="text-[12px] font-semibold text-ink-muted">lần</span>
            </span>
          </li>
        ))}
      </ul>
      {rows.length > TOP_ROWS && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="cursor-pointer self-center border-0 bg-transparent p-0 font-[inherit] text-[14px] font-black text-primary hover:underline"
        >
          {all ? 'Thu gọn' : by === 'kind' ? `Xem cả ${rows.length} loại` : `Xem cả ${rows.length} trò`}
        </button>
      )}
    </ReportCard>
  )
}
