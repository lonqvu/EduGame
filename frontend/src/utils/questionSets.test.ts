import { describe, expect, it } from 'vitest'
import type { QuestionSetSummaryResponse } from '@/types/api'
import {
  compactNumber,
  countBySubject,
  draftProblem,
  draftToRequest,
  emptyDraft,
  filterSets,
  hasFilters,
  kindOf,
  NO_FILTERS,
  parsePastedQuestions,
  subjectArt,
  totalsOf,
  usableCount,
} from '@/utils/questionSets'

const set = (code: string, overrides: Partial<QuestionSetSummaryResponse> = {}): QuestionSetSummaryResponse => ({
  code,
  title: code,
  subject: 'TOAN',
  grade: 2,
  questionCount: 0,
  multipleChoiceCount: 0,
  shortAnswerCount: 0,
  useCount: 0,
  playCount: 0,
  ownerName: 'Cô Lan',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
})

const CONG = set('cong', {
  title: 'Phép cộng trong phạm vi 100',
  description: 'Ôn tập cộng có nhớ',
  questionCount: 8,
  multipleChoiceCount: 7,
  shortAnswerCount: 1,
  useCount: 3,
  updatedAt: '2026-10-12T00:00:00Z',
})
const DOC = set('doc', {
  title: 'Luyện đọc hiểu',
  subject: 'TIENG_VIET',
  grade: 1,
  questionCount: 6,
  shortAnswerCount: 6,
  useCount: 3,
  playCount: 5,
  updatedAt: '2026-10-10T00:00:00Z',
})
const ANH = set('anh', {
  title: 'animals',
  subject: 'TIENG_ANH',
  grade: undefined,
  questionCount: 7,
  multipleChoiceCount: 7,
  updatedAt: '2026-10-08T00:00:00Z',
})
const TRONG = set('trong', { title: 'Bộ mới', subject: 'KHAC', updatedAt: '2026-09-20T00:00:00Z' })
const ALL = [CONG, DOC, ANH, TRONG]
const codes = (sets: QuestionSetSummaryResponse[]) => sets.map((s) => s.code)

describe('what a set holds', () => {
  it('is multiple choice, short answer, both, or nothing yet', () => {
    expect([CONG, DOC, ANH, TRONG].map(kindOf)).toEqual(['MIXED', 'SHORT_ANSWER', 'MULTIPLE_CHOICE', 'EMPTY'])
  })

  it('quiz games play the multiple choice questions, Lật ô plays them all', () => {
    expect(usableCount(CONG, 'QUIZ')).toBe(7)
    expect(usableCount(CONG, 'GRID_BOARD')).toBe(8)
    expect(usableCount(DOC, 'GOLDEN_BELL')).toBe(0)
    expect(usableCount(DOC, 'GRID_BOARD')).toBe(6)
  })

  it('has the picture of its subject', () => {
    expect(subjectArt('TU_NHIEN_XA_HOI')).toBe('/assets/question-sets/subject-tu-nhien-xa-hoi.svg')
  })
})

describe('finding sets', () => {
  it('without filters lists every set, last changed first', () => {
    expect(codes(filterSets(ALL, NO_FILTERS))).toEqual(['cong', 'doc', 'anh', 'trong'])
    expect(hasFilters(NO_FILTERS)).toBe(false)
  })

  it('searches title, description and subject, ignoring accents and case', () => {
    expect(codes(filterSets(ALL, { ...NO_FILTERS, search: 'PHEP CONG' }))).toEqual(['cong'])
    expect(codes(filterSets(ALL, { ...NO_FILTERS, search: ' co nho ' }))).toEqual(['cong'])
    expect(codes(filterSets(ALL, { ...NO_FILTERS, search: 'tiếng việt' }))).toEqual(['doc'])
    expect(codes(filterSets(ALL, { ...NO_FILTERS, search: 'không có' }))).toEqual([])
    expect(hasFilters({ ...NO_FILTERS, search: 'a' })).toBe(true)
    expect(hasFilters({ ...NO_FILTERS, search: '   ' })).toBe(false)
  })

  it('filters by subject, grade (a set for every grade fits any grade) and kind', () => {
    expect(codes(filterSets(ALL, { ...NO_FILTERS, subject: 'TIENG_VIET' }))).toEqual(['doc'])
    expect(codes(filterSets(ALL, { ...NO_FILTERS, grade: 2 }))).toEqual(['cong', 'anh', 'trong'])
    expect(codes(filterSets(ALL, { ...NO_FILTERS, grade: 5 }))).toEqual(['anh'])
    expect(codes(filterSets(ALL, { ...NO_FILTERS, kind: 'EMPTY' }))).toEqual(['trong'])
    expect(codes(filterSets(ALL, { ...NO_FILTERS, kind: 'MIXED', subject: 'TOAN', grade: 2 }))).toEqual(['cong'])
  })

  it('sorts by date, name (Vietnamese order), questions or uses; ties stay newest first', () => {
    expect(codes(filterSets(ALL, { ...NO_FILTERS, sort: 'OLDEST' }))).toEqual(['trong', 'anh', 'doc', 'cong'])
    expect(codes(filterSets(ALL, { ...NO_FILTERS, sort: 'TITLE' }))).toEqual(['anh', 'trong', 'doc', 'cong'])
    expect(codes(filterSets(ALL, { ...NO_FILTERS, sort: 'MOST_QUESTIONS' }))).toEqual(['cong', 'anh', 'doc', 'trong'])
    // Same uses: more plays first.
    expect(codes(filterSets(ALL, { ...NO_FILTERS, sort: 'MOST_USED' }))).toEqual(['doc', 'cong', 'anh', 'trong'])
  })

  it('does not reorder the list it was given', () => {
    const before = codes(ALL)
    filterSets(ALL, { ...NO_FILTERS, sort: 'TITLE' })
    expect(codes(ALL)).toEqual(before)
  })
})

