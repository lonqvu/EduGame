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
  if (error.code === 'CLASSROOM_NAME_TAKEN') return 'Cô đã có lớp trùng tên trong năm học này. Cô đặt tên khác nhé.'
  if (error.code === 'TOO_MANY_CLASSROOMS') return 'Cô đã có 30 lớp, là số lớp tối đa. Cô xóa bớt lớp cũ rồi tạo lớp mới nhé.'
  if (error.code === 'TOO_MANY_STUDENTS') return 'Mỗi lớp có tối đa 60 học sinh. Cô bớt tên trong danh sách nhé.'
  if (error.code === 'CLASSROOM_PAUSED') return 'Lớp đang tạm ngưng. Cô kích hoạt lại lớp để chơi cùng các em nhé.'
  if (error.code === 'INVALID_SCHOOL_YEAR') return 'Năm học chưa đúng, ví dụ: 2026-2027.'
  if (error.code === 'INVALID_STUDENT_ORDER') return 'Danh sách lớp vừa thay đổi. Cô tải lại trang rồi sắp xếp lại nhé.'
  if (error.code === 'WRONG_PASSWORD') return 'Mật khẩu hiện tại chưa đúng, cô kiểm tra lại nhé.'
  if (error.code === 'SAME_PASSWORD') return 'Mật khẩu mới cần khác mật khẩu hiện tại.'
  if (error.code === 'INVALID_PHONE') return 'Số điện thoại chưa đúng, ví dụ: 0987 654 321.'
  if (error.code === 'INVALID_IMAGE') return 'Không đọc được ảnh này, cô chọn ảnh JPG hoặc PNG khác nhé.'
  if (error.code === 'IMAGE_TOO_SMALL') return 'Ảnh nhỏ quá, cô chọn ảnh rõ nét hơn nhé (ít nhất 64 × 64 điểm ảnh).'
  if (error.code === 'IMAGE_TOO_LARGE') return 'Ảnh lớn quá, cô chọn ảnh nhỏ hơn nhé.'
  if (error.code === 'INVALID_AVATAR') return 'Ảnh đại diện không hợp lệ, cô chọn lại nhé.'
  if (error.code === 'FILE_TOO_LARGE') return 'Ảnh quá lớn (tối đa 5 MB). Cô chọn ảnh nhỏ hơn nhé.'
  if (error.code === 'UNSUPPORTED_IMAGE') return 'File này không phải ảnh PNG, JPG, GIF hoặc WEBP.'
  if (error.code === 'EMPTY_FILE') return 'File ảnh này bị trống.'
  if (error.code === 'TOO_MANY_ASSETS') return 'Trò chơi này đã có quá nhiều ảnh tải lên. Cô tạo trò mới để thêm ảnh nhé.'
  if (error.code === 'TOO_MANY_FEEDBACK') return 'Cô đã gửi nhiều góp ý trong một giờ qua. Cô thử lại sau ít phút nhé, đội Lớp Vui đang đọc.'
  if (error.status === 401) return 'Phiên làm việc đã hết, cô đăng nhập lại nhé.'
  if (error.status === 404) return 'Không tìm thấy dữ liệu (có thể đã bị xoá).'
  return 'Có lỗi xảy ra, cô thử lại nhé.'
}

export const isNotFound = (error: unknown) => isApiError(error) && error.status === 404
