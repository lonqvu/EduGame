import { httpClient } from '@/api/httpClient'
import type { ClassReport } from '@/types/api'

/** "Báo cáo" of a class from `from` to `to` (YYYY-MM-DD, whole days). */
export async function getClassReport(classroomCode: string, from: string, to: string, signal?: AbortSignal): Promise<ClassReport> {
  const { data } = await httpClient.get<ClassReport>(`/v1/reports/classrooms/${encodeURIComponent(classroomCode)}`, {
    params: { from, to },
    signal,
  })
  return data
}
