import { create } from 'zustand'
import * as classroomApi from '@/api/classroomApi'
import type { ClassroomResponse, CreateClassroomRequest, LoadStatus, UpdateClassroomRequest } from '@/types/api'
import type { Student } from '@/types/game'
import { classTitle, pickCurrentClass } from '@/utils/classrooms'
import { toStudent } from '@/utils/gameMapping'

/** The class chosen on the home page, remembered on this device. */
const CURRENT_CLASS_KEY = 'edugame.currentClass'

function remembered(): string | null {
  try {
    return localStorage.getItem(CURRENT_CLASS_KEY)
  } catch {
    return null
  }
}

function remember(code: string) {
  try {
    localStorage.setItem(CURRENT_CLASS_KEY, code)
  } catch {
    // Private window / blocked storage: the choice lasts until the page is reloaded.
  }
}

/**
 * The class being taught (the games are played with it) and its class list with weekly stars. It is the class the
 * teacher picked on this device while it stays active, else the active class played with most recently.
 */
interface ClassState {
  status: LoadStatus
  /** The teacher's classes, active and paused (the picker shows the active ones). */
  classrooms: ClassroomResponse[]
  classroomCode: string | null
  /** "Lớp 3A" (empty when the teacher has no class) */
  className: string
  grade: number | undefined
  students: Student[]
  /**
   * The students are names typed on the projector (no class yet): they are played with, but nothing is saved for
   * them (no stars, no reports).
   */
  quickList: boolean
  /** Plays the name tools with these names until a class exists. */
  startQuickList: (names: string[]) => void
  /** Makes a class of the typed names and teaches it from now on. */
  saveQuickList: (name: string, grade: number) => Promise<ClassroomResponse>
  /** Refetches the classes and the current class list; keeps showing the current one meanwhile. */
  load: () => Promise<void>
  /** Teaches another (active) class from now on, on this device. */
  select: (code: string) => Promise<void>
  /** Creates a class; the lists are refreshed before it resolves. */
  createClassroom: (request: CreateClassroomRequest) => Promise<ClassroomResponse>
  updateClassroom: (code: string, request: UpdateClassroomRequest) => Promise<ClassroomResponse>
  archiveClassroom: (code: string) => Promise<void>
  /** Refreshes after the class list of a class changed elsewhere (detail page). */
  refresh: () => Promise<void>
  /** Shows the stars at once, then saves; rolls back and rejects if saving fails. */
  awardStars: (studentId: string, count: number) => Promise<void>
}

let inflight: Promise<void> | null = null
/** Code picked while a load was running: the load must not bring the older choice back. */
let picked: string | null = null

/**
 * Star requests still waiting for an answer, by student. The server's totals are only taken when a request
 * ran alone: with quick clicks the answers may come back out of order, and an older answer would undo newer stars.
 */
const awarding = new Map<string, { pending: number; overlapped: boolean }>()

export const useClassStore = create<ClassState>()((set, get) => ({
  status: 'idle',
  classrooms: [],
  classroomCode: null,
  className: '',
  grade: undefined,
  students: [],
  quickList: false,

  load: () => {
    inflight ??= (async () => {
      if (get().status !== 'ready') set({ status: 'loading' })
      try {
        const classrooms = await classroomApi.listClassrooms()
        const classroom = pickCurrentClass(classrooms, picked ?? remembered())
        const students = classroom ? await classroomApi.listStudents(classroom.code) : []
        set({
          status: 'ready',
          classrooms,
          classroomCode: classroom?.code ?? null,
          className: classroom ? classTitle(classroom.name) : '',
          grade: classroom?.grade,
          // Without a class, names typed on the projector stay for the next tool.
          students: classroom ? students.map(toStudent) : get().quickList ? get().students : [],
          quickList: !classroom && get().quickList,
        })
      } catch {
        if (get().status !== 'ready') set({ status: 'error' })
      } finally {
        inflight = null
      }
    })()
    return inflight
  },

  select: async (code) => {
    remember(code)
    picked = code
    try {
      await get().refresh()
    } finally {
      picked = null
    }
  },

  startQuickList: (names) =>
    set({ quickList: true, students: names.map((name, i) => ({ id: `quick-${i + 1}`, name, stars: 0, totalStars: 0 })) }),

  saveQuickList: async (name, grade) => {
    const names = get().students.map((s) => s.name)
    const created = await classroomApi.createClassroom({ name, grade })
    await classroomApi.addStudents(created.code, names.map((displayName) => ({ displayName })))
    remember(created.code)
    picked = created.code
    try {
      await get().refresh()
    } finally {
      picked = null
    }
    return created
  },

  createClassroom: async (request) => {
    const created = await classroomApi.createClassroom(request)
    await get().refresh()
    return created
  },

  updateClassroom: async (code, request) => {
    const updated = await classroomApi.updateClassroom(code, request)
    await get().refresh()
    return updated
  },

  archiveClassroom: async (code) => {
    await classroomApi.archiveClassroom(code)
    await get().refresh()
  },

  refresh: async () => {
    // A load already running may have read the classes before the change: wait for it, then read again.
    await inflight
    await get().load()
  },

  awardStars: async (studentId, count) => {
    const { classroomCode } = get()
    if (!classroomCode) return
    const addStars = (delta: number) =>
      set((s) => ({
        students: s.students.map((st) =>
          st.id === studentId ? { ...st, stars: st.stars + delta, totalStars: st.totalStars + delta } : st,
        ),
      }))

    const track = awarding.get(studentId) ?? { pending: 0, overlapped: false }
    awarding.set(studentId, track)
    track.pending++
    if (track.pending > 1) track.overlapped = true

    addStars(count)
    try {
      const saved = await classroomApi.awardStars(classroomCode, Number(studentId), count)
      if (track.pending === 1 && !track.overlapped) {
        set((s) => ({ students: s.students.map((st) => (st.id === studentId ? toStudent(saved) : st)) }))
      }
    } catch (error) {
      addStars(-count)
      throw error
    } finally {
      track.pending--
      if (track.pending === 0) awarding.delete(studentId)
    }
  },
}))
