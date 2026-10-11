import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { AuthLayout } from '@/pages/login/authUi'
import { SignUpForm, VerifyEmailStep, type SignUpValues } from '@/pages/login/RegisterSteps'
import { REGISTER_SHOWCASE } from '@/pages/login/showcaseContent'
import { useAuthStore } from '@/store/authStore'
import type { CodeSentResponse } from '@/types/api'

const EMPTY: SignUpValues = { displayName: '', email: '', password: '', confirmPassword: '', acceptTerms: false }

/** Teacher sign-up: the form, then the code mailed to confirm the address. */
export function RegisterPage() {
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const restore = useAuthStore((s) => s.restore)
  const [values, setValues] = useState<SignUpValues>(EMPTY)
  const [sent, setSent] = useState<CodeSentResponse | null>(null)

  // Already signed in on this browser: nothing to sign up for.
  useEffect(() => {
    void restore()
  }, [restore])

  if (status === 'signedIn' && !sent) return <Navigate to="/" replace />

  return (
    <AuthLayout showcase={REGISTER_SHOWCASE}>
      {sent ? (
        <VerifyEmailStep
          key={sent.email}
          sent={sent}
          onBack={() => setSent(null)}
          onSignedIn={() => navigate('/', { replace: true })}
        />
      ) : (
        <SignUpForm
          initial={values}
          onCodeSent={(submitted, response) => {
            setValues(submitted)
            setSent(response)
          }}
        />
      )}
    </AuthLayout>
  )
}
