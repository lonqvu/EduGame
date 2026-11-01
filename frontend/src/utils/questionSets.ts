import type {
  QuestionGameCode,
  QuestionRequest,
  QuestionSetSummaryResponse,
  QuestionType,
  SubjectCode,
} from '@/types/api'
import { fold } from '@/utils/classrooms'

/** Limits the backend enforces (QuestionSetRules). */
export const MAX_SETS = 200
export const MAX_QUESTIONS = 200
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 6
export const MAX_TITLE = 120
export const MAX_DESCRIPTION = 500
export const MAX_TEXT = 500
export const MAX_OPTION_TEXT = 200
export const MAX_ANSWER = 200

export interface SubjectInfo {
  code: SubjectCode
  label: string
  /** Pastel background of its chip and icon */
  tint: string
  /** Text / icon colour on the tint */
  ink: string
}

/** Subjects in the order of the tabs. */
export const SUBJECTS: SubjectInfo[] = [
  { code: 'TOAN', label: 'Toán', tint: '#E3F6EC', ink: '#17804F' },
  { code: 'TIENG_VIET', label: 'Tiếng Việt', tint: '#FFF0D9', ink: '#B45F0A' },
  { code: 'TIENG_ANH', label: 'Tiếng Anh', tint: '#EEE7FD', ink: '#6236C9' },
  { code: 'TU_NHIEN_XA_HOI', label: 'Tự nhiên và Xã hội', tint: '#E2F6E8', ink: '#257A4B' },
  { code: 'KHOA_HOC', label: 'Khoa học', tint: '#E1F1FB', ink: '#16699B' },
  { code: 'KHAC', label: 'Khác', tint: '#FFF6D6', ink: '#8A6400' },
]

export const subjectInfo = (code: SubjectCode): SubjectInfo => SUBJECTS.find((s) => s.code === code) ?? SUBJECTS[5]

/** The set's picture: its subject's art (scripts/make_question_art.py). */
export const subjectArt = (code: SubjectCode) => `/assets/question-sets/subject-${code.toLowerCase().replace(/_/g, '-')}.svg`

export const gradeText = (grade?: number) => (grade ? `Lớp ${grade}` : 'Mọi khối')

/** What a set holds: only multiple choice, only short answers, both, or nothing yet. */
export type QuestionKind = QuestionType | 'MIXED' | 'EMPTY'

export const KIND_LABELS: Record<QuestionKind, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm',
  SHORT_ANSWER: 'Tự luận',
  MIXED: 'Trắc nghiệm + tự luận',
  EMPTY: 'Chưa có câu hỏi',
}

export function kindOf(set: Pick<QuestionSetSummaryResponse, 'multipleChoiceCount' | 'shortAnswerCount'>): QuestionKind {
  if (set.multipleChoiceCount && set.shortAnswerCount) return 'MIXED'
  if (set.multipleChoiceCount) return 'MULTIPLE_CHOICE'
  if (set.shortAnswerCount) return 'SHORT_ANSWER'
  return 'EMPTY'
}

// --- Finding sets ---------------------------------------------------------------------------------------------

export type SetSort = 'NEWEST' | 'OLDEST' | 'TITLE' | 'MOST_QUESTIONS' | 'MOST_USED'

export const SORT_LABELS: Record<SetSort, string> = {
  NEWEST: 'Mới cập nhật',
  OLDEST: 'Cũ nhất',
  TITLE: 'Tên A → Z',
  MOST_QUESTIONS: 'Nhiều câu hỏi nhất',
  MOST_USED: 'Dùng nhiều nhất',
}

export interface SetFilters {
  search: string
  subject: SubjectCode | 'ALL'
  /** A grade; sets without a grade fit every grade. */
  grade: number | 'ALL'
  kind: QuestionKind | 'ALL'
  sort: SetSort
}

export const NO_FILTERS: SetFilters = { search: '', subject: 'ALL', grade: 'ALL', kind: 'ALL', sort: 'NEWEST' }

export const hasFilters = (f: SetFilters) => f.search.trim() !== '' || f.subject !== 'ALL' || f.grade !== 'ALL' || f.kind !== 'ALL'

/**
 * The sets matching the filters, sorted. The search looks in the title, description and subject, ignoring accents
 * and case. Ties keep the last changed set first.
 */
