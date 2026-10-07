import { create } from 'zustand'
import { DEMO_CLASS_NAME, DEMO_STUDENTS } from '@/mocks/demoData'
import type { Student } from '@/types/game'

/** Teacher's class roster and weekly stars. In-memory until the class API exists. */
interface ClassState {
  className: string
  students: Student[]
  awardStars: (studentId: string, count: number) => void
}

export const useClassStore = create<ClassState>()((set) => ({
  className: DEMO_CLASS_NAME,
  students: DEMO_STUDENTS,
  awardStars: (studentId, count) =>
    set((s) => ({
      students: s.students.map((st) => (st.id === studentId ? { ...st, stars: st.stars + count } : st)),
    })),
}))
