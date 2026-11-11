import type { ReactNode } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { BackLink } from '@/components/ui/BackLink'

interface PageHeaderProps {
  title: ReactNode
  text?: ReactNode
  /** Beside the title, e.g. "Đã lưu". */
  badge?: ReactNode
  /** The page's main buttons, beside the account chip. */
  actions?: ReactNode
  /** A page inside another one: "‹ Tiện ích" above the title, back to it. */
  back?: { to: string; label: string }
}

/**
 * The top of every page of the menu: title, one line on what the page is for, its buttons and the account chip. The
 * menu already says where the teacher is, so no "Trang chủ ›" trail; a page inside another one puts `back` above
 * its title. The account chip stays at the top right whatever the page, so it does not move between pages.
 */
export function PageHeader({ title, text, badge, actions, back }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
      <div className="flex min-w-[min(100%,300px)] flex-1 flex-col">
        {back && (
          <div className="mb-2 flex">
            <BackLink to={back.to} label={back.label} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[28px] leading-tight font-black text-[#1A2440] sm:text-[32px]">{title}</h1>
          {badge}
        </div>
        {text && <p className="m-0 mt-1 text-[14.5px] text-ink-soft">{text}</p>}
      </div>
      {actions}
      {/* On small screens the account is in the bar at the top of the screen (MainLayout). */}
      <div className="hidden lg:block">
        <TopBar />
      </div>
    </header>
  )
}

/**
 * "‹ Danh sách lớp học" with the account chip on its right: the top of a page inside another one whose title sits in
 * its own block below (a class, a question set), so the chip is where every page has it.
 */
export function BackBar({ to, label }: { to: string; label: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <BackLink to={to} label={label} />
      {/* On small screens the account is in the bar at the top of the screen (MainLayout). */}
      <div className="hidden lg:block">
        <TopBar />
      </div>
    </div>
  )
}
