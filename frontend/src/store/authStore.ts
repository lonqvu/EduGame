import { create } from 'zustand'
import { login as loginRequest, logout as logoutRequest, resetPassword, verifyEmail } from '@/api/authApi'
import { endSession, refreshSession, startSession } from '@/api/session'

/**
 * Whether a teacher is signed in. `unknown` until the refresh token cookie has been tried: the access token lives
 * in memory only, so every page load starts there.
 */
export type AuthStatus = 'unknown' | 'signedIn' | 'signedOut'

interface AuthState {
  status: AuthStatus
  /** Resumes the session of the refresh token cookie, once per page load. */
  restore: () => Promise<void>
  login: (username: string, password: string, remember: boolean) => Promise<void>
  /** Confirms the sign-up code: the new teacher is signed in. */
  completeSignUp: (email: string, code: string) => Promise<void>
  /** Sets the new password with the mailed code: other sessions end, this one is signed in. */
  completePasswordReset: (email: string, code: string, newPassword: string) => Promise<void>
  /** Ends the session on the server, then reloads on the login page, which also clears every store. */
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'unknown',
  restore: async () => {
    if (get().status !== 'unknown') return
    const ok = await refreshSession()
    // A login may have finished meanwhile.
    if (get().status === 'unknown') set({ status: ok ? 'signedIn' : 'signedOut' })
  },
  login: async (username, password, remember) => {
    startSession(await loginRequest({ username: username.trim(), password, remember }))
    set({ status: 'signedIn' })
  },
  completeSignUp: async (email, code) => {
    startSession(await verifyEmail({ email, code }))
    set({ status: 'signedIn' })
  },
  completePasswordReset: async (email, code, newPassword) => {
    startSession(await resetPassword({ email, code, newPassword }))
    set({ status: 'signedIn' })
  },
  logout: async () => {
    try {
      await logoutRequest()
    } catch {
      // Offline or server down: still forget the session here.
    }
    endSession()
    window.location.assign('/login')
  },
}))
