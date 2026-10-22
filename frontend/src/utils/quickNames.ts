import { MAX_NAME_LENGTH, MAX_STUDENTS } from '@/utils/classrooms'

/**
 * Names typed or pasted on the projector when the teacher has no class yet: one per line, as copied from Word,
 * Excel or Zalo. Numbering ("1.", "2)", "-") and blank lines are dropped; at most a class worth of names is kept.
 */
export function parseNames(text: string): string[] {
  return text
    .split(/\r?\n|\t|;/)
    .map((line) => line.replace(/^\s*(?:\d+\s*[.)\-:]|[-•*])\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((name) => name.slice(0, MAX_NAME_LENGTH))
    .slice(0, MAX_STUDENTS)
}

/** "Số 1" … "Số n": spin by roll number when the names are not at hand. */
export const numberNames = (count: number) =>
  Array.from({ length: Math.max(1, Math.min(MAX_STUDENTS, Math.round(count))) }, (_, i) => `Số ${i + 1}`)

const STORAGE_KEY = 'edugame.quickNames'

/** The names pasted last time on this device, to start from. */
export function rememberedNames(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberNames(names: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, names.join('\n'))
  } catch {
    // Private window / blocked storage: nothing to prefill next time.
  }
}
