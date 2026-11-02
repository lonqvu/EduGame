import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { DisplayPreferences } from '@/components/layout/DisplayPreferences'
import { LoginPrompt, LoginRequiredPage } from '@/components/layout/LoginPrompt'
import { PageLoading } from '@/components/ui/LoadState'
import { useAuthStore } from '@/store/authStore'
import { loginOnlyFeature } from '@/store/loginPromptStore'

/**
 * Around every screen of the app: resumes the session first (the stores need to know whether a teacher or a visitor
 * is here), then shows the page to both. A visitor plays games; pages that need an account say so (`RequireAuth`).
 */
export function AuthGate() {
  const status = useAuthStore((s) => s.status)
  const restore = useAuthStore((s) => s.restore)

  useEffect(() => {
    void restore()
  }, [restore])

  if (status === 'unknown') {
    return (
      <div className="h-dvh">
        <PageLoading />
      </div>
    )
  }
  return (
    <DisplayPreferences>
      <Outlet />
      <LoginPrompt />
    </DisplayPreferences>
  )
}

/** Routes inside need a signed-in teacher; a visitor sees "Cần đăng nhập" in their place. */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status)
  const { pathname } = useLocation()
  if (status !== 'signedIn') return <LoginRequiredPage feature={loginOnlyFeature(pathname) ?? 'page'} />
  return <Outlet />
}