export function filterSets(sets: QuestionSetSummaryResponse[], f: SetFilters): QuestionSetSummaryResponse[] {
  const query = fold(f.search.trim())
  const collator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true })
  const byNewest = (a: QuestionSetSummaryResponse, b: QuestionSetSummaryResponse) => b.updatedAt.localeCompare(a.updatedAt)
  const sorters: Record<SetSort, (a: QuestionSetSummaryResponse, b: QuestionSetSummaryResponse) => number> = {
    NEWEST: byNewest,
    OLDEST: (a, b) => -byNewest(a, b),
    TITLE: (a, b) => collator.compare(a.title, b.title) || byNewest(a, b),
    MOST_QUESTIONS: (a, b) => b.questionCount - a.questionCount || byNewest(a, b),
    MOST_USED: (a, b) => b.useCount - a.useCount || b.playCount - a.playCount || byNewest(a, b),
  }
  return sets
    .filter(
      (s) =>
        (f.subject === 'ALL' || s.subject === f.subject) &&
        (f.grade === 'ALL' || s.grade === undefined || s.grade === null || s.grade === f.grade) &&
        (f.kind === 'ALL' || kindOf(s) === f.kind) &&
        (!query || fold(`${s.title} ${s.description ?? ''} ${subjectInfo(s.subject).label}`).includes(query)),
    )
    .sort(sorters[f.sort])
}

/** Sets of each subject. */
export function countBySubject(sets: QuestionSetSummaryResponse[]): Record<SubjectCode, number> {
  const counts = Object.fromEntries(SUBJECTS.map((s) => [s.code, 0])) as Record<SubjectCode, number>
  for (const set of sets) counts[set.subject]++
  return counts
}

export interface BankTotals {
  sets: number
  questions: number
  uses: number
  plays: number
}

export function totalsOf(sets: QuestionSetSummaryResponse[]): BankTotals {
  return sets.reduce(
    (t, s) => ({ sets: t.sets + 1, questions: t.questions + s.questionCount, uses: t.uses + s.useCount, plays: t.plays + s.playCount }),
    { sets: 0, questions: 0, uses: 0, plays: 0 },
  )
}

/** 950 → "950", 1 200 → "1,2 N", 8 400 → "8,4 N" (Vietnamese short form). */
export const compactNumber = (n: number) =>
  new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

/** "12/10/2026" */
export const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

// --- Using a set in a game ------------------------------------------------------------------------------------

export interface UseGame {
  code: QuestionGameCode
  name: string
  /** What the game does with the questions */
  description: string
  group: UseGameGroup
}

/** How the class plays a game: the filter chips of the "Chơi" dialog. */
export type UseGameGroup = 'TEAM' | 'CLASS' | 'WORD'

export const USE_GAME_GROUPS: { code: UseGameGroup; label: string; icon: string }[] = [
  { code: 'TEAM', label: 'Thi đua đội', icon: '🏁' },
  { code: 'CLASS', label: 'Cả lớp', icon: '🙋' },
  { code: 'WORD', label: 'Trò chữ', icon: '🔤' },
]

/** Navigation state that opens the "new set" form of /question-sets on arrival. */
export const OPEN_CREATE_SET = { createSet: true }

