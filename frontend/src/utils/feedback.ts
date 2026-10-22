import type { FeedbackKind, FeedbackRequest } from '@/types/api'
import { prepareImage } from '@/utils/images'

/** Same limits as the server (FeedbackRules). */
export const MAX_FEEDBACK_MESSAGE = 2000
export const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024

export const FEEDBACK_KINDS: { kind: FeedbackKind; label: string; emoji: string; placeholder: string }[] = [
  { kind: 'BUG', label: 'Báo lỗi', emoji: '🐞', placeholder: 'Cô đang làm gì thì gặp lỗi? Màn hình hiện ra như thế nào?' },
  { kind: 'IDEA', label: 'Đề xuất', emoji: '💡', placeholder: 'Cô muốn Lớp Vui có thêm trò chơi hay tính năng gì?' },
  { kind: 'PRAISE', label: 'Khen', emoji: '❤️', placeholder: 'Cô thích điều gì ở Lớp Vui?' },
  { kind: 'OTHER', label: 'Khác', emoji: '💬', placeholder: 'Cô muốn nhắn gì tới đội Lớp Vui?' },
]

export const RATINGS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '😞', label: 'Rất không hài lòng' },
  { value: 2, emoji: '🙁', label: 'Chưa hài lòng' },
  { value: 3, emoji: '😐', label: 'Bình thường' },
  { value: 4, emoji: '🙂', label: 'Hài lòng' },
  { value: 5, emoji: '😍', label: 'Rất hài lòng' },
]

/** What the teacher is writing, kept while the dialog is closed so nothing typed is lost. */
export interface FeedbackDraft {
  kind: FeedbackKind
  rating: number | null
  message: string
  contactOk: boolean
  screenshot: File | null
}

export const EMPTY_DRAFT: FeedbackDraft = { kind: 'BUG', rating: null, message: '', contactOk: true, screenshot: null }

/** Where the teacher is: the page, and the size of the browser window. */
export interface FeedbackPlace {
  pathname: string
  search: string
  width: number
  height: number
}

/** The request for this draft, with where the teacher is and the app build. */
export function feedbackRequest(draft: FeedbackDraft, where: FeedbackPlace, hasEmail: boolean): FeedbackRequest {
  return {
    kind: draft.kind,
    ...(draft.rating ? { rating: draft.rating } : {}),
    message: draft.message.trim().slice(0, MAX_FEEDBACK_MESSAGE),
    page: (where.pathname + where.search).slice(0, 500),
    viewport: `${Math.round(where.width)}x${Math.round(where.height)}`,
    appVersion: __APP_VERSION__.slice(0, 40),
    contactOk: hasEmail && draft.contactOk,
  }
}

const SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** Why this file cannot go with the feedback, or null. */
export function screenshotProblem(file: { type: string; size: number }): string | null {
  if (!SCREENSHOT_TYPES.includes(file.type)) return 'Cô chọn ảnh PNG, JPG hoặc WEBP nhé.'
  if (file.size === 0) return 'File ảnh này bị trống.'
  return null
}

/** The picture to send: checked, shrunk to 1600 px, at most 3 MB. Throws an Error with a message for the teacher. */
export async function prepareScreenshot(file: File): Promise<File> {
  const problem = screenshotProblem(file)
  if (problem) throw new Error(problem)
  const prepared = await prepareImage(file)
  if (prepared.size > MAX_SCREENSHOT_BYTES) throw new Error('Ảnh lớn quá (tối đa 3 MB), cô chọn ảnh khác nhé.')
  return prepared
}

/** Pages with their own bar at the bottom right ("Bắt đầu trò chơi"): the feedback button sits above it. */
export const liftsFeedbackButton = (pathname: string) => /^\/games\/[^/]+\/start\/?$/.test(pathname)

/** Elements marked so are left out of screenshots (the feedback button itself). */
export const SKIP_IN_SCREENSHOT = 'data-screenshot-skip'
