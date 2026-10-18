import { httpClient } from '@/api/httpClient'
import type {
  ClassroomResponse,
  ClassroomStatus,
  CreateClassroomRequest,
  GameResults,
  NewStudentRequest,
  PlaySessionResponse,
  StudentResponse,
  UpdateClassroomRequest,
} from '@/types/api'

const classroomPath = (code: string) => `/v1/classrooms/${encodeURIComponent(code)}`

// --- Classes --------------------------------------------------------------------------------------------------

/** The teacher's classes (active and paused, or one status), by grade then name. */
export async function listClassrooms(status?: ClassroomStatus): Promise<ClassroomResponse[]> {
  const { data } = await httpClient.get<ClassroomResponse[]>('/v1/classrooms', { params: status ? { status } : undefined })
  return data
}

export async function getClassroom(code: string): Promise<ClassroomResponse> {
  const { data } = await httpClient.get<ClassroomResponse>(classroomPath(code))
  return data
}

export async function createClassroom(request: CreateClassroomRequest): Promise<ClassroomResponse> {
  const { data } = await httpClient.post<ClassroomResponse>('/v1/classrooms', request)
  return data
}

export async function updateClassroom(code: string, request: UpdateClassroomRequest): Promise<ClassroomResponse> {
  const { data } = await httpClient.patch<ClassroomResponse>(classroomPath(code), request)
  return data
}

/** Removes the class from the teacher's lists (its stars and history stay on the server). */
export async function archiveClassroom(code: string): Promise<void> {
  await httpClient.delete(classroomPath(code))
}

// --- Students -------------------------------------------------------------------------------------------------

/** Class list in roll call order, with weekly / total stars. */
export async function listStudents(classroomCode: string): Promise<StudentResponse[]> {
  const { data } = await httpClient.get<StudentResponse[]>(`${classroomPath(classroomCode)}/students`)
  return data
}

/** Adds students at the end of the class list, in this order. */
export async function addStudents(classroomCode: string, students: NewStudentRequest[]): Promise<StudentResponse[]> {
  const { data } = await httpClient.post<StudentResponse[]>(`${classroomPath(classroomCode)}/students`, { students })
  return data
}

export async function updateStudent(
  classroomCode: string,
  studentId: number,
  changes: Partial<NewStudentRequest>,
): Promise<StudentResponse> {
  const { data } = await httpClient.patch<StudentResponse>(`${classroomPath(classroomCode)}/students/${studentId}`, changes)
  return data
}

export async function removeStudent(classroomCode: string, studentId: number): Promise<void> {
  await httpClient.delete(`${classroomPath(classroomCode)}/students/${studentId}`)
}

/** New roll call order: every student id once; roll numbers become 1..n. */
export async function reorderStudents(classroomCode: string, studentIds: number[]): Promise<StudentResponse[]> {
  const { data } = await httpClient.put<StudentResponse[]>(`${classroomPath(classroomCode)}/students/order`, { studentIds })
  return data
}

/** Gives (or takes away, when negative) stars; returns the student with updated totals. */
export async function awardStars(
  classroomCode: string,
  studentId: number,
  points: number,
  reason?: string,
): Promise<StudentResponse> {
  const { data } = await httpClient.post<StudentResponse>(
    `${classroomPath(classroomCode)}/students/${studentId}/points`,
    { points, reason },
  )
  return data
}

// --- Games played with the class ------------------------------------------------------------------------------

/** A game opens on the projector for the class (one activity). */
export async function startSession(classroomCode: string, gameCode: string): Promise<PlaySessionResponse> {
  const { data } = await httpClient.post<PlaySessionResponse>(`${classroomPath(classroomCode)}/sessions`, { gameCode })
  return data
}

/** The class reached the results (the activity is completed). */
/** The class reached the results screen, which showed `results` (kept for the reports). */
export async function endSession(classroomCode: string, sessionId: number, results?: GameResults): Promise<PlaySessionResponse> {
  const { data } = await httpClient.post<PlaySessionResponse>(
    `${classroomPath(classroomCode)}/sessions/${sessionId}/end`,
    results ? { results } : undefined,
  )
  return data
}
