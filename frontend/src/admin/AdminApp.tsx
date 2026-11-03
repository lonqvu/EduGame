import { App, Button, ConfigProvider, Layout, Menu, Result, Spin, type ThemeConfig } from 'antd'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { LoadError } from '@/components/ui/LoadState'
import { useAuthStore } from '@/store/authStore'
import { useTeacherStore } from '@/store/teacherStore'

/** A plain admin look, apart from the teachers' app: antd's own theme, system font, small controls. */
const ADMIN_THEME: ThemeConfig = {
  inherit: false,
  token: {
    colorPrimary: '#1677FF',
    fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
    borderRadius: 6,
  },
}

const FONT = ADMIN_THEME.token?.fontFamily

/** The menu; names in admin.nav.*. */
const SECTIONS = [
  { to: '/admin', label: 'overview' },
  { to: '/admin/reports', label: 'reports' },
  { to: '/admin/accounts', label: 'accounts' },
  { to: '/admin/feedback', label: 'feedback' },
  { to: '/admin/audit-log', label: 'audit' },
] as const

/** The section a path is in: the longest menu path it starts with ("/admin/accounts/T-12" → accounts). */
const sectionOf = (pathname: string) =>
  [...SECTIONS].sort((a, b) => b.to.length - a.to.length).find((s) => pathname === s.to || pathname.startsWith(`${s.to}/`))?.to ?? '/admin'

/**
 * /admin: the admin area, in a frame of its own (not the teachers' sidebar). A visitor is sent to sign in and comes
 * back here; a teacher who is not an admin is told so (the API refuses them anyway).
 */
export function AdminApp() {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const logout = useAuthStore((s) => s.logout)
  const teacher = useTeacherStore((s) => s.teacher)
  const teacherStatus = useTeacherStore((s) => s.status)
  const loadTeacher = useTeacherStore((s) => s.load)

  useEffect(() => {
    if (status === 'signedIn') void loadTeacher()
  }, [status, loadTeacher])

  let body
  if (status !== 'signedIn') {
    body = <Navigate to={`/login?from=${encodeURIComponent(pathname + search)}`} replace />
  } else if (!teacher) {
    body = teacherStatus === 'error' ? <LoadError onRetry={() => void loadTeacher()} /> : <Centered><Spin size="large" /></Centered>
  } else if (!teacher.isAdmin) {
    body = (
      <Centered>
        <Result
          status="403"
          title={t('load.adminOnlyTitle')}
          subTitle={t('load.adminOnlyText')}
          extra={<Link to="/">{t('admin.shell.backToApp')}</Link>}
        />
      </Centered>
    )
  } else {
    body = (
      <Layout className="min-h-dvh">
        <Layout.Sider width={220} breakpoint="lg" collapsedWidth={0} theme="dark">
          <div className="flex h-14 items-center gap-2 px-5 text-[16px] font-semibold text-white">
            {t('admin.shell.brand')}
            <span className="rounded bg-white/15 px-1.5 py-0.5 text-[12px] font-normal">{t('admin.shell.area')}</span>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            aria-label={t('admin.shell.menu')}
            selectedKeys={[sectionOf(pathname)]}
            onClick={({ key }) => navigate(key)}
            items={SECTIONS.map((s) => ({ key: s.to, label: t(`admin.nav.${s.label}`) }))}
          />
        </Layout.Sider>
        <Layout>
          <Layout.Header className="flex items-center justify-end gap-4 border-b border-[#f0f0f0] !bg-white !px-6">
            <span className="text-[14px] text-[#595959]">{teacher.name}</span>
            <Link to="/" className="text-[14px]">
              {t('admin.shell.backToApp')}
            </Link>
            <Button size="small" onClick={() => void logout()}>
              {t('admin.shell.signOut')}
            </Button>
          </Layout.Header>
          <Layout.Content className="p-6">
            <Outlet />
          </Layout.Content>
        </Layout>
      </Layout>
    )
  }

  return (
    <ConfigProvider theme={ADMIN_THEME}>
      <App>
        <div style={{ fontFamily: FONT }} className="bg-[#f5f5f5] text-[14px] text-[rgba(0,0,0,0.88)]">
          {body}
        </div>
      </App>
    </ConfigProvider>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center">{children}</div>
}
