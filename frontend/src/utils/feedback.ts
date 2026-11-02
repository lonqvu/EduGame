import i18n from 'i18next'
import type { FeedbackKind, FeedbackRequest } from '@/types/api'
import { prepareImage } from '@/utils/images'

/** Same limits as the server (FeedbackRules). */
export const MAX_FEEDBACK_MESSAGE = 2000
export const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024

/** A kind of feedback; its label and placeholder are read in the current language. */
const kind = (key: FeedbackKind, emoji: string) => ({
  kind: key,
  emoji,
  get label() {
    return i18n.t(`feedback.kinds.${key}`)
  },
  get placeholder() {
    return i18n.t(`feedback.placeholders.${key}`)
  },
})

export const FEEDBACK_KINDS: { kind: FeedbackKind; label: string; emoji: string; placeholder: string }[] = [
  kind('BUG', '🐞'),
  kind('IDEA', '💡'),
  kind('PRAISE', '❤️'),
  kind('OTHER', '💬'),
]

const rating = (value: 1 | 2 | 3 | 4 | 5, emoji: string) => ({
  value,
  emoji,
  get label() {
    return i18n.t(`feedback.ratings.${value}`)
  },
})

export const RATINGS: { value: number; emoji: string; label: string }[] = [
  rating(1, '😞'),
  rating(2, '🙁'),
  rating(3, '😐'),
  rating(4, '🙂'),
  rating(5, '😍'),
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
  if (!SCREENSHOT_TYPES.includes(file.type)) return i18n.t('feedback.imageType')
  if (file.size === 0) return i18n.t('feedback.imageEmpty')
  return null
}

/** The picture to send: checked, shrunk to 1600 px, at most 3 MB. Throws an Error with a message for the teacher. */
export async function prepareScreenshot(file: File): Promise<File> {
  const problem = screenshotProblem(file)
  if (problem) throw new Error(problem)
  const prepared = await prepareImage(file)
  if (prepared.size > MAX_SCREENSHOT_BYTES) throw new Error(i18n.t('feedback.imageTooLarge'))
  return prepared
}

/** Elements marked so are left out of screenshots. */
export const SKIP_IN_SCREENSHOT = 'data-screenshot-skip'
