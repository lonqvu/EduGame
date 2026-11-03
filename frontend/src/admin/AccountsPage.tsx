import { Card, Input, Select, Space, Table } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { listAdminTeachers, type TeacherSort } from '@/api/adminApi'
import { accountPath } from '@/admin/navigation'
import { PageTitle, RoleTag, StatusTag } from '@/admin/parts'
import { useRemote } from '@/admin/useRemote'
import { LoadError } from '@/components/ui/LoadState'
import type { AdminTeacherSummary, UserRole, UserStatus } from '@/types/api'
import { dateTime, oneOf, pageParam } from '@/utils/admin'
import { relativeTimeLabel } from '@/utils/dateLabels'

const PAGE_SIZE = 20
const STATUS_FILTERS = ['', 'ACTIVE', 'LOCKED', 'DELETED'] as const
const ROLE_FILTERS = ['', 'TEACHER', 'ADMIN'] as const
const SORTS = ['NEWEST', 'LAST_ACTIVE', 'NAME'] as const

/**
 * /admin/accounts — every account, searched by name or email and filtered; the filters are in the URL, so a list can
 * be reloaded or shared with another admin. A row opens the account.
 */
export function AccountsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const status = oneOf(params.get('status'), STATUS_FILTERS, '')
  const role = oneOf(params.get('role'), ROLE_FILTERS, '')
  const sort = oneOf<TeacherSort>(params.get('sort'), SORTS, 'NEWEST')
  const page = pageParam(params.get('page'))
  const { data, loading, error, reload } = useRemote([q, status, role, sort, page].join('|'), (signal) =>
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
    <>
      <PageTitle
        title={t('admin.nav.accounts')}
        text={data ? t('admin.teachers.accounts', { count: data.total }) : t('admin.teachers.text')}
      />
      <Card size="small">
        <Space wrap className="mb-4" role="group" aria-label={t('admin.teachers.filters')}>
          <Input.Search
            key={q}
            defaultValue={q}
            allowClear
            placeholder={t('admin.teachers.search')}
            aria-label={t('admin.teachers.searchLabel')}
            onSearch={(value) => update({ q: value.trim() })}
            style={{ width: 320 }}
          />
          <Select
            aria-label={t('admin.teachers.status')}
            value={status}
            onChange={(value: string) => update({ status: value })}
            style={{ width: 170 }}
            options={[
              { value: '', label: t('admin.teachers.allStatuses') },
              ...STATUS_FILTERS.filter(Boolean).map((s) => ({ value: s, label: t(`admin.status.${s as UserStatus}`) })),
            ]}
          />
          <Select
            aria-label={t('admin.teachers.role')}
            value={role}
            onChange={(value: string) => update({ role: value })}
            style={{ width: 160 }}
            options={[
              { value: '', label: t('admin.teachers.allRoles') },
              ...ROLE_FILTERS.filter(Boolean).map((r) => ({ value: r, label: t(`admin.roles.${r as UserRole}`) })),
            ]}
          />
          <Select
            aria-label={t('admin.teachers.sort')}
            value={sort}
            onChange={(value: TeacherSort) => update({ sort: value === 'NEWEST' ? '' : value })}
            style={{ width: 180 }}
            options={[
              { value: 'NEWEST', label: t('admin.teachers.newest') },
              { value: 'LAST_ACTIVE', label: t('admin.teachers.lastActive') },
              { value: 'NAME', label: t('admin.teachers.name') },
            ]}
          />
        </Space>

        {error && !data ? (
          <LoadError onRetry={reload} />
        ) : (
          <Table<AdminTeacherSummary>
            rowKey="code"
            size="middle"
            loading={loading}
            dataSource={data?.items ?? []}
            scroll={{ x: 900 }}
            locale={{ emptyText: q || status || role ? t('admin.teachers.noMatch') : t('admin.teachers.none') }}
            onRow={(row) => ({ onClick: () => navigate(accountPath(row.code)), className: 'cursor-pointer' })}
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
                  <div className="flex flex-col">
                    <a href={accountPath(row.code)} onClick={(e) => e.preventDefault()} className="font-semibold">
                      {row.displayName}
                    </a>
                    <span className="text-[12px] text-[rgba(0,0,0,0.45)]">{row.email ?? row.username}</span>
                  </div>
                ),
              },
              { title: t('admin.teachers.role'), key: 'role', width: 140, render: (_, row) => <RoleTag role={row.role} /> },
              { title: t('admin.teachers.status'), key: 'status', width: 150, render: (_, row) => <StatusTag status={row.status} /> },
              { title: t('admin.teachers.classes'), dataIndex: 'classrooms', width: 70, align: 'right' },
              { title: t('admin.teachers.games'), dataIndex: 'games', width: 90, align: 'right' },
              { title: t('admin.teachers.joinedColumn'), key: 'createdAt', width: 110, render: (_, row) => dateTime(row.createdAt).slice(0, 10) },
              {
                title: t('admin.teachers.lastActiveColumn'),
                key: 'lastActiveAt',
                width: 170,
                render: (_, row) => (
                  <span title={dateTime(row.lastActiveAt)}>{row.lastActiveAt ? relativeTimeLabel(row.lastActiveAt) : t('admin.noneYet')}</span>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  )
}
