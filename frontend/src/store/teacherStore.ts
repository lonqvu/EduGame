import { create } from 'zustand'
import { getMe } from '@/api/userApi'
import type { LoadStatus } from '@/types/api'

export interface Teacher {
  /** "Cô Lan" */
  name: string
  /** "cô Lan", used inside a sentence ("Chào cô Lan!") */
  greetingName: string
  /** "Lan", without the honorific (avatar initial) */
  shortName: string
}

const HONORIFIC = /^(cô|thầy)\s+/i

function toTeacher(displayName: string): Teacher {
  return {
    name: displayName,
    greetingName: HONORIFIC.test(displayName) ? displayName.charAt(0).toLowerCase() + displayName.slice(1) : displayName,
    shortName: displayName.replace(HONORIFIC, ''),
  }
}

/** The signed-in teacher (GET /me). */
interface TeacherState {
  teacher: Teacher | null
  status: LoadStatus
  load: () => Promise<void>
}

export const useTeacherStore = create<TeacherState>()((set, get) => ({
  teacher: null,
  status: 'idle',
  load: async () => {
    if (get().status !== 'idle' && get().status !== 'error') return
    set({ status: 'loading' })
    try {
      const me = await getMe()
      set({ teacher: toTeacher(me.displayName), status: 'ready' })
    } catch {
      set({ status: 'error' })
    }
  },
}))