describe('bank numbers', () => {
  it('counts sets by subject and adds up questions, uses and plays', () => {
    expect(countBySubject(ALL)).toEqual({ TOAN: 1, TIENG_VIET: 1, TIENG_ANH: 1, TU_NHIEN_XA_HOI: 0, KHOA_HOC: 0, KHAC: 1 })
    expect(totalsOf(ALL)).toEqual({ sets: 4, questions: 21, uses: 6, plays: 5 })
    expect(totalsOf([])).toEqual({ sets: 0, questions: 0, uses: 0, plays: 0 })
  })

  it('shortens big numbers the Vietnamese way', () => {
    expect(compactNumber(950)).toBe('950')
    expect(compactNumber(1200)).toMatch(/^1,2\sN$/)
  })
})

describe('writing a question', () => {
  it('a multiple choice question needs its text, two options and a filled right option', () => {
    expect(draftProblem(emptyDraft())).toBe('Cô nhập nội dung câu hỏi nhé.')
    const draft = { ...emptyDraft(), text: '2 + 2 = ?' }
    expect(draftProblem({ ...draft, options: ['4', '', '', ''] })).toBe('Cần ít nhất 2 đáp án.')
    expect(draftProblem({ ...draft, options: ['', '4', '5', ''], correctOption: 0 })).toMatch(/đáp án đúng/)
    expect(draftProblem({ ...draft, options: ['Bốn', ' bốn ', '5', ''] })).toBe('Có hai đáp án giống nhau.')
    expect(draftProblem({ ...draft, options: ['4', 'x'.repeat(201)] })).toMatch(/tối đa 200/)
    expect(draftProblem({ ...draft, options: ['4', '5', '', ''] })).toBeNull()
  })

  it('drops empty options and keeps the right one pointed at', () => {
    const draft = { ...emptyDraft(), text: ' 2 + 2 = ? ', options: ['', ' 3 ', '', '4'], correctOption: 3, explanation: '  ' }
    expect(draftToRequest(draft)).toEqual({ type: 'MULTIPLE_CHOICE', text: '2 + 2 = ?', options: ['3', '4'], correctOption: 1 })
  })

  it('a short answer question needs its answer; its options are not sent', () => {
    const draft = { ...emptyDraft('SHORT_ANSWER'), text: 'Thủ đô?' }
    expect(draftProblem(draft)).toBe('Cô nhập câu trả lời đúng nhé.')
    expect(draftToRequest({ ...draft, answer: ' Hà Nội ', explanation: ' Vì… ' })).toEqual({
      type: 'SHORT_ANSWER',
      text: 'Thủ đô?',
      answer: 'Hà Nội',
      explanation: 'Vì…',
    })
  })
})

describe('pasted questions', () => {
  it('reads multiple choice, short answer and true / false lines', () => {
    const lines = parsePastedQuestions(
      'Thủ đô của Việt Nam? = Hà Nội | Huế | Đà Nẵng\r\n\nCon gì kêu meo meo? = Con mèo\nMặt trời mọc ở đằng Đông = Đúng\nCá sống trên cây = sai',
    )
    expect(lines.map((l) => l.line)).toEqual([1, 3, 4, 5])
    expect(lines.map((l) => l.question)).toEqual([
      { type: 'MULTIPLE_CHOICE', text: 'Thủ đô của Việt Nam?', options: ['Hà Nội', 'Huế', 'Đà Nẵng'], correctOption: 0 },
      { type: 'SHORT_ANSWER', text: 'Con gì kêu meo meo?', answer: 'Con mèo' },
      { type: 'MULTIPLE_CHOICE', text: 'Mặt trời mọc ở đằng Đông', options: ['Đúng', 'Sai'], correctOption: 0 },
      { type: 'MULTIPLE_CHOICE', text: 'Cá sống trên cây', options: ['Đúng', 'Sai'], correctOption: 1 },
    ])
  })

  it('keeps "= ?" in the question and splits at the last "="', () => {
    expect(parsePastedQuestions('25 + 13 = ? = 38')[0].question).toEqual({ type: 'SHORT_ANSWER', text: '25 + 13 = ?', answer: '38' })
  })

  it('says why a line cannot become a question', () => {
    const lines = parsePastedQuestions('Không có đáp án\n25 + 13 = ?\n= Chỉ có đáp án\nTrùng = A | a\nNhiều = 1|2|3|4|5|6|7\nĐáp án trống = | |')
    expect(lines.map((l) => [l.line, l.problem])).toEqual([
      [1, 'Thiếu đáp án sau dấu “=”'],
      [2, 'Thiếu đáp án sau dấu “=”'],
      [3, 'Thiếu đáp án sau dấu “=”'],
      [4, 'Có hai đáp án giống nhau.'],
      [5, 'Nhiều hơn 6 đáp án'],
      [6, 'Thiếu đáp án sau dấu “=”'],
    ])
    expect(lines.every((l) => !l.question)).toBe(true)
  })
})
