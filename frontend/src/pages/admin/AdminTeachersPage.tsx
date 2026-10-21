import { Input, Select, Table } from 'antd'
import { Link, useSearchParams } from 'react-router'
import { listAdminTeachers, type TeacherSort } from '@/api/adminApi'
import { LoadError } from '@/components/ui/LoadState'
import { AdminCard, AdminHeader, RoleTag, StatusTag } from '@/pages/admin/AdminParts'
import { useRemote } from '@/pages/admin/useRemote'
import type { AdminTeacherSummary, UserRole, UserStatus } from '@/types/api'
import { count, dateTime, oneOf, pageParam } from '@/utils/admin'
import { relativeTimeLabel } from '@/utils/dateLabels'

const PAGE_SIZE = 20
const STATUS_FILTERS = ['', 'ACTIVE', 'LOCKED', 'DELETED'] as const
const ROLE_FILTERS = ['', 'TEACHER', 'ADMIN'] as const
const SORTS = ['NEWEST', 'LAST_ACTIVE', 'NAME'] as const

/**
 * /admin/teachers — every account, searched by name or email and filtered; the filters are in the URL, so a list can
 * be reloaded or shared with another admin.
 */
export function AdminTeachersPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const status = oneOf(params.get('status'), STATUS_FILTERS, '')
  const role = oneOf(params.get('role'), ROLE_FILTERS, '')
  const sort = oneOf<TeacherSort>(params.get('sort'), SORTS, 'NEWEST')
  const page = pageParam(params.get('page'))
  const key = [q, status, role, sort, page].join('|')
  const { data, loading, error, reload } = useRemote(key, (signal) =>
    listAdminTeachers(
      {
        q,
        status: status ? [status as UserStatus] : undefined,
        role: role ? [role as UserRole] : undefined,
        sort,
        page,
        size: PAGE_SIZE,
      },
      signal,
    ),
  )

  /** A new filter starts again from the first page. */
  const update = (next: Record<string, string>) =>
    setParams(
      (current) => {
        const out = new URLSearchParams(current)
        for (const [k, v] of Object.entries(next)) {
          if (v) out.set(k, v)
          else out.delete(k)
        }
        if (!('page' in next)) out.delete('page')
        return out
      },
      { replace: true },
    )

  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title="Giáo viên" text="Tìm tài khoản, xem giáo viên đã dùng Lớp Vui thế nào, khoá hoặc mở khoá khi cần." />

      <AdminCard>
        <div role="group" aria-label="Lọc giáo viên" className="flex flex-wrap items-center gap-3">
          <Input.Search
            key={q}
            defaultValue={q}
            allowClear
            placeholder="Tìm theo tên, tên đăng nhập hoặc email"
            aria-label="Tìm giáo viên"
            onSearch={(value) => update({ q: value.trim() })}
            className="max-w-[360px] min-w-[220px] flex-1"
          />
          <Select
            aria-label="Trạng thái"
            value={status}
            onChange={(value: string) => update({ status: value })}
            options={[
              { value: '', label: 'Mọi trạng thái' },
              { value: 'ACTIVE', label: 'Đang hoạt động' },
              { value: 'LOCKED', label: 'Đã khoá' },
              { value: 'DELETED', label: 'Đã xoá' },
            ]}
            className="w-[180px]"
          />
          <Select
            aria-label="Vai trò"
            value={role}
            onChange={(value: string) => update({ role: value })}
            options={[
              { value: '', label: 'Mọi vai trò' },
              { value: 'TEACHER', label: 'Giáo viên' },
              { value: 'ADMIN', label: 'Quản trị viên' },
            ]}
            className="w-[160px]"
          />
          <Select
            aria-label="Sắp xếp"
            value={sort}
            onChange={(value: TeacherSort) => update({ sort: value === 'NEWEST' ? '' : value })}
            options={[
              { value: 'NEWEST', label: 'Mới tham gia trước' },
              { value: 'LAST_ACTIVE', label: 'Hoạt động gần đây' },
              { value: 'NAME', label: 'Tên A → Z' },
            ]}
            className="w-[190px]"
          />
          {data && <span className="text-[14px] text-ink-muted">{count(data.total)} tài khoản</span>}
        </div>

        {error && !data ? (
          <LoadError onRetry={reload} />
        ) : (
          <Table<AdminTeacherSummary>
            rowKey="code"
            loading={loading}
            dataSource={data?.items ?? []}
            scroll={{ x: 820 }}
            locale={{ emptyText: q || status || role ? 'Không có tài khoản nào phù hợp.' : 'Chưa có tài khoản nào.' }}
            pagination={{
              current: page + 1,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              showSizeChanger: false,
              hideOnSinglePage: true,
              onChange: (next) => update({ page: next > 1 ? String(next - 1) : '' }),
            }}
            columns={[
              {
                title: 'Giáo viên',
                key: 'teacher',
                render: (_, t) => (
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/teachers/${encodeURIComponent(t.code)}`} className="font-bold">
                        {t.displayName}
                      </Link>
                      <RoleTag role={t.role} />
                    </span>
                    <span className="text-[13px] text-ink-muted">{t.email ?? t.username}</span>
                  </div>
                ),
              },
              { title: 'Trạng thái', key: 'status', width: 150, render: (_, t) => <StatusTag status={t.status} /> },
              { title: 'Lớp', dataIndex: 'classrooms', width: 70, align: 'right' },
              { title: 'Trò chơi', dataIndex: 'games', width: 90, align: 'right' },
              {
                title: 'Tham gia',
                key: 'createdAt',
                width: 150,
                render: (_, t) => <span className="text-[13.5px]">{dateTime(t.createdAt).slice(0, 10)}</span>,
              },
              {
                title: 'Hoạt động gần nhất',
                key: 'lastActiveAt',
                width: 170,
                render: (_, t) => (
                  <span className="text-[13.5px]" title={dateTime(t.lastActiveAt)}>
                    {t.lastActiveAt ? relativeTimeLabel(t.lastActiveAt) : 'Chưa dùng'}
                  </span>
                ),
              },
            ]}
          />
        )}
      </AdminCard>
    </div>
  )
}
