import { Input, Select, Table } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { listAdminTeachers, type TeacherSort } from '@/api/adminApi'
import { LoadError } from '@/components/ui/LoadState'
import { AdminCard, AdminHeader, RoleTag, StatusTag } from '@/pages/admin/AdminParts'
import { useRemote } from '@/pages/admin/useRemote'
import type { AdminTeacherSummary, UserRole, UserStatus } from '@/types/api'
import { dateTime, oneOf, pageParam } from '@/utils/admin'
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
  const { t } = useTranslation()
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
      <AdminHeader title={t('admin.teachers.title')} text={t('admin.teachers.text')} />

      <AdminCard>
        <div role="group" aria-label={t('admin.teachers.filters')} className="flex flex-wrap items-center gap-3">
          <Input.Search
            key={q}
            defaultValue={q}
            allowClear
            placeholder={t('admin.teachers.search')}
            aria-label={t('admin.teachers.searchLabel')}
            onSearch={(value) => update({ q: value.trim() })}
            className="max-w-[360px] min-w-[220px] flex-1"
          />
          <Select
            aria-label={t('admin.teachers.status')}
            value={status}
            onChange={(value: string) => update({ status: value })}
            options={[
              { value: '', label: t('admin.teachers.allStatuses') },
              { value: 'ACTIVE', label: t('admin.status.ACTIVE') },
              { value: 'LOCKED', label: t('admin.status.LOCKED') },
              { value: 'DELETED', label: t('admin.status.DELETED') },
            ]}
            className="w-[180px]"
          />
          <Select
            aria-label={t('admin.teachers.role')}
            value={role}
            onChange={(value: string) => update({ role: value })}
            options={[
              { value: '', label: t('admin.teachers.allRoles') },
              { value: 'TEACHER', label: t('admin.roles.TEACHER') },
              { value: 'ADMIN', label: t('admin.roles.ADMIN') },
            ]}
            className="w-[160px]"
          />
          <Select
            aria-label={t('admin.teachers.sort')}
            value={sort}
            onChange={(value: TeacherSort) => update({ sort: value === 'NEWEST' ? '' : value })}
            options={[
              { value: 'NEWEST', label: t('admin.teachers.newest') },
              { value: 'LAST_ACTIVE', label: t('admin.teachers.lastActive') },
              { value: 'NAME', label: t('admin.teachers.name') },
            ]}
            className="w-[190px]"
          />
          {data && <span className="text-[14px] text-ink-muted">{t('admin.teachers.accounts', { count: data.total })}</span>}
        </div>

        {error && !data ? (
          <LoadError onRetry={reload} />
        ) : (
          <Table<AdminTeacherSummary>
            rowKey="code"
            loading={loading}
            dataSource={data?.items ?? []}
            scroll={{ x: 820 }}
            locale={{ emptyText: q || status || role ? t('admin.teachers.noMatch') : t('admin.teachers.none') }}
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
                title: t('admin.teachers.teacher'),
                key: 'teacher',
                render: (_, row) => (
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/teachers/${encodeURIComponent(row.code)}`} className="font-bold">
                        {row.displayName}
                      </Link>
                      <RoleTag role={row.role} />
                    </span>
                    <span className="text-[13px] text-ink-muted">{row.email ?? row.username}</span>
                  </div>
                ),
              },
              { title: t('admin.teachers.status'), key: 'status', width: 150, render: (_, row) => <StatusTag status={row.status} /> },
              { title: t('admin.teachers.classes'), dataIndex: 'classrooms', width: 70, align: 'right' },
              { title: t('admin.teachers.games'), dataIndex: 'games', width: 90, align: 'right' },
              {
                title: t('admin.teachers.joinedColumn'),
                key: 'createdAt',
                width: 150,
                render: (_, row) => <span className="text-[13.5px]">{dateTime(row.createdAt).slice(0, 10)}</span>,
              },
              {
                title: t('admin.teachers.lastActiveColumn'),
                key: 'lastActiveAt',
                width: 170,
                render: (_, row) => (
                  <span className="text-[13.5px]" title={dateTime(row.lastActiveAt)}>
                    {row.lastActiveAt ? relativeTimeLabel(row.lastActiveAt) : t('admin.noneYet')}
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
