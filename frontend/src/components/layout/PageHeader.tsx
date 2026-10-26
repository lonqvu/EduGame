import type { ReactNode } from 'react'
import { TopBar } from '@/components/layout/TopBar'

interface PageHeaderProps {
  title: ReactNode
  text?: ReactNode
  /** Beside the title, e.g. "Đã lưu". */
  badge?: ReactNode
  /** The page's main buttons, beside the account chip. */
  actions?: ReactNode
}

/**
 * The top of every page of the menu: title, one line on what the page is for, its buttons and the account chip. The
 * menu already says where the teacher is, so no "Trang chủ ›" trail; a page inside another one (a class, a question
 * set) puts a `BackLink` to it above instead.
 */
export function PageHeader({ title, text, badge, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
      <div className="flex min-w-[min(100%,300px)] flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[28px] leading-tight font-black text-[#1A2440] sm:text-[32px]">{title}</h1>
          {badge}
        </div>
        {text && <p className="m-0 mt-1 text-[14.5px] text-ink-soft">{text}</p>}
      </div>
      {actions}
      {/* Above the title on phones, so the title keeps the full width. */}
      <div className="order-first ml-auto sm:order-none">
        <TopBar />
      </div>
    </header>
  )
}
