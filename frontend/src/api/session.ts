import axios, { AxiosError } from 'axios'
import type { ApiError, TokenResponse } from '@/types/api'
import { setAccessToken } from '@/utils/authToken'
import { env } from '@/utils/env'

/**
 * Client for /v1/auth/*: sends the HttpOnly refresh token cookie (withCredentials) and has none of the
 * interceptors of httpClient, so a failing refresh never triggers another refresh.
 */
export const authClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

authClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => Promise.reject(toApiError(error)),
)

/** Every failed request becomes an ApiError (the backend's body, or a network / HTTP error). */
export function toApiError(error: AxiosError<ApiError>): ApiError {
  if (error.response?.data?.code) {
    return error.response.data
  }
  return {
    status: error.response?.status ?? 0,
    code: error.response ? 'HTTP_ERROR' : 'NETWORK_ERROR',
    message: error.message,
  }
}

/** Refresh this long before the access token expires, so requests rarely meet an expired one. */
const REFRESH_AHEAD_MS = 60_000

let refreshTimer: ReturnType<typeof setTimeout> | undefined
let refreshing: Promise<boolean> | null = null

/** Keeps a new access token and schedules its renewal. */
export function startSession({ accessToken, expiresIn }: TokenResponse) {
  setAccessToken(accessToken)
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => void refreshSession(), Math.max(expiresIn * 1000 - REFRESH_AHEAD_MS, 5_000))
}

export function endSession() {
  clearTimeout(refreshTimer)
  setAccessToken(null)
}

/**
 * New access token from the refresh token cookie; false when there is no valid session (never signed in, signed
 * out, expired). Concurrent callers share one request: the server rotates the cookie on every refresh.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= authClient
    .post<TokenResponse>('/v1/auth/refresh')
    .then(({ data }) => {
      startSession(data)
      return true
    })
    .catch(() => {
      endSession()
      return false
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}
