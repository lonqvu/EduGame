import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateGameItemRequest, GameItemResponse, GameResponse } from '@/types/api'
import type { Question } from '@/types/game'

/**
 * An in-memory backend for /api/v1/games. Each request is handled after a random "network" delay, so requests
 * sent at the same time can arrive in any order; the store must still make the server end up where the screen is.
 */
const server = vi.hoisted(() => {
  interface Game {
    code: string
    templateCode: string
    title: string
    items: { id: number; itemType: string; content: Record<string, unknown>; solution?: Record<string, unknown> }[]
    archived: boolean
  }
  const state = {
    games: new Map<string, Game>(),
    nextId: 1000,
    calls: [] as string[],
    /** Fails the next call of this API function. */
    failNext: new Set<string>(),
    maxLatencyMs: 0,
    random: Math.random,
  }
  const notFound = () => Object.assign(new Error('not found'), { status: 404, code: 'RESOURCE_NOT_FOUND' })
  const response = (g: Game): GameResponse => ({
    code: g.code,
    templateCode: g.templateCode,
    title: g.title,
    educationLevel: 'TIEU_HOC',
    visibility: 'PRIVATE',
    status: 'DRAFT',
    version: 1,
    versionStatus: 'DRAFT',
    sample: false,
    settings: {},
    items: g.items.map((it, position): GameItemResponse => ({ ...structuredClone(it), position })),
    updatedAt: '2026-10-12T00:00:00Z',
  })
  const game = (code: string) => {
    const g = state.games.get(code)
    if (!g || g.archived) throw notFound()
    return g
  }
  /** Runs `handle` on the server after a random delay; a rejection looks like a 500. */
  const call = <T,>(name: string, handle: () => T): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const later = (run: () => void) =>
        state.maxLatencyMs > 0 ? setTimeout(run, Math.floor(state.random() * state.maxLatencyMs)) : queueMicrotask(run)
      later(() => {
        state.calls.push(name)
        if (state.failNext.delete(name)) {
          reject(Object.assign(new Error('boom'), { status: 500, code: 'INTERNAL_ERROR' }))
          return
        }
        try {
          resolve(handle())
        } catch (error) {
          reject(error)
        }
      })
    })
  const addTo = (g: Game, items: CreateGameItemRequest[]) =>
    g.items.push(...items.map((it) => ({ id: state.nextId++, itemType: it.itemType, content: it.content, solution: it.solution ?? undefined })))

  const api = {
    listGames: () =>
      call('listGames', () =>
        [...state.games.values()].filter((g) => !g.archived).map((g) => ({ ...response(g), itemCount: g.items.length })),
      ),
    createGame: (req: { templateCode: string }) =>
      call('createGame', () => {
        const g: Game = { code: `g-${state.nextId++}`, templateCode: req.templateCode, title: 'Lật ô mới', items: [], archived: false }
        state.games.set(g.code, g)
        return response(g)
      }),
    getGame: (code: string) => call('getGame', () => response(game(code))),
    openDraft: (code: string) => call('openDraft', () => response(game(code))),
    updateGame: (code: string, req: { title?: string }) =>
      call('updateGame', () => {
        const g = game(code)
        if (req.title !== undefined) g.title = req.title
        return response(g)
      }),
    archiveGame: (code: string) =>
      call('archiveGame', () => {
        game(code).archived = true
      }),
    addItems: (code: string, items: CreateGameItemRequest[]) =>
      call('addItems', () => {
        const g = game(code)
        addTo(g, items)
        return response(g)
      }),
    updateItem: (code: string, itemId: number, req: { content?: Record<string, unknown>; solution?: Record<string, unknown> | null }) =>
      call('updateItem', () => {
        const g = game(code)
        const item = g.items.find((it) => it.id === itemId)
        if (!item) throw notFound()
        if (req.content) item.content = req.content
        if (req.solution !== undefined) item.solution = req.solution ?? undefined
        return response(g)
      }),
    deleteItem: (code: string, itemId: number) =>
      call('deleteItem', () => {
        const g = game(code)
        if (!g.items.some((it) => it.id === itemId)) throw notFound()
        g.items = g.items.filter((it) => it.id !== itemId)
        return response(g)
      }),
    reorderItems: (code: string, itemIds: number[]) =>
      call('reorderItems', () => {
        const g = game(code)
        const ids = g.items.map((it) => it.id)
        if (itemIds.length !== ids.length || [...itemIds].sort().join() !== [...ids].sort().join()) {
          throw Object.assign(new Error('order'), { status: 400, code: 'INVALID_ITEM_ORDER' })
        }
        g.items = itemIds.map((id) => g.items.find((it) => it.id === id)!)
        return response(g)
      }),
  }

  /** A GRID_BOARD game with `count` questions "Câu 1".."Câu N". */
  const seed = (code: string, count: number) => {
    const g: Game = { code, templateCode: 'GRID_BOARD', title: 'Phép cộng', items: [], archived: false }
    addTo(
      g,
      Array.from({ length: count }, (_, i) => ({
        itemType: 'OPEN_QUESTION',
        content: { text: `Câu ${i + 1}`, points: 10 },
        solution: { answer: `${i + 1}` },
      })),
    )
    state.games.set(code, g)
  }
  return { state, api, seed }
})

