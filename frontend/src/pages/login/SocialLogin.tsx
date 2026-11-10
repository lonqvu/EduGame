import { App } from 'antd'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GoogleButton } from '@/pages/login/GoogleButton'
import { useAuthStore } from '@/store/authStore'
import { apiErrorMessage } from '@/utils/apiError'
import { GOOGLE_CLIENT_ID } from '@/utils/googleIdentity'

/**
 * "hoặc" + "Đăng nhập bằng Google", as large as the form's button. Google signs in at once: a new address becomes a
 * teacher account, an address that has one is linked to it.
 *
 * @param remember "Ghi nhớ đăng nhập" of the form (sign-up: kept, as for a new account on its own device)
 * @param onError  shows the message in the form (`null` clears it)
 */
export function SocialLogin({ action, remember = true, onSignedIn, onError }: {
  action: 'login' | 'register'
  remember?: boolean
  onSignedIn: () => void
  onError: (message: string | null) => void
}) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle)
  const [googleBroken, setGoogleBroken] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const label = action === 'login' ? t('auth.login.google') : t('auth.register.google')
  const soon = (provider: string) => () =>
    message.info(action === 'login' ? t('auth.socialSoonLogin', { provider }) : t('auth.socialSoonRegister', { provider }))

  const signInWithGoogle = async (credential: string) => {
    if (signingIn) return
    setSigningIn(true)
    onError(null)
    try {
      await loginWithGoogle(credential, remember)
      onSignedIn()
    } catch (e) {
      onError(apiErrorMessage(e))
      setSigningIn(false)
    }
  }

  return (
    <>
      <div className="mt-[clamp(16px,3.2vh,30px)] flex items-center gap-4 text-[15px] font-semibold text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        {action === 'login' ? t('auth.login.social') : t('auth.register.social')}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="mt-[clamp(12px,2.3vh,22px)]">
        {GOOGLE_CLIENT_ID && !googleBroken ? (
          <GoogleButton
            action={action}
            disabled={signingIn}
            onCredentialReceived={(credential) => void signInWithGoogle(credential)}
            onUnavailable={() => setGoogleBroken(true)}
          >
            <SocialButton label={label} icon={<GoogleLogo />} busy={signingIn} />
          </GoogleButton>
        ) : (
          <SocialButton
            label={label}
            icon={<GoogleLogo />}
            onClick={GOOGLE_CLIENT_ID ? () => message.error(t('auth.googleUnavailable')) : soon('Google')}
          />
        )}
      </div>
    </>
  )
}

/** The look of the Google button: white, grey border, Google's logo; as tall as the form's own button. */
function SocialButton({ label, icon, busy = false, onClick }: { label: string; icon: ReactNode; busy?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={onClick ? undefined : -1}
      aria-busy={busy}
      className="flex h-[clamp(46px,6vh,58px)] w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-line bg-white font-[inherit] text-[16px] font-bold text-ink transition-colors group-hover:border-line-strong group-hover:bg-surface-soft hover:border-line-strong hover:bg-surface-soft"
    >
      {icon}
      {label}
    </button>
  )
}

const GoogleLogo = () => (
  <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)
