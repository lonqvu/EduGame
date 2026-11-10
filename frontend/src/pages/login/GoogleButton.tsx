import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GOOGLE_CLIENT_ID, loadGoogleScript } from '@/utils/googleIdentity'

/** Google keeps a single configuration per page: the button on screen gets the credential. */
let onCredential: ((credential: string) => void) | null = null

/**
 * "Đăng nhập bằng Google", as wide and as tall as the form's own button. Google draws its button at most 40 px tall
 * and 400 px wide, smaller than the form's: ours is shown (in Google's branding: logo, white, grey border) and
 * Google's lies over it, invisible, so a click still opens Google's popup; the ID token it returns is handed to
 * `onCredentialReceived`.
 *
 * @param children      what is shown: the button drawn by the caller
 * @param onUnavailable the script could not load (offline, blocked): the caller's button then handles clicks itself
 */
export function GoogleButton({ action, disabled, onCredentialReceived, onUnavailable, children }: {
  action: 'login' | 'register'
  disabled?: boolean
  onCredentialReceived: (credential: string) => void
  onUnavailable: () => void
  children: ReactNode
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
          // As wide as Google allows; the transform of the layer stretches it over the whole button.
          width: 400,
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
    <div className={`group relative ${disabled ? 'pointer-events-none opacity-60' : ''}`} aria-busy={!ready || disabled}>
      {children}
      {/* Google's button, invisible, stretched over ours: it takes the click. */}
      <div aria-hidden={!ready} className="absolute inset-0 overflow-hidden opacity-0">
        <div ref={container} className="absolute top-1/2 left-1/2 h-10 w-[400px] origin-center -translate-1/2 scale-x-[2] scale-y-[1.6]" />
      </div>
    </div>
  )
}
