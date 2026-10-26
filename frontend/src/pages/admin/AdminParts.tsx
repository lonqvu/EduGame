import { Tag } from 'antd'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { BackLink } from '@/components/ui/BackLink'
import type { UserRole, UserStatus } from '@/types/api'
import { ROLE_LABELS, USER_STATUS_LABELS } from '@/utils/admin'

const TABS = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/teachers', label: 'Giáo viên', end: false },
  { to: '/admin/feedback', label: 'Góp ý', end: false },
  { to: '/admin/audit-log', label: 'Nhật ký', end: false },
]

/** Title and the tabs of "Quản trị". `back`: the page this one is inside, e.g. a teacher's in "Giáo viên". */
export function AdminHeader({ title, text, back }: { title: string; text: string; back?: { to: string; label: string } }) {
  return (
    <div className="flex flex-col gap-4">
      {back && <BackLink to={back.to} label={back.label} />}
      <PageHeader title={title} text={text} />
      <nav aria-label="Mục quản trị" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `-mb-px shrink-0 border-b-[3px] px-4 py-2.5 text-[15px] whitespace-nowrap ${
                isActive ? 'border-primary font-extrabold text-primary hover:text-primary' : 'border-transparent font-semibold text-ink-soft hover:text-ink'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/** White block of the admin pages. */
export function AdminCard({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section
      aria-label={title}
      className={`flex min-w-0 flex-col gap-4 rounded-[20px] bg-white p-[18px] shadow-[0_1px_2px_rgba(31,42,68,0.04)] sm:p-[22px] ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="m-0 text-[18px] leading-tight font-black">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

const STATUS_COLORS: Record<UserStatus, string> = { ACTIVE: 'green', LOCKED: 'red', DELETED: 'default' }

export function StatusTag({ status }: { status: UserStatus }) {
  return (
    <Tag color={STATUS_COLORS[status]} className="m-0">
      {USER_STATUS_LABELS[status]}
    </Tag>
  )
}

export function RoleTag({ role }: { role: UserRole }) {
  return role === 'ADMIN' ? (
    <Tag color="blue" className="m-0">
      {ROLE_LABELS.ADMIN}
    </Tag>
  ) : null
}
