import { App, Drawer } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router'
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { TopBar } from '@/components/layout/TopBar'
import {
  ChartIcon,
  FileTextIcon,
  GamepadIcon,
  HelpIcon,
  HomeIcon,
  LockIcon,
  MenuIcon,
  MessageIcon,
  SettingsIcon,
  ShieldIcon,
  ToolboxIcon,
  UsersIcon,
} from '@/components/ui/icons'
import { BrandLogo } from '@/components/ui/BrandLogo'
import type { Translation } from '@/i18n/locales/vi'
import { useAuthStore } from '@/store/authStore'
import { useFeedbackStore } from '@/store/feedbackStore'
import { loginOnlyFeature } from '@/store/loginPromptStore'
import { useTeacherStore } from '@/store/teacherStore'

type NavKey = `nav.${keyof Translation['nav']}`

interface NavItem {
  /** Key of its name in the translations. */
  label: NavKey
  icon: ReactNode
  /** Route; items without one are pages still being built. */
  to?: string
  /** Paths that light the item up. */
  match?: (path: string) => boolean
  /** A button instead of a page ("Góp ý" opens its dialog). */
  action?: () => void
  /** Key of its accessible name, when the label is not enough. */
  ariaLabel?: NavKey
  /** Just added: "Mới" beside it. */
  isNew?: boolean
}

const MAIN_NAV: NavItem[] = [
  { label: 'nav.home', icon: <HomeIcon size={22} />, to: '/', match: (p) => p === '/' },
  { label: 'nav.games', icon: <GamepadIcon size={22} />, to: '/games/new', match: (p) => p.startsWith('/games') },
  { label: 'nav.questionSets', icon: <FileTextIcon size={22} />, to: '/question-sets', match: (p) => p.startsWith('/question-sets') },
  { label: 'nav.classes', icon: <UsersIcon size={22} strokeWidth={1.8} />, to: '/classes', match: (p) => p.startsWith('/classes') },
  { label: 'nav.reports', icon: <ChartIcon size={22} />, to: '/reports', match: (p) => p.startsWith('/reports') },
  { label: 'nav.utilities', icon: <ToolboxIcon size={22} />, to: '/utilities', match: (p) => p.startsWith('/utilities'), isNew: true },
]

/** Only for accounts with the role ADMIN (the API refuses everyone else too). */
const ADMIN_NAV: NavItem = { label: 'nav.admin', icon: <ShieldIcon size={22} />, to: '/admin', match: (p) => p.startsWith('/admin') }

const FOOTER_NAV: NavItem[] = [
  {
    label: 'nav.feedback',
    icon: <MessageIcon size={22} />,
    ariaLabel: 'nav.feedbackLabel',
    // Visitors too: a teacher's goes with their account, a visitor's without one.
    action: () => useFeedbackStore.getState().openFeedback(),
  },
  { label: 'nav.settings', icon: <SettingsIcon size={22} />, to: '/settings', match: (p) => p.startsWith('/settings') },
  { label: 'nav.help', icon: <HelpIcon size={22} /> },
]

/** Teacher screens: sidebar navigation (a drawer on small screens), with "Góp ý" always at hand, and the page. */
export function MainLayout() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  // Pages laid out edge to edge, as in their designs; the others keep a centered column. Both start at the same place, so the
  // title does not jump when the menu goes from one to the other.
  const fullWidth =
    pathname === '/' ||
    pathname === '/games/new' ||
    pathname === '/reports' ||
    pathname.startsWith('/utilities') ||
    pathname.startsWith('/classes') ||
    pathname.startsWith('/question-sets')

  return (
    <div className="flex min-h-full bg-page text-ink">
      {/* White all the way down however long the page; the menu itself stays in view while it scrolls. */}
      <aside className="hidden w-[195px] shrink-0 bg-white lg:block">
        <div className="sticky top-0 flex h-dvh flex-col px-2.5 pt-3.5 pb-6">
          <Sidebar onNavigate={() => undefined} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 bg-white px-4 py-3 lg:hidden">
          <Logo />
          {/* The account, or "Đăng nhập", in this bar on small screens; the pages show it beside their title on wide ones. */}
          <div className="ml-auto">
            <TopBar compact />
          </div>
          <button
            type="button"
            aria-label={t('nav.openMenu')}
            onClick={() => setMenuOpen(true)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-surface-soft text-ink"
          >
            <MenuIcon size={22} />
          </button>
        </div>

        {fullWidth ? (
          <main key={pathname} className="min-w-0 flex-1 animate-[page-in_220ms_ease-out] px-4 pt-3 pb-20 lg:pr-5 lg:pl-[17px]">
            <Outlet />
          </main>
        ) : (
          <main
            key={pathname}
            className="mx-auto flex w-full max-w-[1200px] min-w-0 flex-1 animate-[page-in_220ms_ease-out] flex-col px-4 pt-3 pb-20 lg:pr-5 lg:pl-[17px]"
          >
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
        {/* On phones the bar at the top has no room for it. */}
        <LanguageSwitch look="row" className="mt-3 sm:hidden" />
      </Drawer>

      <FeedbackDialog />
    </div>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex text-ink hover:text-ink">
      <BrandLogo />
    </Link>
  )
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { message } = App.useApp()
  const isAdmin = useTeacherStore((s) => s.teacher?.isAdmin ?? false)
  const loadTeacher = useTeacherStore((s) => s.load)
  // A visitor sees every page, those that need an account with a lock (clicking one says so: LoginPrompt).
  const guest = useAuthStore((s) => s.status !== 'signedIn')

  useEffect(() => {
    void loadTeacher()
  }, [loadTeacher])

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
            <span className="whitespace-nowrap">{t(nav.label)}</span>
            {guest && loginOnlyFeature(nav.to) && <LockIcon size={15} className="ml-auto text-ink-muted" />}
            {nav.isNew && (
              <span className="ml-auto shrink-0 rounded-full bg-[#2E9E6A] px-1.5 py-px text-[10.5px] font-black text-white">{t('nav.isNew')}</span>
            )}
          </Link>
        ) : (
          <button
            type="button"
            aria-label={nav.ariaLabel && t(nav.ariaLabel)}
            onClick={() => {
              onNavigate()
              if (nav.action) nav.action()
              else message.info(t('nav.comingSoon', { page: t(nav.label) }))
            }}
            className={`cursor-pointer border-0 bg-transparent font-[inherit] ${className}`}
          >
            <span className="text-ink-soft">{nav.icon}</span>
            {t(nav.label)}
          </button>
        )}
      </li>
    )
  }

  return (
    <nav aria-label={t('nav.main')} className="flex h-full flex-col">
      <div className="px-2 pb-[22px]">
        <Logo />
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{MAIN_NAV.map(item)}</ul>
      <ul className="m-0 mt-auto flex list-none flex-col gap-1.5 p-0">{(isAdmin ? [ADMIN_NAV, ...FOOTER_NAV] : FOOTER_NAV).map(item)}</ul>
    </nav>
  )
}