vi.mock('@/api/gameApi', () => server.api)

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

type Store = typeof import('@/store/gameLibraryStore').useGameLibraryStore
let store: Store

/** Lets every timer (debounce, network) and promise run. */
const settle = async () => {
  for (let i = 0; i < 20; i++) await vi.runAllTimersAsync()
}

const questions = (gameId: string) => (store.getState().items[gameId] ?? []) as Question[]
const serverTexts = (code: string) => server.state.games.get(code)!.items.map((it) => it.content.text)
const localTexts = (code: string) => questions(code).map((q) => q.text)

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  server.state.games.clear()
  server.state.calls = []
  server.state.failNext.clear()
  server.state.maxLatencyMs = 0
  server.state.random = Math.random
  store = (await import('@/store/gameLibraryStore')).useGameLibraryStore
})

afterEach(() => {
  vi.useRealTimers()
})

describe('game library store: saving edits', () => {
  it('typing is saved once, after the teacher pauses, with the latest text', async () => {
    server.seed('g-1', 2)
    await store.getState().loadGame('g-1', 'edit')
    const [first] = questions('g-1')

    for (const text of ['C', 'Ca', 'Câu', 'Câu mới']) {
      store.getState().updateItem('g-1', first.id, { text })
      await vi.advanceTimersByTimeAsync(200)
    }
    expect(localTexts('g-1')[0]).toBe('Câu mới') // the screen shows it at once
    expect(store.getState().saveState).toBe('saving')
    expect(server.state.calls).not.toContain('updateItem')

    await settle()
    expect(server.state.calls.filter((c) => c === 'updateItem')).toHaveLength(1)
    expect(serverTexts('g-1')[0]).toBe('Câu mới')
    expect(store.getState().saveState).toBe('saved')
  })

  it('a deleted item is never saved after it is gone (no 404 from a late save)', async () => {
    server.seed('g-1', 3)
    await store.getState().loadGame('g-1', 'edit')
    const [, second] = questions('g-1')
    store.getState().updateItem('g-1', second.id, { text: 'sắp xóa' })
    store.getState().removeItem('g-1', second.id)
    await settle()
    expect(server.state.calls).not.toContain('updateItem')
    expect(serverTexts('g-1')).toEqual(['Câu 1', 'Câu 3'])
    expect(store.getState().saveState).toBe('saved')
  })

  it('a blank title is kept on screen but not sent; the next real name is', async () => {
    server.seed('g-1', 1)
    await store.getState().loadGame('g-1', 'edit')
    store.getState().renameGame('g-1', '   ')
    await settle()
    expect(server.state.games.get('g-1')!.title).toBe('Phép cộng')
    store.getState().renameGame('g-1', ' Cộng trừ ')
    await settle()
    expect(server.state.games.get('g-1')!.title).toBe('Cộng trừ')
  })

  it('a failed save shows an error, then takes the server version back', async () => {
    server.seed('g-1', 2)
    await store.getState().loadGame('g-1', 'edit')
    const seen: string[] = []
    const unsubscribe = store.subscribe((s) => seen.push(s.saveState))
    server.state.failNext.add('reorderItems')
    const ids = questions('g-1').map((q) => q.id)
    store.getState().reorderItems('g-1', [...ids].reverse())
    expect(localTexts('g-1')).toEqual(['Câu 2', 'Câu 1'])

    await settle()
    unsubscribe()
    expect(seen).toContain('error')
    // The screen went back to what the server has, so nothing is left unsaved.
    expect(localTexts('g-1')).toEqual(['Câu 1', 'Câu 2'])
    expect(store.getState().saveState).toBe('saved')
    expect(server.state.calls.at(-1)).toBe('openDraft')

    store.getState().updateItem('g-1', ids[0], { text: 'Sửa lại' })
    await settle()
    expect(store.getState().saveState).toBe('saved')
    expect(serverTexts('g-1')).toEqual(['Sửa lại', 'Câu 2'])
  })

  it('what the teacher types while the game is being reloaded after an error is not lost', async () => {
    server.seed('g-1', 2)
    await store.getState().loadGame('g-1', 'edit')
    server.state.maxLatencyMs = 200
    server.state.random = () => 0.99
    const [first, second] = questions('g-1')

    server.state.failNext.add('deleteItem')
    store.getState().removeItem('g-1', first.id)
    await vi.advanceTimersByTimeAsync(250) // the delete fails; the reload (POST /draft) is on its way
    expect(server.state.calls.at(-1)).toBe('deleteItem')
    store.getState().updateItem('g-1', second.id, { text: 'Gõ trong lúc tải lại' })
    await settle()

    expect(localTexts('g-1')).toEqual(['Câu 1', 'Gõ trong lúc tải lại'])
    expect(serverTexts('g-1')).toEqual(['Câu 1', 'Gõ trong lúc tải lại'])
  })

  it('opening a game first sends the pending edits, so it shows them', async () => {
    server.seed('g-1', 1)
    await store.getState().loadGame('g-1', 'edit')
    store.getState().updateItem('g-1', questions('g-1')[0].id, { text: 'Chưa kịp lưu' })
    const loading = store.getState().loadGame('g-1', 'play')
    await settle()
    await loading
    expect(serverTexts('g-1')).toEqual(['Chưa kịp lưu'])
    expect(localTexts('g-1')).toEqual(['Chưa kịp lưu'])
    expect(store.getState().gameStatus['g-1']).toBe('play')
  })

  for (const [seed, failures] of [[1, false], [2, false], [3, false], [4, true], [5, true], [6, true], [7, true]] as const) {
    it(`a long editing session with a slow${failures ? ', flaky' : ''} network ends with the server equal to the screen (seed ${seed})`, async () => {
      const random = seeded(seed)
      server.seed('g-1', 5)
      await store.getState().loadGame('g-1', 'edit')
      server.state.maxLatencyMs = 300
      server.state.random = random

      for (let step = 0; step < 120; step++) {
        const list = questions('g-1')
        if (failures && random() < 0.04) {
          server.state.failNext.add(['updateItem', 'deleteItem', 'reorderItems', 'updateGame'][Math.floor(random() * 4)])
        }
        const roll = random()
        if (roll < 0.55 && list.length > 0) {
          const q = list[Math.floor(random() * list.length)]
          store.getState().updateItem('g-1', q.id, { text: `${q.text.slice(0, 12)}+${step}`, answer: `${step}` })
        } else if (roll < 0.7 && list.length > 1) {
          store.getState().removeItem('g-1', list[Math.floor(random() * list.length)].id)
        } else if (roll < 0.85 && list.length > 1) {
          const ids = list.map((q) => q.id)
          const i = Math.floor(random() * ids.length)
          ids.push(...ids.splice(i, 1)) // move one to the end
          store.getState().reorderItems('g-1', ids)
        } else if (roll < 0.95) {
          const adding = store.getState().addItems('g-1', [{ text: `Mới ${step}`, answer: '', points: 10 }]).catch(() => [])
          if (random() < 0.5) {
            // The editor waits for the new item's id before showing it.
            let done = false
            void adding.then(() => (done = true))
            while (!done) await vi.advanceTimersByTimeAsync(50)
          }
        } else {
          store.getState().renameGame('g-1', `Tên ${step}`)
        }
        await vi.advanceTimersByTimeAsync(Math.floor(random() * 700))
      }
      await settle()
      server.state.failNext.clear()

      expect(store.getState().saveState).toBe('saved')
      const saved = server.state.games.get('g-1')!
      expect(saved.title).toBe(store.getState().games.find((g) => g.id === 'g-1')!.title)
      expect(saved.items.map((it) => String(it.id))).toEqual(questions('g-1').map((q) => q.id))
      expect(serverTexts('g-1')).toEqual(localTexts('g-1'))
      expect(saved.items.map((it) => it.solution?.answer ?? '')).toEqual(questions('g-1').map((q) => q.answer))
      expect(store.getState().games.find((g) => g.id === 'g-1')!.itemCount).toBe(saved.items.length)
    })
  }
})

