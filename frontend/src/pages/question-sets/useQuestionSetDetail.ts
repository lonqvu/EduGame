import { useEffect, useState } from 'react'
import * as questionSetApi from '@/api/questionSetApi'
import { useQuestionSetStore } from '@/store/questionSetStore'
import type { QuestionRequest, QuestionSetResponse } from '@/types/api'
import { isNotFound } from '@/utils/apiError'

export type DetailStatus = 'loading' | 'ready' | 'error' | 'missing'

/**
 * A set and its questions, for /question-sets/:code. Every change is saved first, then shown from the server's
 * answer (the whole set); the bank list is told, so it is right when the teacher goes back.
 */
export function useQuestionSetDetail(code: string) {
  const [status, setStatus] = useState<DetailStatus>('loading')
  const [data, setData] = useState<QuestionSetResponse>()
  const [attempt, setAttempt] = useState(0)
  const upsert = useQuestionSetStore((s) => s.upsert)

  // Another set (link from the same page): show it loading, not the previous one.
  const [shownCode, setShownCode] = useState(code)
  if (code !== shownCode) {
    setShownCode(code)
    setStatus('loading')
    setData(undefined)
  }

  useEffect(() => {
    let current = true
    questionSetApi.getQuestionSet(code).then(
      (set) => {
        if (!current) return
        setData(set)
        setStatus('ready')
      },
      (error: unknown) => {
        if (current) setStatus(isNotFound(error) ? 'missing' : 'error')
      },
    )
    // Left the page or opened another set: this answer is not wanted any more.
    return () => {
      current = false
    }
  }, [code, attempt])

  /** Shows the saved set and tells the list. */
  const saved = (set: QuestionSetResponse) => {
    setData(set)
    upsert(set.summary)
    return set
  }

  return {
    status,
    data,
    reload: () => {
      setStatus('loading')
      setAttempt((n) => n + 1)
    },
    setData: saved,
    addQuestions: async (questions: QuestionRequest[]) => saved(await questionSetApi.addQuestions(code, questions)),
    updateQuestion: async (id: number, question: QuestionRequest) => saved(await questionSetApi.updateQuestion(code, id, question)),
    deleteQuestion: async (id: number) => saved(await questionSetApi.deleteQuestion(code, id)),
    /** The questions in a new order (every id once): shown at once, then saved; put back if saving fails. */
    reorderQuestions: async (ids: number[]) => {
      const before = data
      if (before) {
        const byId = new Map(before.questions.map((q) => [q.id, q]))
        setData({ ...before, questions: ids.map((id) => byId.get(id)!).filter(Boolean) })
      }
      try {
        return saved(await questionSetApi.reorderQuestions(code, ids))
      } catch (error) {
        setData(before)
        throw error
      }
    },
  }
}
