import { Card, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { listAdminAuditLog } from '@/api/adminApi'
import { AuditTable, PageTitle } from '@/admin/parts'
import { useRemote } from '@/admin/useRemote'
import { LoadError } from '@/components/ui/LoadState'
import type { AdminAction } from '@/types/api'
import { ACTION_LABELS, oneOf, pageParam } from '@/utils/admin'

const PAGE_SIZE = 50
const ACTIONS = Object.keys(ACTION_LABELS) as AdminAction[]

/** /admin/audit-log — "Nhật ký": every change an admin made, who made it and when. Nothing here can be changed. */
export function AuditPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const action = oneOf<AdminAction | ''>(params.get('action'), ['', ...ACTIONS], '')
  const page = pageParam(params.get('page'))
  const { data, loading, error, reload } = useRemote(`${action}|${page}`, (signal) =>
    listAdminAuditLog({ action: action ? [action] : [], page, size: PAGE_SIZE }, signal),
  )

  return (
    <>
      <PageTitle
        title={t('admin.audit.title')}
        text={data ? t('admin.audit.rows', { count: data.total }) : t('admin.audit.text')}
        extra={
          <Select<AdminAction | ''>
            aria-label={t('admin.audit.action')}
            value={action}
            onChange={(value) => setParams(value ? { action: value } : {}, { replace: true })}
            options={[{ value: '', label: t('admin.audit.allActions') }, ...ACTIONS.map((a) => ({ value: a, label: ACTION_LABELS[a] }))]}
            style={{ width: 240 }}
          />
        }
      />
      {error && !data ? (
        <LoadError onRetry={reload} />
      ) : (
        <Card size="small">
          <AuditTable
            entries={data?.items ?? []}
            withTarget
            loading={loading}
            pagination={{
              current: page + 1,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              onChange: (next) => setParams({ ...(action ? { action } : {}), ...(next > 1 ? { page: String(next - 1) } : {}) }),
            }}
          />
        </Card>
      )}
    </>
  )
}
