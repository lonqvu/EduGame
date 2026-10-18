import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserSettings } from '@/types/api'

/** The server: settings it holds, saves it received, and the next calls to fail or hold. */
const backend = vi.hoisted(() => {
  const state = {
    stored: null as unknown as UserSettings,
    saves: [] as UserSettings[],
    failGet: false,
    failSave: false,
    /** A save waits for this before answering. */
    gate: null as Promise<void> | null,
  }
  const api = {
    getSettings: vi.fn(async () => {
      if (state.failGet) throw { status: 0, code: 'NETWORK_ERROR', message: 'offline' }
      return structuredClone(state.stored)
    }),
    saveSettings: vi.fn(async (settings: UserSettings) => {
      state.saves.push(structuredClone(settings))
      if (state.gate) await state.gate
      if (state.failSave) throw { status: 400, code: 'VALIDATION_FAILED', message: 'bad' }
      state.stored = structuredClone(settings)
      return structuredClone(settings)
    }),
  }
  return { state, api }
})

vi.mock('@/api/settingsApi', () => backend.api)

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
})

const SERVER: UserSettings = {
  display: { reduceMotion: false, fullscreenOnStart: true },
  games: { teams: 3 },
  notifications: { newSignInEmail: true, passwordChangedEmail: false },
}

type Store = typeof import('@/store/settingsStore').useSettingsStore

/** A fresh store module (its save queue is module state). */
async function freshStore(): Promise<Store> {
  vi.resetModules()
  return (await import('@/store/settingsStore')).useSettingsStore
}

beforeEach(() => {
  storage.clear()
  backend.state.stored = structuredClone(SERVER)
  backend.state.saves = []
  backend.state.failGet = false
  backend.state.failSave = false
  backend.state.gate = null
  vi.clearAllMocks()
})

describe('load', () => {
  it('starts from the defaults, then holds the server settings and caches the display ones', async () => {
    const store = await freshStore()
    expect(store.getState().settings.display).toEqual({ reduceMotion: false, fullscreenOnStart: false })
    expect(store.getState().status).toBe('idle')

    await store.getState().load()

    expect(store.getState().status).toBe('ready')
    expect(store.getState().settings).toEqual(SERVER)
    expect(JSON.parse(storage.get('edugame.display')!)).toEqual(SERVER.display)
  })

  it('loads once, however many screens ask', async () => {
    const store = await freshStore()
    await Promise.all([store.getState().load(), store.getState().load()])
    await store.getState().load()
    expect(backend.api.getSettings).toHaveBeenCalledTimes(1)
  })

  it('fills keys an older server leaves out', async () => {
    backend.state.stored = { display: { reduceMotion: true } } as UserSettings
    const store = await freshStore()
    await store.getState().load()
    expect(store.getState().settings).toEqual({
      display: { reduceMotion: true, fullscreenOnStart: false },
      games: {},
      notifications: { newSignInEmail: true, passwordChangedEmail: true },
    })
  })

  it('applies the cached display settings before the server answers', async () => {
    storage.set('edugame.display', JSON.stringify({ reduceMotion: true, fullscreenOnStart: false }))
    const store = await freshStore()
    expect(store.getState().settings.display.reduceMotion).toBe(true)
  })

  it('ignores a cache it cannot read', async () => {
    storage.set('edugame.display', '{not json')
    const store = await freshStore()
    expect(store.getState().settings.display.reduceMotion).toBe(false)
  })

  it('says so when the server cannot be reached, and can try again', async () => {
    backend.state.failGet = true
    const store = await freshStore()
    await store.getState().load()
    expect(store.getState().status).toBe('error')

    backend.state.failGet = false
    await store.getState().load()
    expect(store.getState().status).toBe('ready')
  })
})

describe('update', () => {
  it('shows the change at once and saves the whole document', async () => {
    const store = await freshStore()
    await store.getState().load()

    const saving = store.getState().update({ display: { reduceMotion: true } })
    expect(store.getState().settings.display.reduceMotion).toBe(true)
    expect(store.getState().saving).toBe(true)
    await saving

    expect(store.getState().saving).toBe(false)
    expect(backend.state.saves).toEqual([{ ...SERVER, display: { reduceMotion: true, fullscreenOnStart: true } }])
    expect(JSON.parse(storage.get('edugame.display')!).reduceMotion).toBe(true)
  })

  it('changes one default for new games and keeps the others', async () => {
    const store = await freshStore()
    await store.getState().load()
    await store.getState().update({ games: { timeLimitSec: 20 } })
    expect(backend.state.stored.games).toEqual({ teams: 3, timeLimitSec: 20 })

    await store.getState().update({ games: { teams: null } })
    expect(backend.state.stored.games).toEqual({ teams: null, timeLimitSec: 20 })
  })

  it('saves quick changes one after another, the last one winning', async () => {
    const store = await freshStore()
    await store.getState().load()
    let open!: () => void
    backend.state.gate = new Promise((resolve) => (open = resolve))

    const first = store.getState().update({ display: { reduceMotion: true } })
    const second = store.getState().update({ display: { reduceMotion: false } })
    const third = store.getState().update({ notifications: { newSignInEmail: false } })
    open()
    await Promise.all([first, second, third])

    // The first save had already left; the next ones send the newest settings.
    expect(backend.state.saves.at(-1)).toMatchObject({ display: { reduceMotion: false }, notifications: { newSignInEmail: false } })
    expect(backend.state.stored).toMatchObject({ display: { reduceMotion: false }, notifications: { newSignInEmail: false } })
    expect(store.getState().saving).toBe(false)
  })

  it('goes back to the saved settings when a save fails, and says why', async () => {
    const store = await freshStore()
    await store.getState().load()
    backend.state.failSave = true

    await expect(store.getState().update({ display: { reduceMotion: true } })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })

    expect(store.getState().settings).toEqual(SERVER)
    expect(JSON.parse(storage.get('edugame.display')!).reduceMotion).toBe(false)
    expect(store.getState().saving).toBe(false)

    // The next change saves normally.
    backend.state.failSave = false
    await store.getState().update({ display: { reduceMotion: true } })
    expect(backend.state.stored.display.reduceMotion).toBe(true)
  })
})
