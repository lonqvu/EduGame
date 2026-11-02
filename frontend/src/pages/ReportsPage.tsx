import { Dropdown, Select } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { getClassReport } from '@/api/reportApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { gameRegistry, playPath } from '@/game-engine/registry'
import { HistoryCard, NumberTile, PlaysCard, Pill, StarsCard, Switch, TipsCard } from '@/pages/reports/ReportBlocks'
import { ActivityChart, ReportCard } from '@/pages/reports/ReportParts'
import { useClassStore } from '@/store/classStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { ClassReport } from '@/types/api'
import type { GameType } from '@/types/game'
import { classTitle } from '@/utils/classrooms'
import { download } from '@/utils/download'
import { USE_GAMES } from '@/utils/questionSets'
import {
  chartBuckets,
  completionRate,
  csvFileName,
  MAX_CHART_DAYS,
  PERIOD_PRESETS,
  periodLabel,
  presetRange,
  rangeProblem,
  reportTips,
  shortDuration,
  sessionsCsv,
  starsCsv,
  trendPercent,
  type PeriodKey,
} from '@/utils/reports'

/** Up to this many classes, picked with pills; more, with a list. */
const CLASS_PILLS = 5

/**
 * /reports — "Báo cáo" of a class over a period: what was played and how it ended, time spent, stars of each student,
 * and what to do next. The class and the period are in the URL (?class=c-3a&period=week, or period=custom&from=…&to=…),
 * so a report can be bookmarked or reloaded.
 */
export function ReportsPage() {
  const { t } = useTranslation()
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
  const asked = params.get('period')
  const preset = PERIOD_PRESETS.find((p) => p.key === asked) ?? (asked === 'custom' ? undefined : PERIOD_PRESETS[1])
  const period: PeriodKey = preset?.key ?? 'custom'
  const range = preset ? presetRange(preset.key, today) : { from: params.get('from') ?? '', to: params.get('to') ?? '' }
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
  const pickPeriod = (value: PeriodKey) =>
    update(
      value === 'custom' ? { period: 'custom', from: range.from, to: range.to } : { period: value === 'month' ? null : value, from: null, to: null },
    )

  const report = loaded?.report
  const loading = !problem && loaded?.key !== key
  const failed = loaded?.key === key && loaded.error !== undefined
  const during = preset ? preset.during : t('reports.during.custom')

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('reports.title')}
        text={t('reports.text')}
        actions={report && <DownloadButton report={report} />}
      />

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
          <div
            role="group"
            aria-label={t('reports.filters')}
            className="z-20 flex flex-wrap items-center gap-2 rounded-[16px] bg-white/95 p-2 shadow-[0_4px_14px_rgba(31,42,68,0.07)] backdrop-blur sm:sticky sm:top-0"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 text-[13px] font-extrabold text-ink-muted">{t('reports.class')}</span>
              {classrooms.length <= CLASS_PILLS ? (
                <div role="radiogroup" aria-label={t('reports.class')} className="flex flex-wrap gap-1.5">
                  {classrooms.map((c) => (
                    <Pill key={c.code} on={c.code === code} label={classTitle(c.name)} onClick={() => update({ class: c.code })}>
                      {c.name}
                    </Pill>
                  ))}
                </div>
              ) : (
                <Select
                  aria-label={t('reports.class')}
                  value={code}
                  onChange={(value: string) => update({ class: value })}
                  options={classrooms.map((c) => ({ value: c.code, label: classTitle(c.name) }))}
                  className="w-[160px]"
                />
              )}
            </div>
            <span aria-hidden="true" className="mx-1 hidden h-[26px] w-px bg-line sm:block" />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 text-[13px] font-extrabold text-ink-muted sm:pl-0">{t('reports.period')}</span>
              <div role="radiogroup" aria-label={t('reports.periodLabel')} className="flex flex-wrap gap-1.5">
                {PERIOD_PRESETS.map((p) => (
                  <Pill key={p.key} on={period === p.key} onClick={() => pickPeriod(p.key)}>
                    {p.label}
                  </Pill>
                ))}
                <Pill on={period === 'custom'} onClick={() => pickPeriod('custom')}>
                  {t('reports.custom')}
                </Pill>
              </div>
            </div>
            {period === 'custom' && (
              <span className="flex flex-wrap items-center gap-2 px-1 text-[14px] text-ink-soft">
                <input
                  type="date"
                  aria-label={t('reports.from')}
                  value={range.from}
                  max={range.to || undefined}
                  onChange={(e) => update({ from: e.target.value })}
                  className="h-9 rounded-[10px] border border-line bg-white px-2.5 font-[inherit] text-ink"
                />
                {t('reports.to')}
                <input
                  type="date"
                  aria-label={t('reports.toLabel')}
                  value={range.to}
                  min={range.from || undefined}
                  onChange={(e) => update({ to: e.target.value })}
                  className="h-9 rounded-[10px] border border-line bg-white px-2.5 font-[inherit] text-ink"
                />
              </span>
            )}
            {!problem && <span className="ml-auto px-2 text-[13.5px] font-bold text-ink-muted">{periodLabel(range.from, range.to)}</span>}
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
            <div aria-busy={loading} className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
              <ReportBody key={key} report={report} during={during} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** A question game the class has not played this period, to vary from the one it plays most. */
