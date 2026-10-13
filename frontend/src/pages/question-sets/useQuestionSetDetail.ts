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
    /** Moves a question one place up (-1) or down (+1). */
    moveQuestion: async (id: number, step: -1 | 1) => {
      const ids = (data?.questions ?? []).map((q) => q.id)
      const from = ids.indexOf(id)
      const to = from + step
      if (from < 0 || to < 0 || to >= ids.length) return data
      ;[ids[from], ids[to]] = [ids[to], ids[from]]
      return saved(await questionSetApi.reorderQuestions(code, ids))
    },
  }
}
