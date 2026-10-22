import { httpClient } from '@/api/httpClient'
import type {
  AdminAction,
  AdminAuditPage,
  AdminDashboard,
  AdminFeedback,
  AdminFeedbackPage,
  AdminTeacher,
  AdminTeacherPage,
  FeedbackStatus,
  UserRole,
  UserStatus,
} from '@/types/api'

/** "status=NEW&status=SEEN": repeated parameters, as Spring reads lists (axios would send "status[]="). */
function query(params: Record<string, string | number | readonly string[] | undefined>): URLSearchParams {
  const out = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) value.forEach((v: string) => out.append(key, v))
    else out.set(key, String(value))
  }
  return out
}

export async function getAdminDashboard(days: number, signal?: AbortSignal): Promise<AdminDashboard> {
  const { data } = await httpClient.get<AdminDashboard>('/v1/admin/dashboard', { params: { days }, signal })
  return data
}

export type TeacherSort = 'NEWEST' | 'LAST_ACTIVE' | 'NAME'

export interface TeacherQuery {
  q?: string
  status?: readonly UserStatus[]
  role?: readonly UserRole[]
  sort?: TeacherSort
  page?: number
  size?: number
}

export async function listAdminTeachers(teacherQuery: TeacherQuery, signal?: AbortSignal): Promise<AdminTeacherPage> {
  const { data } = await httpClient.get<AdminTeacherPage>('/v1/admin/teachers', { params: query({ ...teacherQuery }), signal })
  return data
}

const teacherPath = (code: string) => `/v1/admin/teachers/${encodeURIComponent(code)}`

export async function getAdminTeacher(code: string, signal?: AbortSignal): Promise<AdminTeacher> {
  const { data } = await httpClient.get<AdminTeacher>(teacherPath(code), { signal })
  return data
}

export async function lockTeacher(code: string, reason?: string): Promise<AdminTeacher> {
  const { data } = await httpClient.post<AdminTeacher>(`${teacherPath(code)}/lock`, { reason: reason?.trim() || undefined })
  return data
}

export async function unlockTeacher(code: string): Promise<AdminTeacher> {
  const { data } = await httpClient.post<AdminTeacher>(`${teacherPath(code)}/unlock`)
  return data
}

export async function signOutTeacher(code: string): Promise<AdminTeacher> {
  const { data } = await httpClient.post<AdminTeacher>(`${teacherPath(code)}/sign-out`)
  return data
}

export async function changeTeacherRole(code: string, role: UserRole): Promise<AdminTeacher> {
  const { data } = await httpClient.put<AdminTeacher>(`${teacherPath(code)}/role`, { role })
  return data
}

export async function unblockTeacherLogin(code: string): Promise<AdminTeacher> {
  const { data } = await httpClient.post<AdminTeacher>(`${teacherPath(code)}/login-unblock`)
  return data
}

export async function listAdminAuditLog(
  auditQuery: { action?: readonly AdminAction[]; page?: number; size?: number },
  signal?: AbortSignal,
): Promise<AdminAuditPage> {
  const { data } = await httpClient.get<AdminAuditPage>('/v1/admin/audit-log', { params: query({ ...auditQuery }), signal })
  return data
}

export async function listAdminFeedback(
  feedbackQuery: { status?: readonly FeedbackStatus[]; page?: number; size?: number },
  signal?: AbortSignal,
): Promise<AdminFeedbackPage> {
  const { data } = await httpClient.get<AdminFeedbackPage>('/v1/admin/feedback', { params: query({ ...feedbackQuery }), signal })
  return data
}

export async function updateFeedbackStatus(code: string, status: FeedbackStatus): Promise<AdminFeedback> {
  const { data } = await httpClient.patch<AdminFeedback>(`/v1/admin/feedback/${encodeURIComponent(code)}`, { status })
  return data
}

/** The screenshot of a feedback: it needs the admin's token, so it is fetched, not linked. */
export async function getFeedbackScreenshot(screenshotUrl: string, signal?: AbortSignal): Promise<Blob> {
  const { data } = await httpClient.get<Blob>(screenshotUrl.replace(/^\/api(?=\/)/, ''), { responseType: 'blob', signal })
  return data
}

/** The CSV file of the feedback (UTF-8 with BOM, for Excel). */
export async function exportFeedback(status: readonly FeedbackStatus[]): Promise<Blob> {
  const { data } = await httpClient.get<Blob>('/v1/admin/feedback/export', {
    params: query({ status }),
    responseType: 'blob',
    timeout: 60_000,
  })
  return data
}
