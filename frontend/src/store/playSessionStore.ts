import * as classroomApi from '@/api/classroomApi'
import { useClassStore } from '@/store/classStore'
import type { GameResults } from '@/types/api'

/**
 * Games played with the current class, for its "Hoạt động" / "Hoàn thành" counts: a session starts when a game opens
 * on the projector and ends when the class reaches the results. Recording is best effort: a failed request never
 * stops the game.
 *
 * Open sessions are kept per game in sessionStorage, so reloading the projector or going board → tile → results
 * (Lật ô) stays one session.
 */
interface OpenSession {
  classroomCode: string
  sessionId: number
}

const STORAGE_KEY = 'edugame.playSessions'

/** Sessions being started, by game: a second start (StrictMode, a quick replay) waits for the first. */
const starting = new Map<string, Promise<OpenSession | undefined>>()

function readOpen(): Record<string, OpenSession> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, OpenSession>
  } catch {
    return {}
  }
}

function writeOpen(open: Record<string, OpenSession>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(open))
  } catch {
    // Storage blocked: sessions are only counted while the page stays open.
  }
}

/** The class opens this game: one activity, unless a session of it is already open. */
export function beginPlaySession(gameCode: string): Promise<OpenSession | undefined> {
  const open = readOpen()[gameCode]
  if (open) return Promise.resolve(open)
  const pending = starting.get(gameCode)
  if (pending) return pending

  const start = (async () => {
    try {
      // The projector may be opened directly (new tab): find out which class is being taught first.
      if (useClassStore.getState().status !== 'ready') await useClassStore.getState().load()
      const { classroomCode, classrooms } = useClassStore.getState()
      const classroom = classrooms.find((c) => c.code === classroomCode)
      if (!classroom || classroom.status !== 'ACTIVE') return undefined
      const session = await classroomApi.startSession(classroom.code, gameCode)
      const started = { classroomCode: classroom.code, sessionId: session.id }
      writeOpen({ ...readOpen(), [gameCode]: started })
      return started
    } catch {
      return undefined
    } finally {
      starting.delete(gameCode)
    }
  })()
  starting.set(gameCode, start)
  return start
}

/** The class reached the results of this game: its open session is completed, with what the results showed. */
export async function finishPlaySession(gameCode: string, results?: GameResults): Promise<void> {
  const session = readOpen()[gameCode] ?? (await starting.get(gameCode))
  if (!session) return
  const open = readOpen()
  delete open[gameCode]
  writeOpen(open)
  await classroomApi.endSession(session.classroomCode, session.sessionId, results).catch(() => undefined)
}
