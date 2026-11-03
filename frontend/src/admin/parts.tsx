import { Table, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdminAuditEntry, UserRole, UserStatus } from '@/types/api'
import { ACTION_LABELS, auditDetail, dateTime, ROLE_LABELS, USER_STATUS_LABELS } from '@/utils/admin'

/** Title of an admin page, a line under it, and its buttons on the right. */
export function PageTitle({ title, text, extra }: { title: ReactNode; text?: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <Typography.Title level={3} className="!mb-1">
          {title}
        </Typography.Title>
        {text && <Typography.Text type="secondary">{text}</Typography.Text>}
      </div>
      {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
    </div>
  )
}

const STATUS_COLORS: Record<UserStatus, string> = { ACTIVE: 'green', LOCKED: 'red', DELETED: 'default' }

export function StatusTag({ status }: { status: UserStatus }) {
  return <Tag color={STATUS_COLORS[status]}>{USER_STATUS_LABELS[status]}</Tag>
}

export function RoleTag({ role }: { role: UserRole }) {
  return <Tag color={role === 'ADMIN' ? 'blue' : 'default'}>{ROLE_LABELS[role]}</Tag>
}

/** Lines of the admin log, newest first. `withTarget`: also say who or what it was done to. */
export function AuditTable({
  entries,
  withTarget = false,
  loading,
  pagination = false,
}: {
  entries: AdminAuditEntry[]
  withTarget?: boolean
  loading?: boolean
  pagination?: false | { current: number; pageSize: number; total: number; onChange: (page: number) => void }
}) {
  const { t } = useTranslation()
  return (
    <Table<AdminAuditEntry>
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={entries}
      locale={{ emptyText: t('admin.audit.none') }}
      pagination={pagination && { ...pagination, showSizeChanger: false, hideOnSinglePage: true }}
      scroll={{ x: 720 }}
      columns={[
        { title: t('admin.audit.columns.time'), key: 'time', width: 150, render: (_, e) => dateTime(e.createdAt) },
        { title: t('admin.audit.columns.actor'), dataIndex: 'actorName', width: 170 },
        { title: t('admin.audit.columns.action'), key: 'action', width: 200, render: (_, e) => ACTION_LABELS[e.action] ?? e.action },
        ...(withTarget ? [{ title: t('admin.audit.columns.target'), key: 'target', width: 200, render: (_: unknown, e: AdminAuditEntry) => e.targetLabel ?? '—' }] : []),
        { title: t('admin.audit.columns.detail'), key: 'detail', render: (_, e) => auditDetail(e) || '—' },
      ]}
    />
  )
}
