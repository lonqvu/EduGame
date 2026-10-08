import type { ApiError } from '@/types/api'

const isApiError = (error: unknown): error is ApiError =>
  typeof error === 'object' && error !== null && 'code' in error && 'status' in error

/** Short Vietnamese message for a failed request (the backend messages are for developers). */
export function apiErrorMessage(error: unknown): string {
  if (!isApiError(error)) return 'Có lỗi xảy ra, cô thử lại nhé.'
  if (error.code === 'NETWORK_ERROR') return 'Không kết nối được máy chủ. Cô kiểm tra mạng rồi thử lại nhé.'
  if (error.status === 401) return 'Phiên làm việc đã hết, cô đăng nhập lại nhé.'
  if (error.status === 404) return 'Không tìm thấy dữ liệu (có thể đã bị xoá).'
  return 'Có lỗi xảy ra, cô thử lại nhé.'
}

export const isNotFound = (error: unknown) => isApiError(error) && error.status === 404
