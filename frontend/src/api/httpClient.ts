import axios, { AxiosError } from 'axios'
import type { ApiError } from '@/types/api'
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

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => Promise.reject(toApiError(error)),
)

function toApiError(error: AxiosError<ApiError>): ApiError {
  if (error.response?.data?.code) {
    return error.response.data
  }
  return {
    status: error.response?.status ?? 0,
    code: error.response ? 'HTTP_ERROR' : 'NETWORK_ERROR',
    message: error.message,
  }
}
