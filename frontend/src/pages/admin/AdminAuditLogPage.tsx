import { Pagination, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { listAdminAuditLog } from '@/api/adminApi'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { AdminCard, AdminHeader } from '@/pages/admin/AdminParts'
import { AuditList } from '@/pages/admin/AuditList'
import { useRemote } from '@/pages/admin/useRemote'
import type { AdminAction } from '@/types/api'
import { ACTION_LABELS, oneOf, pageParam } from '@/utils/admin'

const PAGE_SIZE = 50
const ACTIONS = Object.keys(ACTION_LABELS) as AdminAction[]

/** /admin/audit-log — "Nhật ký": every change an admin made, who made it and when. Nothing here can be changed. */
export function AdminAuditLogPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const action = oneOf<AdminAction | ''>(params.get('action'), ['', ...ACTIONS], '')
  const page = pageParam(params.get('page'))
  const { data, loading, error, reload } = useRemote(`${action}|${page}`, (signal) =>
    listAdminAuditLog({ action: action ? [action] : [], page, size: PAGE_SIZE }, signal),
  )

  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title={t('admin.audit.title')} text={t('admin.audit.text')} />

      <div className="flex flex-wrap items-center gap-3">
        <Select<AdminAction | ''>
          aria-label={t('admin.audit.action')}
          value={action}
          onChange={(value) => setParams(value ? { action: value } : {}, { replace: true })}
          options={[{ value: '', label: t('admin.audit.allActions') }, ...ACTIONS.map((a) => ({ value: a, label: ACTION_LABELS[a] }))]}
          className="w-[240px]"
        />
        {data && <span className="text-[14px] text-ink-muted">{t('admin.audit.rows', { count: data.total })}</span>}
      </div>

      {!data ? (
        error ? (
          <LoadError onRetry={reload} />
        ) : (
          <PageLoading />
        )
      ) : (
        <AdminCard className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <AuditList entries={data.items} withTarget />
          {data.total > PAGE_SIZE && (
            <Pagination
              className="self-center"
              current={page + 1}
              pageSize={PAGE_SIZE}
              total={data.total}
              showSizeChanger={false}
              onChange={(next) => setParams({ ...(action ? { action } : {}), ...(next > 1 ? { page: String(next - 1) } : {}) })}
            />
          )}
        </AdminCard>
      )}
    </div>
  )
}
