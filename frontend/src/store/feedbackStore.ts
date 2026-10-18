import { create } from 'zustand'
import type { FeedbackKind } from '@/types/api'
import { EMPTY_DRAFT, type FeedbackDraft } from '@/utils/feedback'

/** "Góp ý": whether the dialog is open, and the draft (kept when it closes, cleared once sent). */
interface FeedbackState {
  open: boolean
  draft: FeedbackDraft
  /** Opens the dialog; with a kind, starts the draft with it (e.g. "Báo lỗi" from an error screen). */
  openFeedback: (kind?: FeedbackKind) => void
  close: () => void
  change: (patch: Partial<FeedbackDraft>) => void
  /** After sending. */
  clear: () => void
}

export const useFeedbackStore = create<FeedbackState>()((set) => ({
  open: false,
  draft: EMPTY_DRAFT,
  openFeedback: (kind) => set((s) => ({ open: true, draft: kind && !s.draft.message ? { ...s.draft, kind } : s.draft })),
  close: () => set({ open: false }),
  change: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  clear: () => set({ draft: EMPTY_DRAFT }),
}))
