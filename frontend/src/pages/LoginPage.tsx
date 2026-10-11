import { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { AuthLayout } from '@/pages/login/authUi'
import { LOGIN_SHOWCASE } from '@/pages/login/showcaseContent'
import { LoginForm } from '@/pages/login/LoginForm'
import { useAuthStore } from '@/store/authStore'
import { safeRedirect } from '@/utils/safeRedirect'

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const status = useAuthStore((s) => s.status)
  const restore = useAuthStore((s) => s.restore)
  const target = safeRedirect(params.get('from'))

  // Still signed in from an earlier visit (refresh token cookie): skip the form.
  useEffect(() => {
    void restore()
  }, [restore])

  if (status === 'signedIn') return <Navigate to={target} replace />

  return (
    <AuthLayout showcase={LOGIN_SHOWCASE} showHelp>
      <LoginForm onSignedIn={() => navigate(target, { replace: true })} />
    </AuthLayout>
  )
}
