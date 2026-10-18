import { describe, expect, it } from 'vitest'
import { EMPTY_DRAFT, feedbackRequest, liftsFeedbackButton, MAX_FEEDBACK_MESSAGE, screenshotProblem } from '@/utils/feedback'

describe('feedbackRequest', () => {
  const where = { pathname: '/games/g-abc/edit', search: '?tab=2', width: 1366, height: 768 }

  it('sends the words trimmed, with where the teacher is', () => {
    const request = feedbackRequest({ ...EMPTY_DRAFT, kind: 'IDEA', rating: 4, message: '  Thêm trò Bingo  ' }, where, true)
    expect(request).toEqual({
      kind: 'IDEA',
      rating: 4,
      message: 'Thêm trò Bingo',
      page: '/games/g-abc/edit?tab=2',
      viewport: '1366x768',
      appVersion: __APP_VERSION__,
      contactOk: true,
    })
    expect(request.appVersion).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('leaves out an unset rating, and never asks for a reply without an email', () => {
    const request = feedbackRequest({ ...EMPTY_DRAFT, message: 'Lỗi', contactOk: true }, where, false)
    expect(request).not.toHaveProperty('rating')
    expect(request.contactOk).toBe(false)
    expect(feedbackRequest({ ...EMPTY_DRAFT, message: 'Lỗi', contactOk: false }, where, true).contactOk).toBe(false)
  })

  it('keeps within the server limits', () => {
    const request = feedbackRequest(
      { ...EMPTY_DRAFT, message: 'a'.repeat(MAX_FEEDBACK_MESSAGE + 50) },
      { ...where, pathname: '/classes', search: `?q=${'x'.repeat(600)}` },
      true,
    )
    expect(request.message).toHaveLength(MAX_FEEDBACK_MESSAGE)
    expect(request.page).toHaveLength(500)
  })
})

describe('screenshotProblem', () => {
  it('takes PNG, JPEG and WebP pictures only', () => {
    expect(screenshotProblem({ type: 'image/png', size: 10 })).toBeNull()
    expect(screenshotProblem({ type: 'image/jpeg', size: 10 })).toBeNull()
    expect(screenshotProblem({ type: 'image/webp', size: 10 })).toBeNull()
    expect(screenshotProblem({ type: 'image/gif', size: 10 })).toMatch(/PNG, JPG hoặc WEBP/)
    expect(screenshotProblem({ type: 'application/pdf', size: 10 })).toMatch(/PNG, JPG hoặc WEBP/)
    expect(screenshotProblem({ type: 'image/png', size: 0 })).toMatch(/trống/)
  })
})

describe('liftsFeedbackButton', () => {
  it('only on the start page, whose bar holds "Bắt đầu trò chơi"', () => {
    expect(liftsFeedbackButton('/games/g-abc/start')).toBe(true)
    expect(liftsFeedbackButton('/games/g-abc/edit')).toBe(false)
    expect(liftsFeedbackButton('/games/new')).toBe(false)
    expect(liftsFeedbackButton('/')).toBe(false)
  })
})
