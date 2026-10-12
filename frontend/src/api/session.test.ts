import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authClient, endSession, refreshSession, startSession } from '@/api/session'
import { getAccessToken } from '@/utils/authToken'

const token = (accessToken: string, expiresIn = 900) => ({ data: { accessToken, tokenType: 'Bearer' as const, expiresIn } })

describe('session', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    endSession()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shares one refresh request between concurrent callers (the server rotates the cookie each time)', async () => {
    const post = vi.spyOn(authClient, 'post').mockResolvedValue(token('t1'))

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()])

    expect(results).toEqual([true, true, true])
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/v1/auth/refresh')
    expect(getAccessToken()).toBe('t1')

    // Once settled, the next refresh is a new request.
    await refreshSession()
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('forgets the token when the refresh fails', async () => {
    startSession(token('old').data)
    vi.spyOn(authClient, 'post').mockRejectedValue({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: '' })

    expect(await refreshSession()).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('renews the access token a minute before it expires', async () => {
    const post = vi.spyOn(authClient, 'post').mockResolvedValue(token('renewed'))
    startSession(token('first', 900).data)

    await vi.advanceTimersByTimeAsync(839_000)
    expect(post).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(post).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBe('renewed')

    // And keeps doing so.
    await vi.advanceTimersByTimeAsync(840_000)
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('never schedules a renewal sooner than 5 seconds', async () => {
    const post = vi.spyOn(authClient, 'post').mockResolvedValue(token('renewed'))
    startSession(token('short', 10).data)

    await vi.advanceTimersByTimeAsync(4_900)
    expect(post).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(200)
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('stops renewing after sign-out', async () => {
    const post = vi.spyOn(authClient, 'post').mockResolvedValue(token('renewed'))
    startSession(token('first', 900).data)

    endSession()
    await vi.advanceTimersByTimeAsync(3_600_000)

    expect(post).not.toHaveBeenCalled()
    expect(getAccessToken()).toBeNull()
  })
})
