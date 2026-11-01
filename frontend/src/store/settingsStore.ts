import { create } from 'zustand'
import { isGuest, useAuthStore } from '@/store/authStore'
import * as settingsApi from '@/api/settingsApi'
import type { LoadStatus, UserSettings } from '@/types/api'
import { cacheDisplay, readCachedDisplay, readGuestSettings, saveGuestSettings, withDefaults } from '@/utils/settings'

type Section = keyof UserSettings

/** A change to one section, e.g. `{ display: { reduceMotion: true } }`. */
export type SettingsPatch = { [S in Section]?: Partial<UserSettings[S]> }

/**
 * "Cài đặt" of the signed-in teacher. Changes show at once and are saved in the order they are made. A visitor's are
 * kept in this browser instead.
 */
interface SettingsState {
  settings: UserSettings
  status: LoadStatus
  /** A save is on its way. */
  saving: boolean
  load: () => Promise<void>
  /**
   * Applies the change and saves the whole document. If the save fails, the settings go back to the last saved
   * ones and the promise rejects with the API error.
   */
  update: (patch: SettingsPatch) => Promise<void>
}

/** The last settings the server confirmed: where a failed save goes back to. */
let saved: UserSettings | null = null
/** Saves run one after another, so an older one never overwrites a newer one. */
let queue: Promise<unknown> = Promise.resolve()
let pending = 0

function merge(settings: UserSettings, patch: SettingsPatch): UserSettings {
  return {
    display: { ...settings.display, ...patch.display },
    games: { ...settings.games, ...patch.games },
    notifications: { ...settings.notifications, ...patch.notifications },
    sound: { ...settings.sound, ...patch.sound },
  }
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: withDefaults({ display: readCachedDisplay() }),
  status: 'idle',
  saving: false,

  load: async () => {
    // A visitor has no account: their settings are kept in this browser.
    if (isGuest()) {
      set({ settings: readGuestSettings(), status: 'ready' })
      return
    }
    if (get().status === 'loading' || get().status === 'ready') return
    set({ status: 'loading' })
    try {
      const settings = withDefaults(await settingsApi.getSettings())
      saved = settings
      cacheDisplay(settings.display)
      // A change made while loading wins over what was loaded.
      if (pending === 0) set({ settings })
      set({ status: 'ready' })
    } catch {
      set({ status: 'error' })
    }
  },

  update: (patch) => {
    const next = merge(get().settings, patch)
    if (isGuest()) {
      set({ settings: next })
      cacheDisplay(next.display)
      saveGuestSettings(next)
      return Promise.resolve()
    }
    set({ settings: next, saving: true })
    cacheDisplay(next.display)
    pending++
    const save = queue.then(async () => {
      try {
        // The newest settings when this save runs: several quick changes end with the last one saved.
        const result = withDefaults(await settingsApi.saveSettings(get().settings))
        saved = result
      } catch (error) {
        if (saved) {
          set({ settings: saved })
          cacheDisplay(saved.display)
        }
        throw error
      } finally {
        pending--
        if (pending === 0) set({ saving: false })
      }
    })
    queue = save.catch(() => undefined)
    return save
  },
}))

// A visitor signed in: the teacher's own settings are loaded in place of the visitor's.
useAuthStore.subscribe((state, previous) => {
  if (state.status === 'signedIn' && previous.status === 'signedOut') {
    useSettingsStore.setState({ settings: withDefaults({ display: readCachedDisplay() }), status: 'idle' })
  }
})
