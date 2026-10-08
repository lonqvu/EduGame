import { httpClient } from '@/api/httpClient'
import type { ClassroomResponse, StudentResponse } from '@/types/api'

const classroomPath = (code: string) => `/v1/classrooms/${encodeURIComponent(code)}`

export async function listClassrooms(): Promise<ClassroomResponse[]> {
  const { data } = await httpClient.get<ClassroomResponse[]>('/v1/classrooms')
  return data
}

/** Class list in roll call order, with weekly / total stars. */
export async function listStudents(classroomCode: string): Promise<StudentResponse[]> {
  const { data } = await httpClient.get<StudentResponse[]>(`${classroomPath(classroomCode)}/students`)
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
