import { App } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { AuthLayout } from '@/pages/login/authUi'
import { ForgotPasswordForm, ResetPasswordStep } from '@/pages/login/ForgotPasswordSteps'
import { FORGOT_SHOWCASE } from '@/pages/login/showcaseContent'
import type { CodeSentResponse } from '@/types/api'

/** "Quên mật khẩu": the address, then the mailed code with the new password. */
export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<CodeSentResponse | null>(null)

  return (
    <AuthLayout showcase={FORGOT_SHOWCASE}>
      {sent ? (
        <ResetPasswordStep
          key={sent.email}
          sent={sent}
          onBack={() => setSent(null)}
          onDone={() => {
            message.success(t('auth.forgot.done'))
            navigate('/', { replace: true })
          }}
        />
      ) : (
        <ForgotPasswordForm
          initialEmail={email}
          onCodeSent={(response) => {
            setEmail(response.email)
            setSent(response)
          }}
        />
      )}
    </AuthLayout>
  )
}