export const USE_GAMES: UseGame[] = [
  { code: 'QUIZ', name: 'Trắc nghiệm', description: 'Các đội chọn đáp án đúng, cướp lượt khi đội trước sai.', group: 'TEAM' },
  { code: 'GOLDEN_BELL', name: 'Rung chuông vàng', description: 'Cả lớp cùng trả lời, sai thì ra ngoài, ai trụ lại cuối cùng?', group: 'CLASS' },
  { code: 'BOAT_RACE', name: 'Đua thuyền', description: 'Trả lời đúng để thuyền của đội tiến về đích.', group: 'TEAM' },
  { code: 'GRID_BOARD', name: 'Lật ô thi đua', description: 'Các đội chọn ô số và trả lời để ghi điểm. Dùng được mọi câu.', group: 'TEAM' },
  { code: 'MILLIONAIRE', name: 'Ai là triệu phú', description: 'Một bạn leo bậc thưởng, có 3 quyền trợ giúp.', group: 'CLASS' },
  { code: 'TUG_OF_WAR', name: 'Kéo co', description: 'Hai đội thi trả lời, mỗi câu đúng kéo dây về phía mình.', group: 'TEAM' },
  { code: 'FLOWER_PICK', name: 'Hái hoa dân chủ', description: 'Mỗi bông hoa trên cây là một câu hỏi.', group: 'CLASS' },
  { code: 'WHACK_MOLE', name: 'Đập chuột', description: 'Đập đúng chú chuột mang đáp án đúng.', group: 'CLASS' },
  { code: 'TRUE_FALSE', name: 'Đúng hay sai', description: 'Mọi đội cùng chọn Đúng hoặc Sai cho đáp án hiện ra.', group: 'CLASS' },
  { code: 'LUCKY_STAR', name: 'Ngôi sao may mắn', description: 'Chọn ngôi sao: câu hỏi hoặc điểm thưởng may mắn.', group: 'TEAM' },
  { code: 'SECRET_PICTURE', name: 'Ô cửa bí mật', description: 'Trả lời đúng để mở ô cửa và đoán bức tranh.', group: 'CLASS' },
  { code: 'MOUNTAIN_CLIMB', name: 'Leo núi', description: 'Trả lời đúng để người leo núi của đội lên đỉnh.', group: 'TEAM' },
  { code: 'POINT_WHEEL', name: 'Vòng quay điểm thưởng', description: 'Quay để biết câu hỏi đáng bao nhiêu điểm.', group: 'TEAM' },
  { code: 'TIC_TAC_TOE', name: 'Cờ ca-rô hỏi đáp', description: 'Trả lời đúng để đánh dấu ô, ba ô thẳng hàng là thắng.', group: 'TEAM' },
  { code: 'CONNECT_FOUR', name: 'Bốn ô liên tiếp', description: 'Trả lời đúng để thả quân, bốn quân liền nhau là thắng.', group: 'TEAM' },
  { code: 'TREASURE_CHEST', name: 'Rương vàng', description: 'Trả lời đúng để mở rương báu đầy bất ngờ.', group: 'TEAM' },
  { code: 'BUILD_TOWER', name: 'Xây tháp', description: 'Mỗi câu đúng thêm một khối, tháp nào cao nhất?', group: 'TEAM' },
  { code: 'BEE_FLOWER', name: 'Ong tìm hoa', description: 'Chỉ đường cho chú ong đến bông hoa có đáp án đúng.', group: 'CLASS' },
  { code: 'BINGO', name: 'Bingo', description: 'Đánh dấu đáp án trên thẻ, đủ một hàng là Bingo!', group: 'CLASS' },
  { code: 'WORD_SCRAMBLE', name: 'Vua Tiếng Việt', description: 'Xếp lại các chữ cái bị xáo trộn thành đáp án. Dùng được mọi câu.', group: 'WORD' },
  { code: 'HANGMAN', name: 'Đoán chữ', description: 'Đoán từng chữ cái để mở ô chữ. Dùng được mọi câu.', group: 'WORD' },
]

/** Questions of the set the game can play: quiz games play multiple choice, Lật ô plays every question. */
export const usableCount = (set: Pick<QuestionSetSummaryResponse, 'questionCount' | 'multipleChoiceCount'>, game: QuestionGameCode) =>
  game === 'GRID_BOARD' || game === 'WORD_SCRAMBLE' || game === 'HANGMAN' ? set.questionCount : set.multipleChoiceCount

// --- Questions ------------------------------------------------------------------------------------------------

/** A question being written in the form (options are kept while switching type). */
export interface QuestionDraft {
  type: QuestionType
  text: string
  options: string[]
  correctOption: number
  answer: string
  explanation: string
}

export const emptyDraft = (type: QuestionType = 'MULTIPLE_CHOICE'): QuestionDraft => ({
  type,
  text: '',
  options: ['', '', '', ''],
  correctOption: 0,
  answer: '',
  explanation: '',
})

/** Why the question cannot be saved yet, in Vietnamese; null when it can. Mirrors the backend's checks. */
export function draftProblem(d: QuestionDraft): string | null {
  if (!d.text.trim()) return 'Cô nhập nội dung câu hỏi nhé.'
  if (d.text.trim().length > MAX_TEXT) return `Câu hỏi dài tối đa ${MAX_TEXT} ký tự.`
  if (d.type === 'SHORT_ANSWER') {
    if (!d.answer.trim()) return 'Cô nhập câu trả lời đúng nhé.'
    if (d.answer.trim().length > MAX_ANSWER) return `Câu trả lời dài tối đa ${MAX_ANSWER} ký tự.`
    return null
  }
  const options = d.options.map((o) => o.trim())
  const filled = options.filter(Boolean)
  if (filled.length < MIN_OPTIONS) return `Cần ít nhất ${MIN_OPTIONS} đáp án.`
  if (!options[d.correctOption]) return 'Cô chọn đáp án đúng (đáp án đó không được để trống).'
  if (filled.some((o) => o.length > MAX_OPTION_TEXT)) return `Mỗi đáp án dài tối đa ${MAX_OPTION_TEXT} ký tự.`
  const folded = filled.map((o) => fold(o).replace(/\s+/g, ' '))
  if (new Set(folded).size !== folded.length) return 'Có hai đáp án giống nhau.'
  return null
}

