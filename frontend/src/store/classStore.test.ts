import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudentResponse } from '@/types/api'

/** A class 3A on a fake backend whose star requests are answered when the test says so, in any order. */
const backend = vi.hoisted(() => {
  const threeA: Record<string, unknown> = { code: 'c-3a', name: '3A', grade: 3, studentCount: 2, status: 'ACTIVE' }
  const state = {
    stars: new Map<number, { weekly: number; total: number }>(),
    pending: [] as { resolve: () => void; reject: (e: unknown) => void }[],
    classrooms: [threeA],
    failLoad: false,
  }
  const student = (id: number): StudentResponse => ({
    id,
    displayName: `Học sinh ${id}`,
    weeklyStars: state.stars.get(id)!.weekly,
    totalStars: state.stars.get(id)!.total,
  })
  const api = {
    listClassrooms: vi.fn(async () => {
      if (state.failLoad) throw new Error('offline')
      return state.classrooms
    }),
    listStudents: vi.fn(async (_code: string) => [...state.stars.keys()].map(student)),
    /** The server adds the stars when the request arrives; the answer comes back when released. */
    awardStars: vi.fn(
      (_code: string, id: number, points: number) =>
        new Promise<StudentResponse>((resolve, reject) => {
          const s = state.stars.get(id)!
          s.weekly += points
          s.total += points
          const answer = student(id)
          state.pending.push({
            resolve: () => resolve(answer),
            // Failed: the server never saved it.
            reject: (e) => {
              s.weekly -= points
              s.total -= points
              reject(e)
            },
          })
        }),
    ),
  }
  return { state, api, threeA }
})
const THREE_A = backend.threeA

vi.mock('@/api/classroomApi', () => backend.api)

/** The device's storage (tests run in Node). */
const saved = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => void saved.set(key, value),
  clear: () => saved.clear(),
})

type Store = typeof import('@/store/classStore').useClassStore
let store: Store

const stars = (id: string) => store.getState().students.find((s) => s.id === id)!.stars
const flushPromises = () => new Promise((r) => setTimeout(r, 0))

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  backend.state.stars = new Map([
    [1, { weekly: 5, total: 20 }],
    [2, { weekly: 0, total: 3 }],
  ])
  backend.state.pending = []
  backend.state.failLoad = false
  store = (await import('@/store/classStore')).useClassStore
  await store.getState().load()
})

