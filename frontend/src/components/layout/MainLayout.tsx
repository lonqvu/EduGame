import { App, Drawer } from 'antd'
import { useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import {
  ChartIcon,
  FileTextIcon,
  GamepadIcon,
  HelpIcon,
  HomeIcon,
  MenuIcon,
  SettingsIcon,
  StarIcon,
  UsersIcon,
} from '@/components/ui/icons'

interface NavItem {
  label: string
  icon: ReactNode
  /** Route; items without one are pages still being built. */
  to?: string
  /** Paths that light the item up. */
  match?: (path: string) => boolean
}

const MAIN_NAV: NavItem[] = [
  { label: 'Trang chủ', icon: <HomeIcon size={22} />, to: '/', match: (p) => p === '/' },
  { label: 'Trò chơi', icon: <GamepadIcon size={22} />, to: '/games/new', match: (p) => p.startsWith('/games') },
  { label: 'Bộ câu hỏi', icon: <FileTextIcon size={22} /> },
  { label: 'Lớp học', icon: <UsersIcon size={22} strokeWidth={1.8} /> },
  { label: 'Báo cáo', icon: <ChartIcon size={22} /> },
]

const FOOTER_NAV: NavItem[] = [
  { label: 'Cài đặt', icon: <SettingsIcon size={22} /> },
  { label: 'Trợ giúp', icon: <HelpIcon size={22} /> },
]

/** Teacher screens: sidebar navigation (a drawer on small screens) and the page. */
export function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="flex min-h-full bg-page text-ink">
      <aside className="sticky top-0 hidden h-dvh w-[195px] shrink-0 flex-col bg-white px-2.5 pt-3.5 pb-6 lg:flex">
        <Sidebar onNavigate={() => undefined} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 lg:hidden">
          <Logo />
          <button
            type="button"
            aria-label="Mở menu"
            onClick={() => setMenuOpen(true)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-surface-soft text-ink"
          >
            <MenuIcon size={22} />
          </button>
        </div>

        {isHome ? (
          // The home page lays itself out edge to edge, as in the design.
          <main className="min-w-0 flex-1 px-4 pt-3 pb-6 lg:pr-5 lg:pl-[17px]">
            <Outlet />
          </main>
        ) : (
          <main className="mx-auto flex w-full max-w-[1200px] min-w-0 flex-1 flex-col px-4 pt-7 pb-12 sm:px-8">
            <Outlet />
          </main>
        )}
      </div>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="left"
        size={260}
        closable={false}
        styles={{ body: { padding: '14px 10px 24px', display: 'flex', flexDirection: 'column' } }}
      >
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </Drawer>
    </div>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3 text-ink hover:text-ink">
      <span className="flex size-10 items-center justify-center rounded-[12px] bg-sun shadow-[0_2px_0_#E9B93C]">
        <StarIcon size={22} strokeWidth={2.2} />
      </span>
      <span className="text-[22px] font-black tracking-[-0.01em]">EduGame</span>
    </Link>
  )
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { pathname } = useLocation()
  const { message } = App.useApp()

  const item = (nav: NavItem) => {
    const active = nav.match?.(pathname) ?? false
    const className = `flex h-[46px] w-full items-center gap-3.5 rounded-[12px] px-[18px] text-[15px] ${
      active ? 'bg-[#E3EEFD] font-extrabold text-primary hover:text-primary' : 'font-semibold text-ink hover:bg-surface-soft hover:text-ink'
    }`
    return (
      <li key={nav.label}>
        {nav.to ? (
          <Link to={nav.to} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={className}>
            <span className={active ? 'text-primary' : 'text-ink-soft'}>{nav.icon}</span>
            {nav.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => message.info(`Trang "${nav.label}" đang được hoàn thiện.`)}
            className={`cursor-pointer border-0 bg-transparent font-[inherit] ${className}`}
          >
            <span className="text-ink-soft">{nav.icon}</span>
            {nav.label}
          </button>
        )}
      </li>
    )
  }

  return (
    <nav aria-label="Điều hướng chính" className="flex h-full flex-col">
      <div className="px-2 pb-[22px]">
        <Logo />
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{MAIN_NAV.map(item)}</ul>
      <ul className="m-0 mt-auto flex list-none flex-col gap-1.5 p-0">{FOOTER_NAV.map(item)}</ul>
    </nav>
  )
}
