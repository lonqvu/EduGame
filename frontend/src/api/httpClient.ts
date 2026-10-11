import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { refreshSession, toApiError } from '@/api/session'
import type { ApiError } from '@/types/api'
import { getAccessToken } from '@/utils/authToken'
import { env } from '@/utils/env'

/**
 * Single Axios instance for the whole app. Feature API modules (e.g. api/gameApi.ts)
 * import this instead of calling axios directly.
 */
export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const config = error.config as RetriableConfig | undefined
    // Access token expired or its session ended: renew it once from the refresh token cookie and retry.
    if (error.response?.status === 401 && config && !config._retried) {
      config._retried = true
      if (await refreshSession()) {
        config.headers.Authorization = `Bearer ${getAccessToken()}`
        return httpClient(config)
      }
      // No session left: back to the login page. A full reload also clears every store of the old session.
      const from = window.location.pathname + window.location.search
      window.location.assign(`/login?from=${encodeURIComponent(from)}`)
    }
    return Promise.reject(toApiError(error))
  },
)