describe('game library store: games', () => {
  it('a new game starts with one empty question', async () => {
    const creating = store.getState().createGame('GRID_BOARD', 3)
    await settle()
    const code = await creating
    expect(server.state.games.get(code)!.items).toHaveLength(1)
    expect(store.getState().gameStatus[code]).toBe('edit')
    expect(store.getState().games[0]).toMatchObject({ id: code, itemCount: 1 })
  })

  it('a game whose first question cannot be added is archived, not left half-made', async () => {
    server.state.failNext.add('addItems')
    const creating = store.getState().createGame('GRID_BOARD')
    const failed = expect(creating).rejects.toMatchObject({ status: 500 })
    await settle()
    await failed
    expect([...server.state.games.values()].every((g) => g.archived)).toBe(true)
    expect(store.getState().games).toEqual([])
  })

  it('archiving sends pending edits first; a failed archive keeps the game listed', async () => {
    server.seed('g-1', 1)
    await store.getState().loadGames()
    await store.getState().loadGame('g-1', 'edit')
    store.getState().renameGame('g-1', 'Tên cuối')

    server.state.failNext.add('archiveGame')
    const failing = expect(store.getState().archiveGame('g-1')).rejects.toBeTruthy()
    await settle()
    await failing
    expect(server.state.games.get('g-1')!.title).toBe('Tên cuối')
    expect(store.getState().games.map((g) => g.id)).toEqual(['g-1'])

    const archiving = store.getState().archiveGame('g-1')
    await settle()
    await archiving
    expect(store.getState().games).toEqual([])
    expect(server.state.games.get('g-1')!.archived).toBe(true)
  })

  it('a missing game shows "missing", a server error shows "error"', async () => {
    const missing = store.getState().loadGame('g-nope', 'play')
    await settle()
    await missing
    expect(store.getState().gameStatus['g-nope']).toBe('missing')

    server.seed('g-1', 1)
    server.state.failNext.add('getGame')
    const broken = store.getState().loadGame('g-1', 'play')
    await settle()
    await broken
    expect(store.getState().gameStatus['g-1']).toBe('error')
  })

  it('a failed refresh keeps showing the library already loaded', async () => {
    server.seed('g-1', 1)
    await store.getState().loadGames()
    server.state.failNext.add('listGames')
    await store.getState().loadGames()
    expect(store.getState()).toMatchObject({ gamesStatus: 'ready', games: [{ id: 'g-1' }] })

    vi.resetModules()
    const fresh = (await import('@/store/gameLibraryStore')).useGameLibraryStore
    server.state.failNext.add('listGames')
    await fresh.getState().loadGames()
    expect(fresh.getState().gamesStatus).toBe('error')
  })
})
