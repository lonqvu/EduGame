import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { DisplayPreferences } from '@/components/layout/DisplayPreferences'
import { PageLoading } from '@/components/ui/LoadState'
import { useAuthStore } from '@/store/authStore'

/** Routes inside need a signed-in teacher; otherwise go to /login and come back afterwards. */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status)
  const restore = useAuthStore((s) => s.restore)
  const { pathname, search } = useLocation()

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
  if (status === 'signedOut') {
    return <Navigate to={`/login?from=${encodeURIComponent(pathname + search)}`} replace />
  }
  return (
    <DisplayPreferences>
      <Outlet />
    </DisplayPreferences>
  )
}
