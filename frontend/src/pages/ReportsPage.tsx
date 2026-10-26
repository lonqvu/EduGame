import { Segmented, Select } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getClassReport } from '@/api/reportApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { CheckIcon, ClockIcon, FilledStarIcon, GamepadIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { ActivityChart, BarList, CsvButton, ReportCard, SessionHistory, StatTile } from '@/pages/reports/ReportParts'
import { useClassStore } from '@/store/classStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { ClassReport } from '@/types/api'
import { download } from '@/utils/download'
import {
  chartBuckets,
  completionRate,
  csvFileName,
  durationLabel,
  PERIOD_PRESETS,
  periodLabel,
  presetRange,
  rangeProblem,
  sessionsCsv,
  starsCsv,
  trend,
  type PeriodKey,
} from '@/utils/reports'

const STAR_ROWS = 10

/**
 * /reports — "Báo cáo" of a class over a period: what was played and how it ended, time spent, stars of each student.
 * The class and the period are in the URL (?class=c-3a&period=30, or &from=…&to=… for a custom one), so a report can
 * be bookmarked or reloaded.
 */
export function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const classrooms = useClassStore((s) => s.classrooms)
  const currentCode = useClassStore((s) => s.classroomCode)
  const classStatus = useClassStore((s) => s.status)
  const loadClasses = useClassStore((s) => s.load)
  const loadTeacher = useTeacherStore((s) => s.load)
  const [today] = useState(() => new Date())

  useEffect(() => {
    if (classStatus === 'idle') void loadClasses()
    void loadTeacher()
  }, [classStatus, loadClasses, loadTeacher])

  const code = params.get('class') ?? currentCode ?? classrooms[0]?.code ?? null
  const period = (params.get('period') as PeriodKey | null) ?? '30'
  const preset = PERIOD_PRESETS.find((p) => p.key === period)
  const range = preset ? presetRange(preset.days, today) : { from: params.get('from') ?? '', to: params.get('to') ?? '' }
  const problem = preset ? null : rangeProblem(range.from, range.to)
  const key = `${code}|${range.from}|${range.to}`

  // The report shown, and the request it answers: a new class or period keeps the old one on screen (dimmed) until
  // the new one arrives.
  const [loaded, setLoaded] = useState<{ key: string; report?: ClassReport; error?: unknown }>()
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!code || problem) return
    const controller = new AbortController()
    getClassReport(code, range.from, range.to, controller.signal)
      .then((report) => setLoaded({ key, report }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoaded({ key, error })
      })
    return () => controller.abort()
    // `key` holds the class and the period.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, problem, attempt])

  const update = (next: Record<string, string | null>) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current)
        for (const [k, v] of Object.entries(next)) {
          if (v === null) out.delete(k)
          else out.set(k, v)
        }
        return out
      },
      { replace: true },
    )

  const report = loaded?.report
  const loading = !problem && loaded?.key !== key
  const failed = loaded?.key === key && loaded.error !== undefined

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Báo cáo" text="Lớp đã chơi những gì, kết quả ra sao và các em được khen bao nhiêu sao." />

      {classStatus !== 'ready' && classrooms.length === 0 ? (
        classStatus === 'error' ? (
          <LoadError onRetry={() => void loadClasses()} />
        ) : (
          <PageLoading />
        )
      ) : !code ? (
        <NoClass />
      ) : (
        <>
          <div role="group" aria-label="Bộ lọc báo cáo" className="flex flex-wrap items-center gap-3">
            <Select
              aria-label="Lớp"
              value={code}
              onChange={(value: string) => update({ class: value })}
              options={classrooms.map((c) => ({ value: c.code, label: `Lớp ${c.name}` }))}
              className="w-[180px]"
            />
            <Segmented<PeriodKey>
              aria-label="Khoảng thời gian"
              value={period}
              onChange={(value) =>
                update(
                  value === 'custom'
                    ? { period: 'custom', from: range.from, to: range.to }
                    : { period: value === '30' ? null : value, from: null, to: null },
                )
              }
              options={[...PERIOD_PRESETS.map((p) => ({ value: p.key, label: p.label })), { value: 'custom', label: 'Tùy chọn' }]}
            />
            {period === 'custom' && (
              <span className="flex flex-wrap items-center gap-2 text-[14px] text-ink-soft">
                <input
                  type="date"
                  aria-label="Từ ngày"
                  value={range.from}
                  max={range.to || undefined}
                  onChange={(e) => update({ from: e.target.value })}
                  className="h-9 rounded-[10px] border border-line bg-white px-2.5 font-[inherit] text-ink"
                />
                đến
                <input
                  type="date"
                  aria-label="Đến ngày"
                  value={range.to}
                  min={range.from || undefined}
                  onChange={(e) => update({ to: e.target.value })}
                  className="h-9 rounded-[10px] border border-line bg-white px-2.5 font-[inherit] text-ink"
                />
              </span>
            )}
            {!problem && <span className="text-[14px] font-semibold text-ink-muted">{periodLabel(range.from, range.to)}</span>}
          </div>

          {problem ? (
            <p role="alert" className="m-0 rounded-[14px] bg-[#FFF6F5] px-4 py-3 font-bold text-danger">
              {problem}
            </p>
          ) : failed ? (
            <LoadError onRetry={() => setAttempt((n) => n + 1)} />
          ) : !report ? (
            <PageLoading />
          ) : (
            <div aria-busy={loading} className={`flex flex-col gap-5 transition-opacity ${loading ? 'opacity-50' : ''}`}>
              <ReportBody report={report} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ReportBody({ report }: { report: ClassReport }) {
  const { summary, previous } = report
  const { unit, buckets } = chartBuckets(report.daily)
  const starred = report.students.filter((s) => s.stars > 0)
  const noStars = report.students.filter((s) => s.stars <= 0)
  const [allStars, setAllStars] = useState(false)

  return (
    <>
      <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Hoạt động"
          value={summary.activities.toLocaleString('vi-VN')}
          detail={`${summary.games} trò chơi khác nhau`}
          trend={trend(summary.activities, previous.activities)}
          icon={<GamepadIcon size={19} />}
          tint="bg-[#E3ECFF] text-primary"
        />
        <StatTile
          label="Hoàn thành"
          value={`${completionRate(summary.completed, summary.activities)}%`}
          detail={`${summary.completed}/${summary.activities} trò chơi đến cuối`}
          icon={<CheckIcon size={19} strokeWidth={2.6} />}
          tint="bg-[#DDF5E8] text-success"
        />
        <StatTile
          label="Thời gian chơi"
          value={durationLabel(summary.playMinutes)}
          detail="Tính các trò chơi đã hoàn thành"
          icon={<ClockIcon size={19} />}
          tint="bg-[#EDE4FF] text-[#7448D6]"
        />
        <StatTile
          label="Sao đã thưởng"
          value={summary.stars.toLocaleString('vi-VN')}
          detail={`${starred.length}/${report.students.length} học sinh được khen`}
          trend={trend(summary.stars, previous.stars)}
          icon={<FilledStarIcon size={19} />}
          tint="bg-sun-soft text-sun-ink"
        />
      </div>

      {summary.activities === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-[20px] bg-white p-8 text-center">
          <img src="/assets/illustrations/thanh-tich.png" alt="" className="h-[150px] w-auto" />
          <h2 className="m-0 text-[20px] font-black">Chưa có hoạt động nào trong khoảng thời gian này</h2>
          <p className="m-0 max-w-[460px] text-[14.5px] text-ink-muted">
            Mỗi trò chơi cô mở cho lớp trên màn chiếu sẽ được ghi lại ở đây, cùng kết quả của các đội.
          </p>
          <Link to="/games/new" className="mt-1 rounded-[12px] bg-primary px-5 py-2.5 font-bold text-white hover:text-white hover:brightness-110">
            Tổ chức trò chơi
          </Link>
        </section>
      ) : (
        <>
          <ReportCard
            title={unit === 'day' ? 'Hoạt động theo ngày' : 'Hoạt động theo tuần'}
            text="Số trò chơi đã mở cho lớp. Di chuột hoặc chọn một cột để xem số trò chơi hoàn thành."
          >
            <ActivityChart buckets={buckets} unit={unit} />
          </ReportCard>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ReportCard title="Loại trò chơi" text="Lớp chơi loại trò chơi nào nhiều nhất.">
              <BarList
                unit="lần"
                rows={report.byTemplate.map((t) => ({ key: t.templateCode, label: t.templateName, title: t.templateName, value: t.activities }))}
              />
            </ReportCard>
            <ReportCard title="Trò chơi được chơi nhiều" text="Những trò chơi của cô được mở nhiều nhất.">
              <BarList
                unit="lần"
                rows={report.topGames.map((g) => ({
                  key: g.gameCode,
                  label: (
                    <Link to={`/games/${g.gameCode}/start`} className="text-ink hover:text-primary">
                      {g.title}
                    </Link>
                  ),
                  title: g.title,
                  value: g.activities,
                }))}
              />
            </ReportCard>
          </div>
        </>
      )}

      <ReportCard
        title="Sao của học sinh"
        text={`Sao được thưởng trong kỳ (đã trừ sao thu lại). Lớp có ${report.classroom.studentCount} học sinh.`}
        action={
          report.students.length > 0 && (
            <CsvButton label="Tải CSV sao của học sinh" onClick={() => download(csvFileName(report, 'sao'), starsCsv(report))} />
          )
        }
      >
        {report.students.length === 0 ? (
          <p className="m-0 text-ink-muted">
            Lớp chưa có học sinh. <Link to={`/classes/${report.classroom.code}`}>Thêm học sinh</Link>
          </p>
        ) : starred.length === 0 ? (
          <p className="m-0 text-ink-muted">Chưa em nào được thưởng sao trong kỳ này.</p>
        ) : (
          <>
            <BarList
              unit="sao"
              rows={(allStars ? starred : starred.slice(0, STAR_ROWS)).map((s) => ({
                key: String(s.id),
                label: s.displayName,
                title: s.displayName,
                value: s.stars,
              }))}
            />
            {starred.length > STAR_ROWS && (
              <button
                type="button"
                onClick={() => setAllStars((v) => !v)}
                className="cursor-pointer self-start border-0 bg-transparent p-0 font-[inherit] text-[14px] font-bold text-primary hover:underline"
              >
                {allStars ? 'Thu gọn' : `Xem cả ${starred.length} em`}
              </button>
            )}
          </>
        )}
        {noStars.length > 0 && starred.length > 0 && (
          <div className="flex flex-col gap-2 rounded-[14px] bg-surface-soft p-3.5">
            <span className="text-[14px] font-bold">Chưa được khen trong kỳ ({noStars.length})</span>
            <span className="text-[13px] text-ink-muted">Cô để ý các em này ở hoạt động tới nhé.</span>
            <ul aria-label="Học sinh chưa được khen" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {noStars.map((s) => (
                <li key={s.id} className="rounded-full bg-white px-3 py-1 text-[13.5px] font-semibold">
                  {s.displayName}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ReportCard>

      {report.sessions.length > 0 && (
        <ReportCard
          title="Lịch sử hoạt động"
          text={
            summary.correctAnswers > 0
              ? `${summary.activities} hoạt động · ${summary.correctAnswers} câu trả lời đúng của các đội`
              : `${summary.activities} hoạt động`
          }
          action={<CsvButton label="Tải CSV lịch sử hoạt động" onClick={() => download(csvFileName(report, 'lich-su'), sessionsCsv(report))} />}
        >
          <SessionHistory key={`${report.classroom.code}|${report.from}|${report.to}`} sessions={report.sessions} />
          {summary.activities > report.sessions.length && (
            <p className="m-0 text-[13px] text-ink-muted">Hiện {report.sessions.length} hoạt động gần nhất. Cô chọn khoảng thời gian ngắn hơn để xem các hoạt động cũ.</p>
          )}
        </ReportCard>
      )}
    </>
  )
}

function NoClass() {
  return (
    <section className="flex flex-col items-center gap-3 rounded-[20px] bg-white p-8 text-center">
      <h2 className="m-0 text-[20px] font-black">Cô chưa có lớp nào</h2>
      <p className="m-0 text-ink-muted">Báo cáo được lập theo từng lớp. Cô tạo lớp và chơi cùng các em để xem báo cáo nhé.</p>
      <Link to="/classes" className="rounded-[12px] bg-primary px-5 py-2.5 font-bold text-white hover:text-white hover:brightness-110">
        Đến trang Lớp học
      </Link>
    </section>
  )
}