describe('class store', () => {
  it('loads the first class and its students', () => {
    expect(store.getState()).toMatchObject({ status: 'ready', classroomCode: 'c-3a', className: 'Lớp 3A', grade: 3 })
    expect(store.getState().students.map((s) => s.stars)).toEqual([5, 0])
  })

  it('loads once even when several pages ask at the same time', async () => {
    await Promise.all([store.getState().load(), store.getState().load(), store.getState().load()])
    expect(backend.api.listClassrooms).toHaveBeenCalledTimes(2) // beforeEach + one shared reload
  })

  it('a failed refresh keeps the class on screen', async () => {
    backend.state.failLoad = true
    await store.getState().load()
    expect(store.getState().status).toBe('ready')
    expect(store.getState().students).toHaveLength(2)
  })

  it('shows a star at once and keeps it when saved', async () => {
    const awarding = store.getState().awardStars('1', 1)
    expect(stars('1')).toBe(6)
    backend.state.pending[0].resolve()
    await awarding
    expect(stars('1')).toBe(6)
    expect(store.getState().students[0].totalStars).toBe(21)
  })

  it('takes the star back and rejects when saving fails', async () => {
    const awarding = store.getState().awardStars('1', 2)
    expect(stars('1')).toBe(7)
    backend.state.pending[0].reject(new Error('offline'))
    await expect(awarding).rejects.toThrow('offline')
    expect(stars('1')).toBe(5)
  })

  it('quick clicks end on the right count even when the answers come back out of order', async () => {
    const clicks = [store.getState().awardStars('1', 1), store.getState().awardStars('1', 1), store.getState().awardStars('1', 1)]
    expect(stars('1')).toBe(8)
    // The last answer (8 stars) arrives first, the first one (6 stars) last.
    for (const p of [...backend.state.pending].reverse()) {
      p.resolve()
      await flushPromises()
      expect(stars('1')).toBe(8)
    }
    await Promise.all(clicks)
    expect(stars('1')).toBe(8)
    expect(store.getState().students[0].totalStars).toBe(23)
  })

  it('one failed click among several only takes back its own star', async () => {
    const clicks = [1, 1, 1].map((n) => store.getState().awardStars('1', n).catch(() => 'failed'))
    const [first, second, third] = backend.state.pending
    second.reject(new Error('offline'))
    third.resolve()
    first.resolve()
    expect(await Promise.all(clicks)).toEqual([undefined, 'failed', undefined])
    expect(stars('1')).toBe(7)
  })

  it('stars of one student never touch another', async () => {
    const a = store.getState().awardStars('1', 1)
    const b = store.getState().awardStars('2', 3)
    backend.state.pending[1].resolve()
    backend.state.pending[0].resolve()
    await Promise.all([a, b])
    expect([stars('1'), stars('2')]).toEqual([6, 3])
  })

  it('does nothing without a class', async () => {
    backend.state.classrooms = []
    await store.getState().load()
    await store.getState().awardStars('1', 1)
    expect(backend.api.awardStars).not.toHaveBeenCalled()
    expect(store.getState()).toMatchObject({ classroomCode: null, className: '', students: [] })
    backend.state.classrooms = [THREE_A]
  })
})

describe('current class', () => {
  const ONE_A = { ...THREE_A, code: 'c-1a', name: '1A', grade: 1, lastPlayedAt: '2026-10-01T08:00:00Z' }
  const TWO_B = { ...THREE_A, code: 'c-2b', name: 'Lớp 2B', grade: 2, status: 'PAUSED', lastPlayedAt: '2026-10-12T08:00:00Z' }

  beforeEach(() => {
    localStorage.clear()
    backend.state.classrooms = [ONE_A, TWO_B, { ...THREE_A, lastPlayedAt: '2026-10-11T08:00:00Z' }]
  })

  it('is the active class played with most recently (a paused class is never picked)', async () => {
    await store.getState().load()
    expect(store.getState()).toMatchObject({ classroomCode: 'c-3a', className: 'Lớp 3A' })
    expect(store.getState().classrooms).toHaveLength(3)
    expect(backend.api.listStudents).toHaveBeenLastCalledWith('c-3a')
  })

  it('is the class the teacher picked, remembered after a reload', async () => {
    await store.getState().select('c-1a')
    expect(store.getState()).toMatchObject({ classroomCode: 'c-1a', className: 'Lớp 1A', grade: 1 })
    expect(backend.api.listStudents).toHaveBeenLastCalledWith('c-1a')

    vi.resetModules()
    store = (await import('@/store/classStore')).useClassStore
    await store.getState().load()
    expect(store.getState().classroomCode).toBe('c-1a')
  })

  it('falls back when the picked class was paused, and keeps "Lớp" typed in the name', async () => {
    localStorage.setItem('edugame.currentClass', 'c-2b')
    await store.getState().load()
    expect(store.getState().classroomCode).toBe('c-3a')

    backend.state.classrooms = [{ ...TWO_B, status: 'ACTIVE' }]
    await store.getState().load()
    expect(store.getState()).toMatchObject({ classroomCode: 'c-2b', className: 'Lớp 2B' })
  })

  it('a pick made while loading wins over the load', async () => {
    const loading = store.getState().load()
    const picking = store.getState().select('c-1a')
    await Promise.all([loading, picking])
    expect(store.getState().classroomCode).toBe('c-1a')
  })
})
