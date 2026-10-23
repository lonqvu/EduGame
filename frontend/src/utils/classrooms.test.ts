import { describe, expect, it } from 'vitest'
import type { ClassroomResponse } from '@/types/api'
import {
  CLASS_AVATARS,
  classAvatar,
  classTitle,
  countByTab,
  filterClassrooms,
  fold,
  parseStudentNames,
  pickCurrentClass,
  schoolYearOf,
  schoolYearOptions,
  sortByGivenName,
} from '@/utils/classrooms'

const classroom = (code: string, overrides: Partial<ClassroomResponse> = {}): ClassroomResponse => ({
  code,
  name: code.slice(2).toUpperCase(),
  grade: 1,
  status: 'ACTIVE',
  studentCount: 20,
  activityCount: 0,
  completedCount: 0,
  completionRate: 0,
  weeklyStars: 0,
  createdAt: '2026-09-01T00:00:00Z',
  ...overrides,
})

const ONE_A = classroom('c-1a', { schoolName: 'Tiểu học Kim Đồng', lastPlayedAt: '2026-10-01T08:00:00Z' })
const TWO_B = classroom('c-2b', { schoolName: 'Tiểu học Nguyễn Huệ', status: 'PAUSED', lastPlayedAt: '2026-10-12T08:00:00Z' })
const THREE_A = classroom('c-3a', { schoolName: 'Tiểu học Kim Đồng', lastPlayedAt: '2026-10-11T08:00:00Z' })
const ALL = [ONE_A, TWO_B, THREE_A]

describe('class list filters', () => {
  it('counts the classes of each tab', () => {
    expect(countByTab(ALL)).toEqual({ ALL: 3, ACTIVE: 2, PAUSED: 1 })
    expect(countByTab([])).toEqual({ ALL: 0, ACTIVE: 0, PAUSED: 0 })
  })

  it('filters by tab, then by name or school, ignoring accents and case', () => {
    expect(filterClassrooms(ALL, 'PAUSED', '')).toEqual([TWO_B])
    expect(filterClassrooms(ALL, 'ALL', ' lop 1a ')).toEqual([ONE_A])
    expect(filterClassrooms(ALL, 'ALL', 'KIM DONG')).toEqual([ONE_A, THREE_A])
    expect(filterClassrooms(ALL, 'ACTIVE', 'nguyễn huệ')).toEqual([])
    expect(filterClassrooms(ALL, 'ALL', '')).toEqual(ALL)
  })

  it('folds Vietnamese to plain lowercase letters', () => {
    expect(fold('Đường Lê Lợi')).toBe('duong le loi')
  })
})

describe('class names and avatars', () => {
  it('says "Lớp" once', () => {
    expect(classTitle('1A')).toBe('Lớp 1A')
    expect(classTitle('Lớp Sao Mai')).toBe('Lớp Sao Mai')
    expect(classTitle('lớp 2B')).toBe('lớp 2B')
    expect(classTitle('Lớp1')).toBe('Lớp Lớp1')
  })

  it('keeps a known avatar, else always gives a class the same animal', () => {
    expect(classAvatar({ code: 'c-1a', avatar: 'fox' })).toBe('fox')
    const animal = classAvatar({ code: 'c-x9', avatar: 'dragon' })
    expect(CLASS_AVATARS).toContain(animal)
    expect(classAvatar({ code: 'c-x9' })).toBe(animal)
  })
})

describe('school years', () => {
  it('starts in August', () => {
    expect(schoolYearOf(new Date(2026, 7, 1))).toBe('2026-2027')
    expect(schoolYearOf(new Date(2026, 6, 31))).toBe('2025-2026')
    expect(schoolYearOf(new Date(2027, 0, 5))).toBe('2026-2027')
  })

  it('offers the last, current and next school year', () => {
    expect(schoolYearOptions(new Date(2026, 9, 12))).toEqual(['2025-2026', '2026-2027', '2027-2028'])
  })
})

describe('pasted class lists', () => {
  it('keeps one clean name per line, without numbering or empty lines', () => {
    const pasted = '1. Nguyễn  Minh Anh\r\n2) Trần Gia Huy\n\n  03 - Lê Bảo Ngọc  \n4\tPhạm An\nHoàng Thu Hà\n   \n'
    expect(parseStudentNames(pasted)).toEqual(['Nguyễn Minh Anh', 'Trần Gia Huy', 'Lê Bảo Ngọc', 'Phạm An', 'Hoàng Thu Hà'])
  })

  it('does not cut a name that starts with a number word', () => {
    expect(parseStudentNames('Ba Nhất\n10A Minh')).toEqual(['Ba Nhất', '10A Minh'])
  })
})

describe('roll call order', () => {
  it('sorts by given name the Vietnamese way, then by full name', () => {
    const names = ['Trần Minh Đức', 'Lê Bảo An', 'Nguyễn Thu Hà', 'Phạm Bảo An', 'Võ Thị Ánh', 'Đỗ Gia Bảo']
    expect(sortByGivenName(names.map((displayName) => ({ displayName }))).map((s) => s.displayName)).toEqual([
      'Lê Bảo An',
      'Phạm Bảo An',
      'Võ Thị Ánh',
      'Đỗ Gia Bảo',
      'Trần Minh Đức',
      'Nguyễn Thu Hà',
    ])
  })
})

describe('current class', () => {
  it('is the remembered class while it is active', () => {
    expect(pickCurrentClass(ALL, 'c-1a')).toBe(ONE_A)
  })

  it('else the active class played most recently, else the first active one', () => {
    expect(pickCurrentClass(ALL, 'c-2b')).toBe(THREE_A)
    expect(pickCurrentClass(ALL, null)).toBe(THREE_A)
    const neverPlayed = [classroom('c-4a'), classroom('c-5a')]
    expect(pickCurrentClass(neverPlayed, 'c-gone')).toBe(neverPlayed[0])
  })

  it('is none when every class is paused', () => {
    expect(pickCurrentClass([TWO_B], 'c-2b')).toBeUndefined()
    expect(pickCurrentClass([], null)).toBeUndefined()
  })
})
