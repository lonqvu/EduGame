import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuestionSetResponse, QuestionSetSummaryResponse } from '@/types/api'

/** A fake bank: two sets; requests answer at once unless told to fail. */
const fake = vi.hoisted(() => {
  const summary = (code: string, title = code): QuestionSetSummaryResponse => ({
    code,
    title,
    subject: 'TOAN',
    questionCount: 0,
    multipleChoiceCount: 0,
    shortAnswerCount: 0,
    useCount: 0,
    playCount: 0,
    ownerName: 'Cô Lan',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  })
  const full = (s: QuestionSetSummaryResponse): QuestionSetResponse => ({ summary: s, questions: [], games: [] })
  const state = { sets: [summary('qs-a'), summary('qs-b')], fail: false }
  const failing = <T>(value: () => T) =>
    vi.fn(async (..._args: unknown[]) => {
      if (state.fail) throw new Error('offline')
      return value()
    })
  const api = {
    listQuestionSets: failing(() => [...state.sets]),
    createQuestionSet: failing(() => full(summary('qs-new', 'Bộ mới'))),
    updateQuestionSet: failing(() => full(summary('qs-b', 'B đã sửa'))),
    copyQuestionSet: failing(() => full(summary('qs-copy', 'qs-a (bản sao)'))),
    archiveQuestionSet: failing(() => undefined),
  }
  return { state, api, summary }
})

vi.mock('@/api/questionSetApi', () => fake.api)

type Store = typeof import('@/store/questionSetStore').useQuestionSetStore
let store: Store
const codes = () => store.getState().sets.map((s) => s.code)

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  fake.state.fail = false
  store = (await import('@/store/questionSetStore')).useQuestionSetStore
})

describe('question bank store', () => {
  it('loads the sets once even when several pages ask at the same time', async () => {
    await Promise.all([store.getState().load(), store.getState().load()])
    expect(store.getState().status).toBe('ready')
    expect(codes()).toEqual(['qs-a', 'qs-b'])
    expect(fake.api.listQuestionSets).toHaveBeenCalledTimes(1)
  })

  it('a failed first load is an error; a failed refresh keeps the list', async () => {
    fake.state.fail = true
    await store.getState().load()
    expect(store.getState().status).toBe('error')

    fake.state.fail = false
    await store.getState().load()
    fake.state.fail = true
    await store.getState().load()
    expect(store.getState().status).toBe('ready')
    expect(codes()).toEqual(['qs-a', 'qs-b'])
  })

  it('a created, edited or copied set comes first, once', async () => {
    await store.getState().load()
    await store.getState().create({ title: 'Bộ mới', subject: 'TOAN' })
    expect(codes()).toEqual(['qs-new', 'qs-a', 'qs-b'])

    await store.getState().update('qs-b', { title: 'B đã sửa' })
    expect(codes()).toEqual(['qs-b', 'qs-new', 'qs-a'])
    expect(store.getState().sets[0].title).toBe('B đã sửa')

    await store.getState().copy('qs-a')
    expect(codes()).toEqual(['qs-copy', 'qs-b', 'qs-new', 'qs-a'])
  })

  it('a deleted set leaves the list; nothing changes when saving fails', async () => {
    await store.getState().load()
    await store.getState().archive('qs-a')
    expect(codes()).toEqual(['qs-b'])

    fake.state.fail = true
    await expect(store.getState().archive('qs-b')).rejects.toThrow('offline')
    await expect(store.getState().update('qs-b', { title: 'x' })).rejects.toThrow('offline')
    expect(codes()).toEqual(['qs-b'])
    expect(store.getState().sets[0].title).toBe('qs-b')
  })

  it('a set changed on its page is shown in the list', async () => {
    await store.getState().load()
    store.getState().upsert({ ...fake.summary('qs-b'), questionCount: 5 })
    expect(codes()).toEqual(['qs-b', 'qs-a'])
    expect(store.getState().sets[0].questionCount).toBe(5)
  })
})
