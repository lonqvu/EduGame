import { create } from 'zustand'
import * as gameApi from '@/api/gameApi'
import type { GameResponse, LoadStatus } from '@/types/api'
import type { GameSummary, GameType, Question } from '@/types/game'
import { isNotFound } from '@/utils/apiError'
import {
  detailToSummary,
  toCreateItemRequest,
  toGameSummary,
  toItemFields,
  toQuestion,
} from '@/utils/gameMapping'

/**
 * - `play`: loaded read-only (GET), enough for the projector.
 * - `edit`: loaded through POST /draft, so item ids no longer change while editing.
 */
export type GameLoadState = 'loading' | 'play' | 'edit' | 'missing' | 'error'

export type SaveState = 'saved' | 'saving' | 'error'

/**
 * Teacher's games and their questions, backed by /api/v1/games.
 *
 * Edits are applied to the store at once (the editor autosaves on every keystroke), then sent to the backend:
 * typing is debounced per question / title, and all requests go through one queue so they reach the server in
 * the order they were made. If a request fails, the game is reloaded from the server.
 */
interface GameLibraryState {
  games: GameSummary[]
  gamesStatus: LoadStatus
  questions: Record<string, Question[]>
  gameStatus: Record<string, GameLoadState>
  saveState: SaveState

  loadGames: () => Promise<void>
  /** Waits for pending saves first, so what is loaded includes the latest edits. */
  loadGame: (gameId: string, mode: 'play' | 'edit') => Promise<void>
  /** Creates a game with one empty question; resolves with its id. */
  createGame: (type: GameType, grade?: number) => Promise<string>
  renameGame: (gameId: string, title: string) => void
  /** Resolves with the created questions (they need server ids, so this waits for the backend). */
  addQuestions: (gameId: string, drafts: Omit<Question, 'id'>[]) => Promise<Question[]>
  updateQuestion: (gameId: string, questionId: string, patch: Partial<Omit<Question, 'id'>>) => void
  removeQuestion: (gameId: string, questionId: string) => void
  reorderQuestions: (gameId: string, orderedIds: string[]) => void
}

const SAVE_DELAY_MS = 600

export const emptyQuestion = (): Omit<Question, 'id'> => ({ text: '', answer: '', points: 20 })

export const useGameLibraryStore = create<GameLibraryState>()((set, get) => {
  // --- Save pipeline -------------------------------------------------------------------------------------------

  /** Requests run one after another, in call order. */
  let queue: Promise<unknown> = Promise.resolve()
  let running = 0
  /** Debounced saves, by key ("title:<game>", "item:<game>:<question>"). */
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

  const setQuestions = (gameId: string, list: Question[]) =>
    set((s) => ({
      questions: { ...s.questions, [gameId]: list },
      games: s.games.map((g) => (g.id === gameId ? { ...g, itemCount: list.length } : g)),
    }))

  const applyGame = (response: GameResponse, mode: 'play' | 'edit') => {
    const summary = detailToSummary(response)
    if (!summary) {
      set((s) => ({ gameStatus: { ...s.gameStatus, [response.code]: 'missing' } }))
      return
    }
    set((s) => ({
      games: s.games.some((g) => g.id === summary.id)
        ? s.games.map((g) => (g.id === summary.id ? summary : g))
        : [summary, ...s.games],
      questions: { ...s.questions, [summary.id]: response.items.map(toQuestion) },
      gameStatus: { ...s.gameStatus, [summary.id]: mode },
    }))
  }

  const questionsOf = (gameId: string) => get().questions[gameId] ?? []

  // --- Store --------------------------------------------------------------------------------------------------------

  return {
    games: [],
    gamesStatus: 'idle',
    questions: {},
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
      try {
        const withQuestion = await gameApi.addItems(created.code, [toCreateItemRequest(emptyQuestion())])
        applyGame(withQuestion, 'edit')
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

    addQuestions: async (gameId, drafts) => {
      flush(gameId)
      const response = await enqueue(gameId, () => gameApi.addItems(gameId, drafts.map(toCreateItemRequest)))
      // New items are appended, so they are the last ones of the response.
      const created = response.items.slice(response.items.length - drafts.length).map(toQuestion)
      setQuestions(gameId, [...questionsOf(gameId), ...created])
      return created
    },

    updateQuestion: (gameId, questionId, patch) => {
      setQuestions(
        gameId,
        questionsOf(gameId).map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
      )
      schedule(`item:${gameId}:${questionId}`, gameId, async () => {
        const latest = questionsOf(gameId).find((q) => q.id === questionId)
        if (latest) await gameApi.updateItem(gameId, Number(questionId), toItemFields(latest))
      })
    },

    removeQuestion: (gameId, questionId) => {
      cancel(`item:${gameId}:${questionId}`)
      setQuestions(
        gameId,
        questionsOf(gameId).filter((q) => q.id !== questionId),
      )
      fireAndForget(gameId, () => gameApi.deleteItem(gameId, Number(questionId)))
    },

    reorderQuestions: (gameId, orderedIds) => {
      const byId = new Map(questionsOf(gameId).map((q) => [q.id, q]))
      setQuestions(
        gameId,
        orderedIds.flatMap((id) => byId.get(id) ?? []),
      )
      fireAndForget(gameId, () => gameApi.reorderItems(gameId, orderedIds.map(Number)))
    },
  }
})
