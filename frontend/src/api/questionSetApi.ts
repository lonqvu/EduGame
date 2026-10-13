import { httpClient } from '@/api/httpClient'
import type {
  QuestionGameCode,
  QuestionRequest,
  QuestionSetRequest,
  QuestionSetResponse,
  QuestionSetSummaryResponse,
  UsedQuestionSetResponse,
} from '@/types/api'

const setPath = (code: string) => `/v1/question-sets/${encodeURIComponent(code)}`

// --- Sets -----------------------------------------------------------------------------------------------------

/** The teacher's question sets, last changed first. */
export async function listQuestionSets(): Promise<QuestionSetSummaryResponse[]> {
  const { data } = await httpClient.get<QuestionSetSummaryResponse[]>('/v1/question-sets')
  return data
}

export async function getQuestionSet(code: string): Promise<QuestionSetResponse> {
  const { data } = await httpClient.get<QuestionSetResponse>(setPath(code))
  return data
}

export async function createQuestionSet(request: QuestionSetRequest): Promise<QuestionSetResponse> {
  const { data } = await httpClient.post<QuestionSetResponse>('/v1/question-sets', request)
  return data
}

/** Partial update; an empty description clears it, grade 0 clears the grade. */
export async function updateQuestionSet(code: string, request: Partial<QuestionSetRequest>): Promise<QuestionSetResponse> {
  const { data } = await httpClient.patch<QuestionSetResponse>(setPath(code), request)
  return data
}

/** Removes the set from the bank; games made from it keep their questions. */
export async function archiveQuestionSet(code: string): Promise<void> {
  await httpClient.delete(setPath(code))
}

/** A copy "… (bản sao)" with the same questions. */
export async function copyQuestionSet(code: string): Promise<QuestionSetResponse> {
  const { data } = await httpClient.post<QuestionSetResponse>(`${setPath(code)}/copy`)
  return data
}

// --- Questions ------------------------------------------------------------------------------------------------

/** Adds questions at the end, all or none. */
export async function addQuestions(code: string, questions: QuestionRequest[]): Promise<QuestionSetResponse> {
  const { data } = await httpClient.post<QuestionSetResponse>(`${setPath(code)}/questions`, { questions })
  return data
}

export async function updateQuestion(code: string, questionId: number, question: QuestionRequest): Promise<QuestionSetResponse> {
  const { data } = await httpClient.put<QuestionSetResponse>(`${setPath(code)}/questions/${questionId}`, question)
  return data
}

export async function deleteQuestion(code: string, questionId: number): Promise<QuestionSetResponse> {
  const { data } = await httpClient.delete<QuestionSetResponse>(`${setPath(code)}/questions/${questionId}`)
  return data
}

/** New order: every question id once. */
export async function reorderQuestions(code: string, questionIds: number[]): Promise<QuestionSetResponse> {
  const { data } = await httpClient.put<QuestionSetResponse>(`${setPath(code)}/questions/order`, { questionIds })
  return data
}

// --- Use in a game --------------------------------------------------------------------------------------------

/** Makes a game from the set (its questions are copied into it). */
export async function useQuestionSet(code: string, templateCode: QuestionGameCode): Promise<UsedQuestionSetResponse> {
  const { data } = await httpClient.post<UsedQuestionSetResponse>(`${setPath(code)}/games`, { templateCode })
  return data
}
