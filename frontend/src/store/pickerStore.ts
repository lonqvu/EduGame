import { create } from 'zustand'

/** Who has been called this lesson, shared by every name-picking tool. */
interface PickerState {
  calledIds: string[]
  noRepeat: boolean
  setNoRepeat: (value: boolean) => void
  markCalled: (studentId: string) => void
  resetCalled: () => void
}

export const usePickerStore = create<PickerState>()((set) => ({
  calledIds: [],
  noRepeat: true,
  setNoRepeat: (noRepeat) => set({ noRepeat }),
  markCalled: (studentId) =>
    set((s) => (s.calledIds.includes(studentId) ? s : { calledIds: [...s.calledIds, studentId] })),
  resetCalled: () => set({ calledIds: [] }),
}))
