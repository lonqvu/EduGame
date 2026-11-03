import { Button, Card, Col, Row, Table } from 'antd'
import { useTranslation } from 'react-i18next'
import { getAdminDashboard } from '@/api/adminApi'
import { usePeriod } from '@/admin/navigation'
import { PeriodPicker } from '@/admin/OverviewPage'
import { PageTitle } from '@/admin/parts'
import { useRemote } from '@/admin/useRemote'
import { LoadError } from '@/components/ui/LoadState'
import { gameName } from '@/i18n/gameNames'
import type { AdminDashboard } from '@/types/api'
import { count, dateTime } from '@/utils/admin'
import { download } from '@/utils/download'
import { periodLabel, toCsv } from '@/utils/reports'

type Day = AdminDashboard['daily'][number]

/** "21/10/2026" */
const dayLabel = (date: string) => dateTime(`${date}T00:00`).slice(0, 10)

/** /admin/reports — "Báo cáo": new accounts and games played day by day, and the most played games; as a CSV file too. */
export function ReportsPage() {
  const { t } = useTranslation()
  const { days, setDays } = usePeriod()
  const { data, loading, error, reload } = useRemote(String(days), (signal) => getAdminDashboard(days, signal))

  const rows = data ? [...data.daily].reverse() : []
  const totals = rows.reduce((sum, d) => ({ signUps: sum.signUps + d.signUps, plays: sum.plays + d.plays }), { signUps: 0, plays: 0 })

  const exportCsv = () => {
    if (!data) return
    const csv = toCsv([
      [t('admin.reports.date'), t('admin.reports.signUps'), t('admin.reports.plays')],
      ...rows.map((d) => [dayLabel(d.date), d.signUps, d.plays]),
      [t('admin.reports.total'), totals.signUps, totals.plays],
      [],
      [t('admin.reports.game'), t('admin.reports.plays')],
      ...data.topTemplates.map((tpl) => [gameName(tpl.templateCode, tpl.templateName), tpl.plays]),
    ])
    download(`bao-cao-lop-vui-${data.from}-${data.to}.csv`, csv)
  }

  return (
    <>
      <PageTitle
        title={t('admin.reports.title')}
        text={data ? periodLabel(data.from, data.to) : t('admin.reports.text')}
        extra={
          <>
            <PeriodPicker days={days} onChange={setDays} />
            <Button onClick={exportCsv} disabled={!data}>
              {t('admin.reports.csv')}
            </Button>
          </>
        }
      />
      {error && !data ? (
        <LoadError onRetry={reload} />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card title={t('admin.reports.byDay')} size="small">
              <Table<Day>
                size="small"
                rowKey="date"
                loading={loading}
                dataSource={rows}
                pagination={{ pageSize: 31, showSizeChanger: false, hideOnSinglePage: true }}
                columns={[
                  { title: t('admin.reports.date'), key: 'date', render: (_, d) => dayLabel(d.date) },
                  { title: t('admin.reports.signUps'), dataIndex: 'signUps', align: 'right', render: (n: number) => count(n) },
                  { title: t('admin.reports.plays'), dataIndex: 'plays', align: 'right', render: (n: number) => count(n) },
                ]}
                summary={() =>
                  rows.length ? (
                    <Table.Summary.Row className="font-semibold">
                      <Table.Summary.Cell index={0}>{t('admin.reports.total')}</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        {count(totals.signUps)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        {count(totals.plays)}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  ) : null
                }
              />
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card title={t('admin.reports.topGames')} size="small">
              <Table
                size="small"
                rowKey="templateCode"
                loading={loading}
                pagination={false}
                dataSource={data?.topTemplates ?? []}
                locale={{ emptyText: t('admin.overview.noPlays') }}
                columns={[
                  { title: t('admin.reports.game'), key: 'name', render: (_, tpl) => gameName(tpl.templateCode, tpl.templateName) },
                  { title: t('admin.reports.plays'), dataIndex: 'plays', align: 'right', width: 110, render: (n: number) => count(n) },
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}
    </>
  )
}
