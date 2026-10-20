import { httpClient } from '@/api/httpClient'
import type { FeedbackRequest, FeedbackResponse } from '@/types/api'

/** Sends a feedback to the Lớp vui team, with a screenshot if there is one. */
export async function sendFeedback(feedback: FeedbackRequest, screenshot?: File | null): Promise<FeedbackResponse> {
  const form = new FormData()
  form.append('feedback', new Blob([JSON.stringify(feedback)], { type: 'application/json' }))
  if (screenshot) form.append('screenshot', screenshot, screenshot.name)
  const { data } = await httpClient.post<FeedbackResponse>('/v1/feedback', form, {
    // Not the client's JSON default: the browser sets the multipart boundary.
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  })
  return data
}
