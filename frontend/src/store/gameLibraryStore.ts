import { create } from 'zustand'
import * as gameApi from '@/api/gameApi'
import type { GameResponse, LoadStatus } from '@/types/api'
import type { GameItem, GameSummary, GameType, ItemDraft } from '@/types/game'
import { isNotFound } from '@/utils/apiError'
import { itemCodec, toCreateRequest } from '@/utils/gameItems'
import { detailToSummary, toGameSummary } from '@/utils/gameMapping'

/**
 * - `play`: loaded read-only (GET), enough for the projector.
 * - `edit`: loaded through POST /draft, so item ids no longer change while editing.
 */
export type GameLoadState = 'loading' | 'play' | 'edit' | 'missing' | 'error'

export type SaveState = 'saved' | 'saving' | 'error'

/**
 * Teacher's games and their items (questions, pair sets...), backed by /api/v1/games.
 *
 * Edits are applied to the store at once (the editor autosaves on every keystroke), then sent to the backend:
 * typing is debounced per item / title, and all requests go through one queue so they reach the server in
 * the order they were made. If a request fails, the game is reloaded from the server.
 */
interface GameLibraryState {
  games: GameSummary[]
  gamesStatus: LoadStatus
  items: Record<string, GameItem[]>
  /** `settings` of the version being edited (time limit, rules...). */
  settings: Record<string, Record<string, unknown>>
  gameStatus: Record<string, GameLoadState>
  saveState: SaveState

  loadGames: () => Promise<void>
  /** Waits for pending saves first, so what is loaded includes the latest edits. */
  loadGame: (gameId: string, mode: 'play' | 'edit') => Promise<void>
  /** Creates a game with one empty item; resolves with its id. */
  createGame: (type: GameType, grade?: number) => Promise<string>
  renameGame: (gameId: string, title: string) => void
  /** Soft-deletes the game: it leaves the library. */
  archiveGame: (gameId: string) => Promise<void>
  /** Resolves with the created items (they need server ids, so this waits for the backend). */
  addItems: (gameId: string, drafts: ItemDraft[]) => Promise<GameItem[]>
  updateItem: (gameId: string, itemId: string, patch: Partial<ItemDraft>) => void
  removeItem: (gameId: string, itemId: string) => void
  reorderItems: (gameId: string, orderedIds: string[]) => void
}

const SAVE_DELAY_MS = 600

