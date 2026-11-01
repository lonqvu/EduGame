import { useEffect, useState } from 'react'
import * as classroomApi from '@/api/classroomApi'
import { useClassStore } from '@/store/classStore'
import type { ClassroomResponse, StudentResponse } from '@/types/api'
import { isNotFound } from '@/utils/apiError'
import { sortByGivenName } from '@/utils/classrooms'

export type DetailStatus = 'loading' | 'ready' | 'error' | 'missing'

/**
 * A class and its class list, for /classes/:code. Every change is saved first, then shown; the shared class store
 * is refreshed so the home page and the projector see it too.
 */
export function useClassroomDetail(code: string) {
  const [status, setStatus] = useState<DetailStatus>('loading')
  const [classroom, setClassroom] = useState<ClassroomResponse>()
  const [students, setStudents] = useState<StudentResponse[]>([])
  const refreshShared = useClassStore((s) => s.refresh)

  // Another class (link from the same page): show it loading, not the previous one.
  const [shownCode, setShownCode] = useState(code)
  if (code !== shownCode) {
    setShownCode(code)
    setStatus('loading')
    setClassroom(undefined)
    setStudents([])
  }

  // Bumped by "Thử lại" to fetch again.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    Promise.all([classroomApi.getClassroom(code), classroomApi.listStudents(code)]).then(
      ([c, list]) => {
        if (!current) return
        setClassroom(c)
        setStudents(list)
        setStatus('ready')
      },
      (error: unknown) => {
        if (current) setStatus(isNotFound(error) ? 'missing' : 'error')
      },
    )
    // Left the page or opened another class: this answer is not wanted any more.
    return () => {
      current = false
    }
  }, [code, attempt])

  const changed = (count: number) => {
    setClassroom((c) => (c ? { ...c, studentCount: c.studentCount + count } : c))
    void refreshShared()
  }

  return {
    status,
    classroom,
    students,
    reload: () => {
      setStatus('loading')
      setAttempt((n) => n + 1)
    },

    addStudents: async (names: string[]) => {
      const added = await classroomApi.addStudents(code, names.map((displayName) => ({ displayName })))
      setStudents((list) => [...list, ...added])
      changed(added.length)
      return added
    },

    renameStudent: async (id: number, displayName: string) => {
      const saved = await classroomApi.updateStudent(code, id, { displayName })
      setStudents((list) => list.map((s) => (s.id === id ? saved : s)))
      changed(0)
    },

    removeStudent: async (id: number) => {
      await classroomApi.removeStudent(code, id)
      setStudents((list) => list.filter((s) => s.id !== id))
      changed(-1)
    },

    /** Roll numbers 1..n in Vietnamese alphabetical order (by given name). */
    sortStudentsByName: async () => {
      const ordered = await classroomApi.reorderStudents(code, sortByGivenName(students).map((s) => s.id))
      setStudents(ordered)
      changed(0)
    },

    /**
     * Stars (taken away when negative) for some students, shown at once and saved; the students' real totals come
     * back from the server. If saving fails the stars are taken back and the error rethrown.
     */
    awardStars: async (ids: number[], points: number) => {
      const add = (sign: number) =>
        setStudents((list) =>
          list.map((s) =>
            ids.includes(s.id) ? { ...s, weeklyStars: s.weeklyStars + sign * points, totalStars: s.totalStars + sign * points } : s,
          ),
        )
      add(1)
      setClassroom((c) => (c ? { ...c, weeklyStars: c.weeklyStars + ids.length * points } : c))
      try {
        await Promise.all(ids.map((id) => classroomApi.awardStars(code, id, points)))
      } catch (error) {
        add(-1)
        setClassroom((c) => (c ? { ...c, weeklyStars: c.weeklyStars - ids.length * points } : c))
        throw error
      }
      // The praise corner of the home page shows the class being taught.
      if (useClassStore.getState().classroomCode === code) void refreshShared()
    },

    /** The class after an edit made through the shared store (rename, pause...). */
    setClassroom,
  }
}
