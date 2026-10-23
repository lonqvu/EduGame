import { Tag } from 'antd'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { ChevronRightIcon, HomeIcon } from '@/components/ui/icons'
import type { UserRole, UserStatus } from '@/types/api'
import { ROLE_LABELS, USER_STATUS_LABELS } from '@/utils/admin'

const TABS = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/teachers', label: 'Giáo viên', end: false },
  { to: '/admin/feedback', label: 'Góp ý', end: false },
  { to: '/admin/audit-log', label: 'Nhật ký', end: false },
]

/** Breadcrumb, title and the tabs of "Quản trị". `trail`: pages between "Quản trị" and this one. */
export function AdminHeader({ title, text, trail = [] }: { title: string; text: string; trail?: { to: string; label: string }[] }) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-[min(100%,300px)] flex-1 flex-col">
          <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-3 text-[14.5px] text-ink-soft">
            <Link to="/" aria-label="Trang chủ" className="flex text-[#8A93A8] hover:text-primary">
              <HomeIcon size={20} />
            </Link>
            <Link to="/admin" className="text-ink-soft hover:text-primary">
              Quản trị
            </Link>
            {trail.map((t) => (
              <span key={t.to} className="flex items-center gap-3">
                <ChevronRightIcon size={15} strokeWidth={2.4} />
                <Link to={t.to} className="text-ink-soft hover:text-primary">
                  {t.label}
                </Link>
              </span>
            ))}
            <ChevronRightIcon size={15} strokeWidth={2.4} />
            <span className="font-semibold text-ink">{title}</span>
          </nav>
          <h1 className="m-0 mt-5 text-[32px] leading-[1.1] font-black tracking-[-0.01em] text-[#1A2440]">{title}</h1>
          <p className="m-0 mt-2 text-[14.5px] text-[#4A5470]">{text}</p>
        </div>
        <div className="order-first ml-auto sm:order-none">
          <TopBar />
        </div>
      </div>
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
    </header>
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