export const useGameLibraryStore = create<GameLibraryState>()((set, get) => {
  // --- Save pipeline -------------------------------------------------------------------------------------------

  /** Requests run one after another, in call order. */
  let queue: Promise<unknown> = Promise.resolve()
  let running = 0
  /** Debounced saves, by key ("title:<game>", "item:<game>:<item>"). */
  const timers = new Map<string, { gameId: string; timer: ReturnType<typeof setTimeout>; run: () => Promise<unknown> }>()

  const refreshSaveState = () => {
    if (running === 0 && timers.size === 0) set((s) => (s.saveState === 'error' ? s : { saveState: 'saved' }))
  }

  function enqueue<T>(gameId: string, task: () => Promise<T>): Promise<T> {
    running++
    set({ saveState: 'saving' })
    const result = queue.then(task)
    queue = result.catch(() => undefined)
    result.then(
      () => {
        running--
        // A successful save after an error means the server is reachable again.
        if (running === 0 && timers.size === 0) set({ saveState: 'saved' })
      },
      () => {
        running--
        set({ saveState: 'error' })
        // Local state no longer matches the server: take the server's version.
        void get().loadGame(gameId, 'edit')
      },
    )
    return result
  }

  const fireAndForget = (gameId: string, task: () => Promise<unknown>) => {
    enqueue(gameId, task).catch(() => undefined)
  }

  const schedule = (key: string, gameId: string, run: () => Promise<unknown>) => {
    const existing = timers.get(key)
    if (existing) clearTimeout(existing.timer)
    const timer = setTimeout(() => {
      timers.delete(key)
      fireAndForget(gameId, run)
    }, SAVE_DELAY_MS)
    timers.set(key, { gameId, timer, run })
    set({ saveState: 'saving' })
  }

  /** Sends the debounced saves of a game now (before a request that must see them). */
  const flush = (gameId: string) => {
    for (const [key, entry] of timers) {
      if (entry.gameId !== gameId) continue
      clearTimeout(entry.timer)
      timers.delete(key)
      fireAndForget(gameId, entry.run)
    }
  }

  const cancel = (key: string) => {
    const entry = timers.get(key)
    if (!entry) return
    clearTimeout(entry.timer)
    timers.delete(key)
    refreshSaveState()
  }

  // --- State helpers ----------------------------------------------------------------------------------------------

  const setItems = (gameId: string, list: GameItem[]) =>
    set((s) => ({
      items: { ...s.items, [gameId]: list },
      games: s.games.map((g) => (g.id === gameId ? { ...g, itemCount: list.length } : g)),
    }))

  const applyGame = (response: GameResponse, mode: 'play' | 'edit') => {
    const summary = detailToSummary(response)
    const codec = summary && itemCodec(summary.type)
    if (!summary) {
      set((s) => ({ gameStatus: { ...s.gameStatus, [response.code]: 'missing' } }))
      return
    }
    set((s) => ({
      games: s.games.some((g) => g.id === summary.id)
        ? s.games.map((g) => (g.id === summary.id ? summary : g))
        : [summary, ...s.games],
      items: { ...s.items, [summary.id]: codec ? response.items.map(codec.fromItem) : [] },
      settings: { ...s.settings, [summary.id]: response.settings ?? {} },
      gameStatus: { ...s.gameStatus, [summary.id]: mode },
    }))
  }

  const itemsOf = (gameId: string) => get().items[gameId] ?? []
  const typeOf = (gameId: string) => {
    const type = get().games.find((g) => g.id === gameId)?.type
    if (!type) throw new Error(`Game ${gameId} is not loaded`)
    return type
  }

  // --- Store --------------------------------------------------------------------------------------------------------

  return {
    games: [],
    gamesStatus: 'idle',
    items: {},
    settings: {},
    gameStatus: {},
    saveState: 'saved',

    loadGames: async () => {
      if (get().gamesStatus !== 'ready') set({ gamesStatus: 'loading' })
      try {
        const games = (await gameApi.listGames()).flatMap((g) => toGameSummary(g) ?? [])
        set({ games, gamesStatus: 'ready' })
      } catch {
        if (get().gamesStatus !== 'ready') set({ gamesStatus: 'error' })
      }
    },

    loadGame: async (gameId, mode) => {
      const current = get().gameStatus[gameId]
      if (current !== 'play' && current !== 'edit') {
        set((s) => ({ gameStatus: { ...s.gameStatus, [gameId]: 'loading' } }))
      }
      flush(gameId)
      await queue
      try {
        applyGame(mode === 'edit' ? await gameApi.openDraft(gameId) : await gameApi.getGame(gameId), mode)
        if (get().saveState === 'error' && running === 0) set({ saveState: 'saved' })
      } catch (error) {
        set((s) => ({ gameStatus: { ...s.gameStatus, [gameId]: isNotFound(error) ? 'missing' : 'error' } }))
      }
    },

    createGame: async (type, grade) => {
      const created = await gameApi.createGame({ templateCode: type, grade })
      const codec = itemCodec(type)
      if (!codec) throw new Error(`${type} has no items`)
      try {
        const withItem = await gameApi.addItems(created.code, [toCreateRequest(type, codec.empty())])
        applyGame(withItem, 'edit')
        return created.code
      } catch (error) {
        // Do not leave an empty, half-created game in the library.
        await gameApi.archiveGame(created.code).catch(() => undefined)
        throw error
      }
    },

    renameGame: (gameId, title) => {
      set((s) => ({ games: s.games.map((g) => (g.id === gameId ? { ...g, title } : g)) }))
      schedule(`title:${gameId}`, gameId, async () => {
        const latest = get().games.find((g) => g.id === gameId)?.title.trim()
        // A blank title is rejected by the backend: keep the last saved one until the teacher types a name.
        if (latest) await gameApi.updateGame(gameId, { title: latest })
      })
    },

    archiveGame: async (gameId) => {
      // Pending edits go first; a failed archive must not reload the game into the editor.
      flush(gameId)
      await queue
      await gameApi.archiveGame(gameId)
      set((s) => ({ games: s.games.filter((g) => g.id !== gameId) }))
    },

    addItems: async (gameId, drafts) => {
      const type = typeOf(gameId)
      const codec = itemCodec(type)
      if (!codec) throw new Error(`${type} has no items`)
      flush(gameId)
      const response = await enqueue(gameId, () =>
        gameApi.addItems(gameId, drafts.map((d) => toCreateRequest(type, d))),
      )
      // New items are appended, so they are the last ones of the response.
      const created = response.items.slice(response.items.length - drafts.length).map(codec.fromItem)
      setItems(gameId, [...itemsOf(gameId), ...created])
      return created
    },

    updateItem: (gameId, itemId, patch) => {
      setItems(
        gameId,
        itemsOf(gameId).map((item) => (item.id === itemId ? ({ ...item, ...patch } as GameItem) : item)),
      )
      schedule(`item:${gameId}:${itemId}`, gameId, async () => {
        const latest = itemsOf(gameId).find((item) => item.id === itemId)
        const codec = itemCodec(typeOf(gameId))
        if (latest && codec) await gameApi.updateItem(gameId, Number(itemId), codec.toFields(latest))
      })
    },

    removeItem: (gameId, itemId) => {
      cancel(`item:${gameId}:${itemId}`)
      setItems(
        gameId,
        itemsOf(gameId).filter((item) => item.id !== itemId),
      )
      fireAndForget(gameId, () => gameApi.deleteItem(gameId, Number(itemId)))
    },

    reorderItems: (gameId, orderedIds) => {
      const byId = new Map(itemsOf(gameId).map((item) => [item.id, item]))
      setItems(
        gameId,
        orderedIds.flatMap((id) => byId.get(id) ?? []),
      )
      fireAndForget(gameId, () => gameApi.reorderItems(gameId, orderedIds.map(Number)))
    },
  }
})
