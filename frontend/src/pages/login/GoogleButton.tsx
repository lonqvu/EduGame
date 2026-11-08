import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GOOGLE_CLIENT_ID, loadGoogleScript } from '@/utils/googleIdentity'

/** Google keeps a single configuration per page: the button on screen gets the credential. */
let onCredential: ((credential: string) => void) | null = null

/**
 * Google's own "Sign in with Google" button (its look is required by Google's terms). Clicking it opens Google's
 * popup; the ID token it returns is handed to `onCredential`.
 *
 * @param onUnavailable the script could not load (offline, blocked): the caller shows its own button instead
 */
export function GoogleButton({ action, disabled, onCredentialReceived, onUnavailable }: {
  action: 'login' | 'register'
  disabled?: boolean
  onCredentialReceived: (credential: string) => void
  onUnavailable: () => void
}) {
  const { i18n } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const handler = useRef(onCredentialReceived)
  const unavailable = useRef(onUnavailable)

  useEffect(() => {
    handler.current = onCredentialReceived
    unavailable.current = onUnavailable
  })

  useEffect(() => {
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        const id = window.google?.accounts?.id
        const parent = container.current
        if (cancelled || !id || !parent) return
        onCredential = (credential) => handler.current(credential)
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential?.(response.credential),
          ux_mode: 'popup',
          context: action === 'login' ? 'signin' : 'signup',
          use_fedcm_for_button: true,
        })
        parent.replaceChildren()
        id.renderButton(parent, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: action === 'login' ? 'signin_with' : 'signup_with',
          logo_alignment: 'center',
          width: Math.max(200, Math.min(400, Math.floor(parent.offsetWidth))),
          locale: i18n.language,
        })
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) unavailable.current()
      })
    return () => {
      cancelled = true
      onCredential = null
    }
  }, [action, i18n.language])

  return (
    <div
      className={`flex h-[clamp(46px,6vh,58px)] items-center justify-center overflow-hidden ${
        disabled ? 'pointer-events-none opacity-60' : ''
      }`}
      aria-busy={!ready || disabled}
    >
      <div ref={container} className="w-full [&>div]:mx-auto" />
    </div>
  )
}