function untriedGame(played: string[]): string | null {
  return USE_GAMES.find((g) => !played.includes(g.code))?.name ?? null
}

function replayPath(gameCode: string, templateCode: string): string | null {
  return templateCode in gameRegistry ? playPath({ id: gameCode, type: templateCode as GameType }) : null
}

function ReportBody({ report, during }: { report: ClassReport; during: string }) {
  const { t } = useTranslation()
  const { summary, previous } = report
  const days = report.daily.length
  const [chartUnit, setChartUnit] = useState<'day' | 'week'>(days <= 45 ? 'day' : 'week')
  const { unit, buckets } = chartBuckets(report.daily, chartUnit)
  const starred = report.students.filter((s) => s.stars > 0).length
  const tips = reportTips(report, during, { playPath: replayPath, untried: untriedGame })
  const tipsCard = tips.length > 0 && <TipsCard tips={tips} />

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <NumberTile
          icon="🎮"
          tint="#E3ECFF"
          value={summary.activities.toLocaleString('vi-VN')}
          label={t('reports.plays')}
          trend={trendPercent(summary.activities, previous.activities)}
        />
        <NumberTile icon="✅" tint="#DDF5E8" value={`${completionRate(summary.completed, summary.activities)}%`} label={t('reports.completed')} />
        <NumberTile icon="⏱" tint="#EDE4FF" value={shortDuration(summary.playMinutes)} label={t('reports.playTime')} />
        <NumberTile
          icon="⭐"
          tint="#FFF1C9"
          value={summary.stars.toLocaleString('vi-VN')}
          label={t('reports.stars', { starred, total: report.students.length })}
          trend={trendPercent(summary.stars, previous.stars)}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* On a phone the tips come first, before the long blocks. */}
          {tipsCard && <div className="lg:hidden">{tipsCard}</div>}
          {summary.activities === 0 ? (
            <section className="flex flex-col items-center gap-3 rounded-[20px] bg-white p-8 text-center">
              <img src="/assets/illustrations/thanh-tich.png" alt="" className="h-[150px] w-auto" />
              <h2 className="m-0 text-[20px] font-black">{t('reports.emptyTitle')}</h2>
              <p className="m-0 max-w-[460px] text-[14.5px] text-ink-muted">
                {t('reports.emptyText')}
              </p>
              <Link to="/games/new" className="mt-1 rounded-[12px] bg-primary px-5 py-2.5 font-bold text-white hover:text-white hover:brightness-110">
                {t('reports.play')}
              </Link>
            </section>
          ) : (
            <>
              <ReportCard
                title={t('reports.when')}
                action={
                  <Switch
                    label={t('reports.bar')}
                    value={unit}
                    options={[
                      { value: 'day', label: t('reports.byDay'), disabled: days > MAX_CHART_DAYS },
                      { value: 'week', label: t('reports.byWeek'), disabled: days <= 7 },
                    ]}
                    onChange={setChartUnit}
                  />
                }
              >
                <ActivityChart buckets={buckets} unit={unit} stacked />
                <div className="flex flex-wrap gap-4 text-[12.5px] font-bold text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px] bg-primary" />
                    {t('reports.ended')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px] bg-[#C9D7FA]" />
                    {t('reports.stopped')}
                  </span>
                </div>
              </ReportCard>
              <HistoryCard report={report} />
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {tipsCard && <div className="hidden lg:block">{tipsCard}</div>}
          <StarsCard
            report={report}
            action={
              report.students.length > 0 && (
                <Link to={`/classes/${report.classroom.code}`} className="text-[14px] font-black whitespace-nowrap text-primary hover:underline">
                  {t('reports.praise')}
                </Link>
              )
            }
          />
          {summary.activities > 0 && <PlaysCard report={report} />}
        </div>
      </div>
    </>
  )
}

/** "Tải báo cáo": the stars of the students or the history, as CSV files Excel opens in Vietnamese. */
function DownloadButton({ report }: { report: ClassReport }) {
  const { t } = useTranslation()
  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      menu={{
        items: [
          {
            key: 'stars',
            label: t('reports.starsCsv'),
            disabled: report.students.length === 0,
            onClick: () => download(csvFileName(report, 'stars'), starsCsv(report)),
          },
          {
            key: 'history',
            label: t('reports.historyCsv'),
            disabled: report.sessions.length === 0,
            onClick: () => download(csvFileName(report, 'history'), sessionsCsv(report)),
          },
        ],
      }}
    >
      <button
        type="button"
        className="flex h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-[#DCE5F5] bg-white px-4 font-[inherit] text-[14.5px] font-black text-primary hover:border-primary"
      >
        {t('reports.download')}
      </button>
    </Dropdown>
  )
}

function NoClass() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col items-center gap-3 rounded-[20px] bg-white p-8 text-center">
      <h2 className="m-0 text-[20px] font-black">{t('reports.noClassTitle')}</h2>
      <p className="m-0 text-ink-muted">{t('reports.noClassText')}</p>
      <Link to="/classes" className="rounded-[12px] bg-primary px-5 py-2.5 font-bold text-white hover:text-white hover:brightness-110">
        {t('reports.toClasses')}
      </Link>
    </section>
  )
}
