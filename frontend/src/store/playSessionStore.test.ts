import { beforeEach, describe, expect, it, vi } from 'vitest'

/** The current class (3A, or a paused one) and a fake backend that numbers the sessions it starts. */
const fake = vi.hoisted(() => {
  const state = { status: 'ACTIVE', nextId: 1, failStart: false, ended: [] as number[] }
  const api = {
    startSession: vi.fn(async (_code: string, gameCode: string) => {
      await Promise.resolve()
      if (state.failStart) throw new Error('offline')
      return { id: state.nextId++, gameCode, status: 'IN_PROGRESS', startedAt: '2026-10-12T08:00:00Z' }
    }),
    endSession: vi.fn(async (_code: string, id: number) => {
      state.ended.push(id)
      return { id, status: 'ENDED' }
    }),
  }
  const classStore = {
    getState: () => ({
      status: 'ready',
      classroomCode: 'c-3a',
      classrooms: [{ code: 'c-3a', status: state.status }],
      load: async () => undefined,
    }),
  }
  return { state, api, classStore }
})

vi.mock('@/api/classroomApi', () => fake.api)
vi.mock('@/store/classStore', () => ({ useClassStore: fake.classStore }))

/** The tab's storage (tests run in Node). */
const saved = new Map<string, string>()
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => void saved.set(key, value),
})

type Recorder = typeof import('@/store/playSessionStore')
let recorder: Recorder

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  saved.clear()
  Object.assign(fake.state, { status: 'ACTIVE', nextId: 1, failStart: false, ended: [] })
  recorder = await import('@/store/playSessionStore')
})

describe('play sessions of the current class', () => {
  it('a game played to the results is one started and ended session', async () => {
    expect(await recorder.beginPlaySession('g-quiz')).toEqual({ classroomCode: 'c-3a', sessionId: 1 })
    await recorder.finishPlaySession('g-quiz')
    expect(fake.api.startSession).toHaveBeenCalledWith('c-3a', 'g-quiz')
    expect(fake.state.ended).toEqual([1])

    // Showing the results again (back, re-render) ends nothing more.
    await recorder.finishPlaySession('g-quiz')
    expect(fake.api.endSession).toHaveBeenCalledTimes(1)
  })

  it('sends what the results screen showed, for the reports', async () => {
    await recorder.beginPlaySession('g-quiz')
    const results = { teams: [{ name: 'Đội Đỏ', score: 40, correct: 4 }] }
    await recorder.finishPlaySession('g-quiz', results)
    expect(fake.api.endSession).toHaveBeenCalledWith('c-3a', 1, results)
  })

  it('opening the game twice at once (StrictMode, reload) starts one session', async () => {
    const [a, b] = await Promise.all([recorder.beginPlaySession('g-quiz'), recorder.beginPlaySession('g-quiz')])
    expect(a).toEqual(b)
    await recorder.beginPlaySession('g-quiz')
    expect(fake.api.startSession).toHaveBeenCalledTimes(1)
  })

  it('the open session survives a reload of the projector', async () => {
    await recorder.beginPlaySession('g-grid')
    vi.resetModules()
    recorder = await import('@/store/playSessionStore')
    await recorder.finishPlaySession('g-grid')
    expect(fake.state.ended).toEqual([1])
    expect(fake.api.startSession).toHaveBeenCalledTimes(1)
  })

  it('results shown while the start is still on its way end that session', async () => {
    const starting = recorder.beginPlaySession('g-quiz')
    await recorder.finishPlaySession('g-quiz')
    await starting
    expect(fake.state.ended).toEqual([1])
  })

  it('"play again" after the results is a new session', async () => {
    await recorder.beginPlaySession('g-quiz')
    await recorder.finishPlaySession('g-quiz')
    await recorder.beginPlaySession('g-quiz')
    await recorder.finishPlaySession('g-quiz')
    expect(fake.state.ended).toEqual([1, 2])
  })

  it('records nothing for a paused class, and a failed start never breaks the game', async () => {
    fake.state.status = 'PAUSED'
    expect(await recorder.beginPlaySession('g-quiz')).toBeUndefined()
    expect(fake.api.startSession).not.toHaveBeenCalled()

    fake.state.status = 'ACTIVE'
    fake.state.failStart = true
    expect(await recorder.beginPlaySession('g-quiz')).toBeUndefined()
    await expect(recorder.finishPlaySession('g-quiz')).resolves.toBeUndefined()
    expect(fake.api.endSession).not.toHaveBeenCalled()
  })

  it('games are counted separately', async () => {
    await recorder.beginPlaySession('g-a')
    await recorder.beginPlaySession('g-b')
    await recorder.finishPlaySession('g-b')
    expect(fake.state.ended).toEqual([2])
  })
})
