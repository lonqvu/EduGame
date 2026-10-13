import { create } from 'zustand'
import * as questionSetApi from '@/api/questionSetApi'
import type { LoadStatus, QuestionSetRequest, QuestionSetResponse, QuestionSetSummaryResponse } from '@/types/api'

/**
 * The teacher's question bank (summaries, last changed first). Changes are saved first, then shown; the set page
 * reports its changes with {@link QuestionSetState.upsert} so the list is right when the teacher comes back.
 */
interface QuestionSetState {
  status: LoadStatus
  sets: QuestionSetSummaryResponse[]
  /** Refetches; keeps showing the current list meanwhile. */
  load: () => Promise<void>
  create: (request: QuestionSetRequest) => Promise<QuestionSetResponse>
  update: (code: string, request: Partial<QuestionSetRequest>) => Promise<QuestionSetResponse>
  copy: (code: string) => Promise<QuestionSetResponse>
  archive: (code: string) => Promise<void>
  /** A set changed elsewhere (its page): it moves to the top, as the last changed. */
  upsert: (summary: QuestionSetSummaryResponse) => void
}

let inflight: Promise<void> | null = null

const withFirst = (sets: QuestionSetSummaryResponse[], summary: QuestionSetSummaryResponse) => [
  summary,
  ...sets.filter((s) => s.code !== summary.code),
]

export const useQuestionSetStore = create<QuestionSetState>()((set, get) => ({
  status: 'idle',
  sets: [],

  load: () => {
    inflight ??= (async () => {
      if (get().status !== 'ready') set({ status: 'loading' })
      try {
        set({ status: 'ready', sets: await questionSetApi.listQuestionSets() })
      } catch {
        if (get().status !== 'ready') set({ status: 'error' })
      } finally {
        inflight = null
      }
    })()
    return inflight
  },

  create: async (request) => {
    const created = await questionSetApi.createQuestionSet(request)
    get().upsert(created.summary)
    return created
  },

  update: async (code, request) => {
    const updated = await questionSetApi.updateQuestionSet(code, request)
    get().upsert(updated.summary)
    return updated
  },

  copy: async (code) => {
    const copied = await questionSetApi.copyQuestionSet(code)
    get().upsert(copied.summary)
    return copied
  },

  archive: async (code) => {
    await questionSetApi.archiveQuestionSet(code)
    set((s) => ({ sets: s.sets.filter((x) => x.code !== code) }))
  },

  upsert: (summary) => set((s) => ({ sets: withFirst(s.sets, summary) })),
}))