/** The request for a valid draft: empty options are dropped and the correct index follows. */
export function draftToRequest(d: QuestionDraft): QuestionRequest {
  const explanation = d.explanation.trim() || undefined
  if (d.type === 'SHORT_ANSWER') return { type: d.type, text: d.text.trim(), answer: d.answer.trim(), explanation }
  const kept = d.options.map((text, index) => ({ text: text.trim(), index })).filter((o) => o.text)
  return {
    type: d.type,
    text: d.text.trim(),
    options: kept.map((o) => o.text),
    correctOption: kept.findIndex((o) => o.index === d.correctOption),
    explanation,
  }
}

export function draftOf(q: { type: QuestionType; text: string; options?: string[]; correctOption?: number; answer?: string; explanation?: string }): QuestionDraft {
  return {
    type: q.type,
    text: q.text,
    options: q.options?.length ? [...q.options] : ['', '', '', ''],
    correctOption: q.correctOption ?? 0,
    answer: q.answer ?? '',
    explanation: q.explanation ?? '',
  }
}

export interface PastedLine {
  /** 1-based line of the pasted text */
  line: number
  question?: QuestionRequest
  problem?: string
}

const TRUE_FALSE: Record<string, number> = { đúng: 0, sai: 1 }

/**
 * Questions pasted one per line, as in the quiz editor:
 *   "Thủ đô của Việt Nam? = Hà Nội | Huế | Đà Nẵng"   multiple choice, the first answer is the right one
 *   "Con gì kêu meo meo? = Con mèo"                  short answer
 *   "Mặt trời mọc ở đằng Đông = Đúng"                true / false (options Đúng, Sai)
 * The question ends at the last "=" ("25 + 13 = ? = 38" asks "25 + 13 = ?"). Empty lines are skipped; a line that
 * cannot become a question says why.
 */
export function parsePastedQuestions(text: string): PastedLine[] {
  const result: PastedLine[] = []
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const at = line.lastIndexOf('=')
    const question = at < 0 ? line : line.slice(0, at).trim()
    const rest = at < 0 ? '' : line.slice(at + 1).trim()
    const answers = rest
      .split('|')
      .map((a) => a.trim())
      .filter(Boolean)
    if (!question || !answers.length || rest === '?') {
      result.push({ line: i + 1, problem: 'Thiếu đáp án sau dấu “=”' })
      return
    }
    const single = answers.length === 1 ? TRUE_FALSE[answers[0].toLowerCase()] : undefined
    const draft: QuestionDraft =
      single !== undefined
        ? { ...emptyDraft(), text: question, options: ['Đúng', 'Sai'], correctOption: single }
        : answers.length === 1
          ? { ...emptyDraft('SHORT_ANSWER'), text: question, answer: answers[0] }
          : { ...emptyDraft(), text: question, options: answers, correctOption: 0 }
    if (answers.length > MAX_OPTIONS) {
      result.push({ line: i + 1, problem: `Nhiều hơn ${MAX_OPTIONS} đáp án` })
      return
    }
    const problem = draftProblem(draft)
    result.push(problem ? { line: i + 1, problem } : { line: i + 1, question: draftToRequest(draft) })
  })
  return result
}

/** Games a question set can be used in (the others are written in their own editor). */
export const isSetGame = (type: string): type is QuestionGameCode => USE_GAMES.some((g) => g.code === type)

export interface SetChoice {
  set: QuestionSetSummaryResponse
  /** Questions of the set the game plays */
  usable: number
}

/**
 * The sets to pick from for a game: the ones it can play first (newest first), then the others, which are shown but
 * cannot be picked. The search looks in the title, description and subject; `kind` keeps one kind of set.
 */
export function setChoices(
  sets: QuestionSetSummaryResponse[],
  game: QuestionGameCode,
  search: string,
  kind: QuestionKind | 'ALL',
): SetChoice[] {
  return filterSets(sets, { ...NO_FILTERS, search, kind })
    .map((set) => ({ set, usable: usableCount(set, game) }))
    .sort((a, b) => Number(b.usable > 0) - Number(a.usable > 0))
}
