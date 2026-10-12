import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/authApi', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  verifyEmail: vi.fn(),
  resetPassword: vi.fn(),
}))
vi.mock('@/api/session', () => ({
  startSession: vi.fn(),
  endSession: vi.fn(),
  refreshSession: vi.fn(),
}))

const authApi = await import('@/api/authApi')
const session = await import('@/api/session')
const { useAuthStore } = await import('@/store/authStore')

const tokens = { accessToken: 'a', tokenType: 'Bearer' as const, expiresIn: 900 }
const assign = vi.fn()

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'unknown' })
    vi.stubGlobal('window', { location: { assign } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('resumes a session from the cookie once per page load', async () => {
    vi.mocked(session.refreshSession).mockResolvedValue(true)

    await useAuthStore.getState().restore()
    await useAuthStore.getState().restore()

    expect(useAuthStore.getState().status).toBe('signedIn')
    expect(session.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('is signed out when there is no session to resume', async () => {
    vi.mocked(session.refreshSession).mockResolvedValue(false)

    await useAuthStore.getState().restore()

    expect(useAuthStore.getState().status).toBe('signedOut')
  })

  it('keeps a sign-in that finished while the cookie was being tried', async () => {
    let finishRefresh: (ok: boolean) => void = () => undefined
    vi.mocked(session.refreshSession).mockReturnValue(new Promise((resolve) => (finishRefresh = resolve)))
    vi.mocked(authApi.login).mockResolvedValue(tokens)

    const restoring = useAuthStore.getState().restore()
    await useAuthStore.getState().login('colan', '123456', false)
    finishRefresh(false)
    await restoring

    expect(useAuthStore.getState().status).toBe('signedIn')
  })

  it('signs in with the username trimmed and starts the session', async () => {
    vi.mocked(authApi.login).mockResolvedValue(tokens)

    await useAuthStore.getState().login('  colan@edugame.local ', ' pass word ', true)

    expect(authApi.login).toHaveBeenCalledWith({ username: 'colan@edugame.local', password: ' pass word ', remember: true })
    expect(session.startSession).toHaveBeenCalledWith(tokens)
    expect(useAuthStore.getState().status).toBe('signedIn')
  })

  it('stays where it was when the sign-in is refused', async () => {
    useAuthStore.setState({ status: 'signedOut' })
    vi.mocked(authApi.login).mockRejectedValue({ status: 401, code: 'INVALID_CREDENTIALS', message: '' })

    await expect(useAuthStore.getState().login('colan', 'wrong', false)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

    expect(session.startSession).not.toHaveBeenCalled()
    expect(useAuthStore.getState().status).toBe('signedOut')
  })

  it('signs in after confirming the sign-up code or resetting the password', async () => {
    vi.mocked(authApi.verifyEmail).mockResolvedValue(tokens)
    vi.mocked(authApi.resetPassword).mockResolvedValue(tokens)

    await useAuthStore.getState().completeSignUp('co.hoa@example.com', '123456')
    expect(authApi.verifyEmail).toHaveBeenCalledWith({ email: 'co.hoa@example.com', code: '123456' })
    useAuthStore.setState({ status: 'signedOut' })
    await useAuthStore.getState().completePasswordReset('co.hoa@example.com', '654321', 'mat-khau-moi')

    expect(authApi.resetPassword).toHaveBeenCalledWith({ email: 'co.hoa@example.com', code: '654321', newPassword: 'mat-khau-moi' })
    expect(session.startSession).toHaveBeenCalledTimes(2)
    expect(useAuthStore.getState().status).toBe('signedIn')
  })

  it('signs out locally and goes to the sign-in page even when the server cannot be reached', async () => {
    vi.mocked(authApi.logout).mockRejectedValue({ status: 0, code: 'NETWORK_ERROR', message: '' })

    await useAuthStore.getState().logout()

    expect(session.endSession).toHaveBeenCalled()
    expect(assign).toHaveBeenCalledWith('/login')
  })
})
