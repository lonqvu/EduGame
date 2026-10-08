import { create } from 'zustand'
import * as classroomApi from '@/api/classroomApi'
import type { LoadStatus } from '@/types/api'
import type { Student } from '@/types/game'
import { toStudent } from '@/utils/gameMapping'

/**
 * The teacher's class list and weekly stars. There is no class picker yet: the first active class is used.
 */
interface ClassState {
  status: LoadStatus
  classroomCode: string | null
  /** "Lớp 3A" (empty when the teacher has no class) */
  className: string
  grade: number | undefined
  students: Student[]
  /** Refetches the class list; keeps showing the current one meanwhile. */
  load: () => Promise<void>
  /** Shows the stars at once, then saves; rolls back and rejects if saving fails. */
  awardStars: (studentId: string, count: number) => Promise<void>
}

let inflight: Promise<void> | null = null

export const useClassStore = create<ClassState>()((set, get) => ({
  status: 'idle',
  classroomCode: null,
  className: '',
  grade: undefined,
  students: [],

  load: () => {
    inflight ??= (async () => {
      if (get().status !== 'ready') set({ status: 'loading' })
      try {
        const [classroom] = await classroomApi.listClassrooms()
        const students = classroom ? await classroomApi.listStudents(classroom.code) : []
        set({
          status: 'ready',
          classroomCode: classroom?.code ?? null,
          className: classroom ? `Lớp ${classroom.name}` : '',
          grade: classroom?.grade,
          students: students.map(toStudent),
        })
      } catch {
        if (get().status !== 'ready') set({ status: 'error' })
      } finally {
        inflight = null
      }
    })()
    return inflight
  },

  awardStars: async (studentId, count) => {
    const { classroomCode } = get()
    if (!classroomCode) return
    const addStars = (delta: number) =>
      set((s) => ({ students: s.students.map((st) => (st.id === studentId ? { ...st, stars: st.stars + delta } : st)) }))

    addStars(count)
    try {
      const saved = await classroomApi.awardStars(classroomCode, Number(studentId), count)
      set((s) => ({ students: s.students.map((st) => (st.id === studentId ? toStudent(saved) : st)) }))
    } catch (error) {
      addStars(-count)
      throw error
    }
  },
}))
