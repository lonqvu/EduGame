import type { ApiError } from '@/types/api'

const isApiError = (error: unknown): error is ApiError =>
  typeof error === 'object' && error !== null && 'code' in error && 'status' in error

/** Short Vietnamese message for a failed request (the backend messages are for developers). */
export function apiErrorMessage(error: unknown): string {
  if (!isApiError(error)) return 'Có lỗi xảy ra, cô thử lại nhé.'
  if (error.code === 'NETWORK_ERROR') return 'Không kết nối được máy chủ. Cô kiểm tra mạng rồi thử lại nhé.'
  if (error.code === 'INVALID_CREDENTIALS') return 'Email hoặc mật khẩu chưa đúng, cô kiểm tra lại nhé.'
  if (error.code === 'TOO_MANY_LOGIN_ATTEMPTS') {
    const minutes = /(\d+) min/.exec(error.message)?.[1] ?? '15'
    return `Cô đã nhập sai nhiều lần. Vì an toàn, cô thử lại sau ${minutes} phút hoặc dùng “Quên mật khẩu?” nhé.`
  }
  if (error.code === 'INVALID_CODE') return 'Mã xác nhận chưa đúng, cô kiểm tra lại email nhé.'
  if (error.code === 'CODE_EXPIRED') return 'Mã đã hết hạn hoặc đã dùng. Cô bấm “Gửi lại mã” để nhận mã mới nhé.'
  if (error.code === 'RESEND_TOO_SOON') return 'Mã vừa được gửi. Cô đợi một chút rồi thử lại nhé.'
  if (error.code === 'TOO_MANY_CODES') return 'Đã gửi quá nhiều mã tới email này. Cô thử lại sau 1 giờ nhé.'
  if (error.code === 'EMAIL_TAKEN') return 'Email này đã có tài khoản. Cô đăng nhập hoặc dùng “Quên mật khẩu?” nhé.'
  if (error.status === 401) return 'Phiên làm việc đã hết, cô đăng nhập lại nhé.'
  if (error.status === 404) return 'Không tìm thấy dữ liệu (có thể đã bị xoá).'
  return 'Có lỗi xảy ra, cô thử lại nhé.'
}

export const isNotFound = (error: unknown) => isApiError(error) && error.status === 404
