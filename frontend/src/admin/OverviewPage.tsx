import { Card, Col, Empty, Row, Segmented, Statistic, Table, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { getAdminDashboard } from '@/api/adminApi'
import { usePeriod } from '@/admin/navigation'
import { PageTitle } from '@/admin/parts'
import { useRemote } from '@/admin/useRemote'
import { LoadError } from '@/components/ui/LoadState'
import { gameName } from '@/i18n/gameNames'
import type { AdminDashboard } from '@/types/api'
import { count, DASHBOARD_PERIODS, dateTime } from '@/utils/admin'
import { periodLabel } from '@/utils/reports'

export function PeriodPicker({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  const { t } = useTranslation()
  return (
    <Segmented<number>
      aria-label={t('admin.overview.period')}
      value={days}
      onChange={onChange}
      options={DASHBOARD_PERIODS.map((p) => ({ value: p.days, label: p.label }))}
    />
  )
}

/** /admin — "Tổng quan": accounts, what teachers made and how much they played, at a glance. */
export function OverviewPage() {
  const { t } = useTranslation()
  const { days, setDays } = usePeriod()
  const { data, loading, error, reload } = useRemote(String(days), (signal) => getAdminDashboard(days, signal))

  return (
    <>
      <PageTitle
        title={t('admin.overview.title')}
        text={data ? periodLabel(data.from, data.to) : t('admin.overview.text')}
        extra={<PeriodPicker days={days} onChange={setDays} />}
      />
      {error && !data ? (
        <LoadError onRetry={reload} />
      ) : (
        <div className="flex flex-col gap-4">
          <Row gutter={[16, 16]}>
            <Figure title={t('admin.overview.teachers')} value={data?.teachers.total} loading={loading} note={data && t('admin.overview.joined', { number: count(data.teachers.joined) })} />
            <Figure title={t('admin.overview.active')} value={data?.teachers.active} loading={loading} note={t('admin.overview.activeText')} />
            <Figure title={t('admin.overview.plays')} value={data?.plays} loading={loading} note={t('admin.overview.playsText')} />
            <Figure
              title={t('admin.overview.unread')}
              value={data?.newFeedback}
              loading={loading}
              note={<Link to="/admin/feedback">{t('admin.overview.readFeedback')}</Link>}
            />
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card title={t('admin.overview.playsByDay')} size="small" loading={!data}>
                {data && <DailyBars daily={data.daily} />}
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title={t('admin.overview.topGames')} size="small" loading={!data}>
                {data && <TopGames data={data} />}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title={t('admin.overview.content')} size="small" loading={!data}>
                {data && (
                  <Row gutter={[16, 16]}>
                    <Small title={t('admin.overview.classrooms')} value={data.content.classrooms} />
                    <Small title={t('admin.overview.students')} value={data.content.students} />
                    <Small title={t('admin.overview.games')} value={data.content.games} />
                    <Small title={t('admin.overview.questionSets')} value={data.content.questionSets} />
                  </Row>
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                title={t('admin.overview.accounts')}
                size="small"
                loading={!data}
                extra={<Link to="/admin/accounts">{t('admin.overview.seeTeachers')}</Link>}
              >
                {data && (
                  <Row gutter={[16, 16]}>
                    <Small title={t('admin.overview.admins')} value={data.teachers.admins} />
                    <Small title={t('admin.overview.locked')} value={data.teachers.locked} />
                    <Small title={t('admin.overview.newInPeriod')} value={data.teachers.joined} />
                  </Row>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </>
  )
}

function Figure({ title, value, note, loading }: { title: string; value?: number; note?: ReactNode; loading: boolean }) {
  return (
    <Col xs={24} sm={12} xl={6}>
      <Card size="small" loading={loading && value === undefined}>
        <Statistic title={title} value={value ?? 0} formatter={(v) => count(Number(v))} />
        {note && <div className="mt-1 text-[13px] text-[rgba(0,0,0,0.45)]">{note}</div>}
      </Card>
    </Col>
  )
}

function Small({ title, value }: { title: string; value: number }) {
  return (
    <Col span={12}>
      <Statistic title={title} value={value} formatter={(v) => count(Number(v))} styles={{ content: { fontSize: 20 } }} />
    </Col>
  )
}

/** One bar a day for the games played; the tooltip also says how many accounts were made. */
function DailyBars({ daily }: { daily: AdminDashboard['daily'] }) {
  const { t } = useTranslation()
  const max = Math.max(1, ...daily.map((d) => d.plays))
  if (!daily.some((d) => d.plays || d.signUps)) return <Empty description={t('admin.overview.noPlays')} />
  return (
    <div className="flex h-[180px] items-end gap-[2px]">
      {daily.map((d) => (
        <Tooltip
          key={d.date}
          title={`${dateTime(`${d.date}T00:00`).slice(0, 10)}: ${count(d.plays)} ${t('admin.overview.chartMain')}, ${count(d.signUps)} ${t('admin.overview.chartSecond')}`}
        >
          <div className="flex h-full min-w-[3px] flex-1 items-end">
            <div className="w-full rounded-t-sm bg-[#1677FF]" style={{ height: `${Math.max(2, (d.plays / max) * 100)}%`, opacity: d.plays ? 1 : 0.2 }} />
          </div>
        </Tooltip>
      ))}
    </div>
  )
}

function TopGames({ data }: { data: AdminDashboard }) {
  const { t } = useTranslation()
  return (
    <Table
      size="small"
      rowKey="templateCode"
      pagination={false}
      dataSource={data.topTemplates}
      locale={{ emptyText: t('admin.overview.noPlays') }}
      columns={[
        { title: t('admin.reports.game'), key: 'name', render: (_, tpl) => gameName(tpl.templateCode, tpl.templateName) },
        { title: t('admin.reports.plays'), dataIndex: 'plays', align: 'right', width: 100, render: (n: number) => count(n) },
      ]}
    />
  )
}
