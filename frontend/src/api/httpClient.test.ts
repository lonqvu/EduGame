import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/session')>()),
  refreshSession: vi.fn(),
}))

const { httpClient } = await import('@/api/httpClient')
const { refreshSession } = await import('@/api/session')
const { setAccessToken } = await import('@/utils/authToken')

type Reply = { status: number; data?: unknown } | 'network-error'

/** Fake server: answers requests in order and records the Authorization header of each. */
function fakeServer(...replies: Reply[]) {
  const seen: (string | undefined)[] = []
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    seen.push(AxiosHeaders.from(config.headers).get('Authorization') as string | undefined)
    const reply = replies.shift() ?? { status: 200, data: 'default' }
    if (reply === 'network-error') throw new AxiosError('Network Error', 'ERR_NETWORK', config)
    const response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config }
    if (reply.status >= 400) {
      throw new AxiosError(`Request failed with status code ${reply.status}`, 'ERR_BAD_RESPONSE', config, null, response)
    }
    return response
  }
  httpClient.defaults.adapter = adapter
  return seen
}

const assign = vi.fn()
const refresh = vi.mocked(refreshSession)

describe('httpClient', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { pathname: '/games/g-1/edit', search: '?tab=2', assign } })
    setAccessToken('token-1')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    setAccessToken(null)
  })

  it('sends the access token', async () => {
    const seen = fakeServer({ status: 200, data: 'ok' })

    expect((await httpClient.get('/v1/me')).data).toBe('ok')
    expect(seen).toEqual(['Bearer token-1'])
    expect(refresh).not.toHaveBeenCalled()
  })

  it('renews an expired token once and replays the request', async () => {
    const seen = fakeServer({ status: 401, data: { status: 401, code: 'INVALID_TOKEN', message: '' } }, { status: 200, data: 'ok' })
    refresh.mockImplementation(async () => {
      setAccessToken('token-2')
      return true
    })

    expect((await httpClient.get('/v1/games')).data).toBe('ok')
    expect(seen).toEqual(['Bearer token-1', 'Bearer token-2'])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(assign).not.toHaveBeenCalled()
  })

  it('goes to the sign-in page, remembering where it was, when the session is over', async () => {
    fakeServer({ status: 401, data: { status: 401, code: 'INVALID_TOKEN', message: 'expired' } })
    refresh.mockResolvedValue(false)

    await expect(httpClient.get('/v1/games')).rejects.toMatchObject({ status: 401, code: 'INVALID_TOKEN' })
    expect(assign).toHaveBeenCalledWith('/login?from=%2Fgames%2Fg-1%2Fedit%3Ftab%3D2')
  })

  it('does not loop when the replayed request is refused again', async () => {
    fakeServer({ status: 401, data: { status: 401, code: 'INVALID_TOKEN', message: '' } }, { status: 401, data: { status: 401, code: 'INVALID_TOKEN', message: '' } })
    refresh.mockResolvedValue(true)

    await expect(httpClient.get('/v1/games')).rejects.toMatchObject({ status: 401 })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('passes other errors through without touching the session', async () => {
    fakeServer({ status: 403, data: { status: 403, code: 'FORBIDDEN', message: 'no' } }, 'network-error', { status: 500 })

    await expect(httpClient.get('/v1/admin')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' })
    await expect(httpClient.get('/v1/games')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
    await expect(httpClient.get('/v1/games')).rejects.toMatchObject({ status: 500, code: 'HTTP_ERROR' })
    expect(refresh).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })
})
