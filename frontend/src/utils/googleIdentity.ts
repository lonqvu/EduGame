/** OAuth client id of the web app; empty: Google sign-in is off (SocialLogin shows "coming soon"). */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let scriptLoading: Promise<void> | null = null

/** Loads Google Identity Services once per page; a failed load can be tried again. */
export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  scriptLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoading = null
      script.remove()
      reject(new Error('Google Identity Services did not load'))
    }
    document.head.appendChild(script)
  })
  return scriptLoading
}
