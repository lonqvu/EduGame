import { create } from 'zustand'

/** Work the app is waiting for (API requests): the top loading bar shows while there is some. */
interface LoadingState {
  pending: number
  begin: () => void
  end: () => void
}

export const useLoadingStore = create<LoadingState>((set) => ({
  pending: 0,
  begin: () => set((s) => ({ pending: s.pending + 1 })),
  end: () => set((s) => ({ pending: Math.max(0, s.pending - 1) })),
}))
