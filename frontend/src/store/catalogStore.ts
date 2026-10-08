import { create } from 'zustand'
import { listTemplates } from '@/api/templateApi'
import type { LoadStatus } from '@/types/api'
import type { GameTemplate, GameType } from '@/types/game'
import { toGameTemplate } from '@/utils/gameMapping'

/** Game templates (GET /game-templates). They rarely change, so they are loaded once per page load. */
interface CatalogState {
  templates: GameTemplate[]
  status: LoadStatus
  load: () => Promise<void>
}

export const useCatalogStore = create<CatalogState>()((set, get) => ({
  templates: [],
  status: 'idle',
  load: async () => {
    if (get().status !== 'idle' && get().status !== 'error') return
    set({ status: 'loading' })
    try {
      const templates = (await listTemplates()).flatMap((t) => toGameTemplate(t) ?? [])
      set({ templates, status: 'ready' })
    } catch {
      set({ status: 'error' })
    }
  },
}))

/** Template name of a game type, e.g. "Lật ô thi đua" (empty until templates are loaded). */
export const useTemplateName = (type: GameType | undefined) =>
  useCatalogStore((s) => s.templates.find((t) => t.type === type)?.name ?? '')
