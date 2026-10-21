import { Segmented } from 'antd'
import { Link, useSearchParams } from 'react-router'
import { getAdminDashboard } from '@/api/adminApi'
import { GamepadIcon, MessageIcon, UserIcon, UsersIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { AdminCard, AdminHeader } from '@/pages/admin/AdminParts'
import { useRemote } from '@/pages/admin/useRemote'
import { ActivityChart, BarList, StatTile } from '@/pages/reports/ReportParts'
import { count, DASHBOARD_PERIODS } from '@/utils/admin'
import { chartBuckets, periodLabel } from '@/utils/reports'

const PLAY_LABELS = { title: 'Lượt chơi', main: 'lượt chơi', second: 'giáo viên mới', secondTitle: 'Giáo viên mới' }

/** /admin — "Tổng quan": how many teachers use Lớp Vui, what they make and play. The period is in the URL (?days=7). */
export function AdminOverviewPage() {
  const [params, setParams] = useSearchParams()
  const days = DASHBOARD_PERIODS.find((p) => String(p.days) === params.get('days'))?.days ?? 30
  const { data, loading, error, reload } = useRemote(String(days), (signal) => getAdminDashboard(days, signal))

  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title="Tổng quan" text="Giáo viên dùng Lớp Vui thế nào: tài khoản, nội dung đã tạo và lượt chơi." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<number>
          aria-label="Khoảng thời gian"
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
              label="Giáo viên"
              value={count(data.teachers.total)}
              detail={`+${count(data.teachers.joined)} tài khoản mới trong kỳ`}
              icon={<UsersIcon size={19} />}
              tint="bg-[#E3ECFF] text-primary"
            />
            <StatTile
              label="Đang hoạt động"
              value={count(data.teachers.active)}
              detail="Đã vào Lớp Vui trong kỳ"
              icon={<UserIcon size={19} />}
              tint="bg-[#E3F6EC] text-success"
            />
            <StatTile
              label="Lượt chơi"
              value={count(data.plays)}
              detail="Trò chơi đã mở cho lớp"
              icon={<GamepadIcon size={19} />}
              tint="bg-[#FFF1D6] text-[#B7860B]"
            />
            <Link to="/admin/feedback" className="rounded-[18px] text-ink hover:text-ink focus-visible:ring-2 focus-visible:ring-primary">
              <StatTile
                label="Góp ý chưa đọc"
                value={count(data.newFeedback)}
                detail="Xem góp ý →"
                icon={<MessageIcon size={19} />}
                tint="bg-[#FFE4EA] text-[#D23C6E]"
              />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <AdminCard title="Lượt chơi theo ngày">
              <ActivityChart
                {...chartBuckets(data.daily.map((d) => ({ date: d.date, activities: d.plays, completed: d.signUps })))}
                labels={PLAY_LABELS}
              />
            </AdminCard>
            <AdminCard title="Trò được chơi nhiều">
              {data.topTemplates.length ? (
                <BarList
                  unit="lượt"
                  rows={data.topTemplates.map((t) => ({ key: t.templateCode, label: t.templateName, value: t.plays, title: t.templateName }))}
                />
              ) : (
                <p className="m-0 text-[14px] text-ink-muted">Chưa có lượt chơi nào trong kỳ.</p>
              )}
            </AdminCard>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <AdminCard title="Nội dung đang có">
              <Figures
                rows={[
                  ['Lớp học', data.content.classrooms],
                  ['Học sinh', data.content.students],
                  ['Trò chơi', data.content.games],
                  ['Bộ câu hỏi', data.content.questionSets],
                ]}
              />
            </AdminCard>
            <AdminCard title="Tài khoản" action={<Link to="/admin/teachers" className="text-[14px] font-bold">Xem giáo viên →</Link>}>
              <Figures
                rows={[
                  ['Quản trị viên', data.teachers.admins],
                  ['Đang bị khoá', data.teachers.locked],
                  ['Mới trong kỳ', data.teachers.joined],
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
