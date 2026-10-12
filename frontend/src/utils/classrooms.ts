import type { ClassroomResponse, ClassroomStatus, StudentResponse } from '@/types/api'

/** Animals a class or a student can have (Classroom.AVATARS on the backend). */
export const CLASS_AVATARS = ['bear', 'rabbit', 'lion', 'cat', 'fox', 'panda', 'owl', 'frog'] as const
export type ClassAvatar = (typeof CLASS_AVATARS)[number]

export const AVATAR_NAMES: Record<ClassAvatar, string> = {
  bear: 'Gấu',
  rabbit: 'Thỏ',
  lion: 'Sư tử',
  cat: 'Mèo',
  fox: 'Cáo',
  panda: 'Gấu trúc',
  owl: 'Cú mèo',
  frog: 'Ếch',
}

/** Limits the backend enforces (ClassroomRules). */
export const MAX_CLASSROOMS = 30
export const MAX_STUDENTS = 60
export const MAX_NAME_LENGTH = 50

const isClassAvatar = (value: string | undefined): value is ClassAvatar =>
  CLASS_AVATARS.includes(value as ClassAvatar)

/** The class's animal; classes without one get an animal from their code, so it never changes. */
export function classAvatar(classroom: Pick<ClassroomResponse, 'code' | 'avatar'>): ClassAvatar {
  if (isClassAvatar(classroom.avatar)) return classroom.avatar
  let hash = 0
  for (const ch of classroom.code) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return CLASS_AVATARS[hash % CLASS_AVATARS.length]
}

export const avatarSrc = (avatar: ClassAvatar) => `/assets/classes/avatar-${avatar}.svg`

/** "Lớp 1A" ("Lớp" is not repeated when the teacher typed it). */
export const classTitle = (name: string) => (/^lớp\s/i.test(name) ? name : `Lớp ${name}`)

export const STATUS_LABELS: Record<ClassroomStatus, string> = { ACTIVE: 'Đang hoạt động', PAUSED: 'Tạm ngưng' }

export type ClassTab = 'ALL' | ClassroomStatus

/** Classes of a tab whose name or school contains the search (accents and case ignored). */
export function filterClassrooms(classrooms: ClassroomResponse[], tab: ClassTab, search: string): ClassroomResponse[] {
  const query = fold(search.trim())
  return classrooms.filter(
    (c) =>
      (tab === 'ALL' || c.status === tab) &&
      (!query || fold(classTitle(c.name)).includes(query) || fold(c.schoolName ?? '').includes(query)),
  )
}

export function countByTab(classrooms: ClassroomResponse[]): Record<ClassTab, number> {
  return {
    ALL: classrooms.length,
    ACTIVE: classrooms.filter((c) => c.status === 'ACTIVE').length,
    PAUSED: classrooms.filter((c) => c.status === 'PAUSED').length,
  }
}

/** Lowercase without Vietnamese accents: "Đồng" → "dong". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase()
}

/**
 * The school year being taught: "2026-2027" from August on, else the one that started the year before.
 * The teacher picks it, or the next one, when creating a class.
 */
export function schoolYearOf(date: Date): string {
  const start = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1
  return `${start}-${start + 1}`
}

export function schoolYearOptions(date: Date): string[] {
  const current = Number(schoolYearOf(date).slice(0, 4))
  return [current - 1, current, current + 1].map((y) => `${y}-${y + 1}`)
}

/**
 * Names pasted from a class list, one per line: numbering ("1.", "2)", "03 -"), tabs and extra spaces are dropped;
 * empty lines are skipped.
 */
export function parseStudentNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*\d+\s*[.)\-:]?\s+/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
}

/**
 * Vietnamese alphabetical order of a class list: by given name (the last word), then by the whole name, as roll
 * calls are kept in Vietnam.
 */
export function sortByGivenName<T extends Pick<StudentResponse, 'displayName'>>(students: T[]): T[] {
  const collator = new Intl.Collator('vi', { sensitivity: 'base' })
  const given = (name: string) => name.trim().split(/\s+/).pop() ?? ''
  return [...students].sort(
    (a, b) => collator.compare(given(a.displayName), given(b.displayName)) || collator.compare(a.displayName, b.displayName),
  )
}

/**
 * The class played with by default: the remembered one if it is still active, else the active class played most
 * recently, else the first active class.
 */
export function pickCurrentClass(classrooms: ClassroomResponse[], remembered: string | null): ClassroomResponse | undefined {
  const active = classrooms.filter((c) => c.status === 'ACTIVE')
  const kept = active.find((c) => c.code === remembered)
  if (kept) return kept
  const played = active.filter((c) => c.lastPlayedAt).sort((a, b) => (b.lastPlayedAt ?? '').localeCompare(a.lastPlayedAt ?? ''))
  return played[0] ?? active[0]
}
