import { Segmented } from 'antd'
import i18n from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { gameName } from '@/i18n/gameNames'
import { getAdminDashboard } from '@/api/adminApi'
import { GamepadIcon, MessageIcon, UserIcon, UsersIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { AdminCard, AdminHeader } from '@/pages/admin/AdminParts'
import { useRemote } from '@/pages/admin/useRemote'
import { ActivityChart, BarList, StatTile } from '@/pages/reports/ReportParts'
import { count, DASHBOARD_PERIODS } from '@/utils/admin'
import { chartBuckets, periodLabel } from '@/utils/reports'

const PLAY_LABELS = {
  get title() {
    return i18n.t('admin.overview.plays')
  },
  get main() {
    return i18n.t('admin.overview.chartMain')
  },
  get second() {
    return i18n.t('admin.overview.chartSecond')
  },
  get secondTitle() {
    return i18n.t('admin.overview.chartSecondTitle')
  },
}

/** /admin — "Tổng quan": how many teachers use Lớp Vui, what they make and play. The period is in the URL (?days=7). */
export function AdminOverviewPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const days = DASHBOARD_PERIODS.find((p) => String(p.days) === params.get('days'))?.days ?? 30
  const { data, loading, error, reload } = useRemote(String(days), (signal) => getAdminDashboard(days, signal))

  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title={t('admin.overview.title')} text={t('admin.overview.text')} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<number>
          aria-label={t('admin.overview.period')}
          value={days}
          onChange={(value) => setParams(value === 30 ? {} : { days: String(value) }, { replace: true })}
          options={DASHBOARD_PERIODS.map((p) => ({ value: p.days, label: p.label }))}
        />
        {data && <span className="text-[14px] text-ink-muted">{periodLabel(data.from, data.to)}</span>}
      </div>

      {!data ? (
        error ? (
          <LoadError onRetry={reload} />
        ) : (
          <PageLoading />
        )
      ) : (
        <div aria-busy={loading} className={`flex flex-col gap-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label={t('admin.overview.teachers')}
              value={count(data.teachers.total)}
              detail={t('admin.overview.joined', { number: count(data.teachers.joined) })}
              icon={<UsersIcon size={19} />}
              tint="bg-[#E3ECFF] text-primary"
            />
            <StatTile
              label={t('admin.overview.active')}
              value={count(data.teachers.active)}
              detail={t('admin.overview.activeText')}
              icon={<UserIcon size={19} />}
              tint="bg-[#E3F6EC] text-success"
            />
            <StatTile
              label={t('admin.overview.plays')}
              value={count(data.plays)}
              detail={t('admin.overview.playsText')}
              icon={<GamepadIcon size={19} />}
              tint="bg-[#FFF1D6] text-[#B7860B]"
            />
            <Link to="/admin/feedback" className="rounded-[18px] text-ink hover:text-ink focus-visible:ring-2 focus-visible:ring-primary">
              <StatTile
                label={t('admin.overview.unread')}
                value={count(data.newFeedback)}
                detail={t('admin.overview.readFeedback')}
                icon={<MessageIcon size={19} />}
                tint="bg-[#FFE4EA] text-[#D23C6E]"
              />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <AdminCard title={t('admin.overview.playsByDay')}>
              <ActivityChart
                {...chartBuckets(data.daily.map((d) => ({ date: d.date, activities: d.plays, completed: d.signUps })))}
                labels={PLAY_LABELS}
              />
            </AdminCard>
            <AdminCard title={t('admin.overview.topGames')}>
              {data.topTemplates.length ? (
                <BarList
                  unit={t('admin.overview.playsUnit')}
                  rows={data.topTemplates.map((tpl) => {
                    const name = gameName(tpl.templateCode, tpl.templateName)
                    return { key: tpl.templateCode, label: name, value: tpl.plays, title: name }
                  })}
                />
              ) : (
                <p className="m-0 text-[14px] text-ink-muted">{t('admin.overview.noPlays')}</p>
              )}
            </AdminCard>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <AdminCard title={t('admin.overview.content')}>
              <Figures
                rows={[
                  [t('admin.overview.classrooms'), data.content.classrooms],
                  [t('admin.overview.students'), data.content.students],
                  [t('admin.overview.games'), data.content.games],
                  [t('admin.overview.questionSets'), data.content.questionSets],
                ]}
              />
            </AdminCard>
            <AdminCard title={t('admin.overview.accounts')} action={<Link to="/admin/teachers" className="text-[14px] font-bold">{t('admin.overview.seeTeachers')}</Link>}>
              <Figures
                rows={[
                  [t('admin.overview.admins'), data.teachers.admins],
                  [t('admin.overview.locked'), data.teachers.locked],
                  [t('admin.overview.newInPeriod'), data.teachers.joined],
                ]}
              />
            </AdminCard>
          </div>
        </div>
      )}
    </div>
  )
}

function Figures({ rows }: { rows: [string, number][] }) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5 rounded-[14px] bg-[#F6F8FC] px-4 py-3">
          <dt className="text-[13.5px] font-semibold text-ink-soft">{label}</dt>
          <dd className="m-0 text-[24px] font-black tabular-nums">{count(value)}</dd>
        </div>
      ))}
    </dl>
  )
}
