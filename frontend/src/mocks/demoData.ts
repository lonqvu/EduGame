/**
 * Demo data used until the backend exposes the game / class APIs.
 * Replace with calls in api/* once those endpoints exist.
 */
import type { GameSummary, GameTemplate, Question, Student, Team } from '@/types/game'

export const DEMO_TEACHER = { name: 'Cô Lan', greetingName: 'cô Lan' }

export const DEMO_CLASS_NAME = 'Lớp 3A'

export const GAME_TEMPLATES: GameTemplate[] = [
  {
    type: 'GRID_BOARD',
    category: 'QUESTION',
    name: 'Lật ô thi đua',
    description: 'Các đội chọn ô số, trả lời để ghi điểm. Có ô may mắn.',
    tags: ['Theo đội', '10–15 phút'],
    isNew: true,
  },
  {
    type: 'QUIZ',
    category: 'QUESTION',
    name: 'Trắc nghiệm',
    description: 'Câu hỏi nhiều lựa chọn, cả lớp cùng trả lời.',
    tags: ['Cá nhân hoặc đội'],
  },
  {
    type: 'MATCHING',
    category: 'PUZZLE',
    name: 'Nối cặp',
    description: 'Học sinh lên bảng nối từ với hình hoặc nghĩa.',
    tags: ['Lần lượt'],
  },
  {
    type: 'MEMORY',
    category: 'PUZZLE',
    name: 'Lật thẻ trí nhớ',
    description: 'Lật thẻ úp, tìm những cặp giống nhau.',
    tags: ['Theo đội'],
  },
  {
    type: 'SPIN_WHEEL',
    category: 'RANDOM_TOOL',
    name: 'Vòng quay gọi tên',
    description: 'Quay để chọn bạn trả lời, không ai bị gọi hai lần.',
    tags: ['Dùng danh sách lớp'],
  },
  {
    type: 'NAME_RACE',
    category: 'RANDOM_TOOL',
    name: 'Đua tên',
    description: 'Tên các bạn chạy đua, ai về đích trước được chọn.',
    tags: ['Dùng danh sách lớp'],
  },
]

export const DEMO_GAMES: GameSummary[] = [
  { id: 'g-addition', type: 'GRID_BOARD', title: 'Ôn phép cộng trong phạm vi 100', className: 'Lớp 3A', sizeLabel: '24 câu' },
  { id: 'g-animals', type: 'MEMORY', title: 'Con vật quanh em', className: 'Lớp 2B', sizeLabel: '8 cặp' },
  { id: 'g-wheel-3a', type: 'SPIN_WHEEL', title: 'Gọi tên lớp 3A', className: 'Lớp 3A', sizeLabel: '28 bạn' },
]

const ADDITION_TEXTS: [string, string][] = [
  ['25 + 13 = ?', '38'],
  ['40 + 27 = ?', '67'],
  ['Con gì kêu meo meo?', 'Con mèo'],
  ['52 + 36 = ?', '88'],
  ['18 + 21 = ?', '39'],
  ['60 + 30 = ?', '90'],
  ['45 + 14 = ?', '59'],
  ['33 + 33 = ?', '66'],
  ['12 + 47 = ?', '59'],
  ['70 + 19 = ?', '89'],
  ['24 + 24 = ?', '48'],
  ['56 + 31 = ?', '87'],
  ['15 + 62 = ?', '77'],
  ['81 + 11 = ?', '92'],
  ['37 + 40 = ?', '77'],
  ['44 + 25 = ?', '69'],
  ['29 + 30 = ?', '59'],
  ['63 + 26 = ?', '89'],
  ['50 + 50 = ?', '100'],
  ['16 + 72 = ?', '88'],
  ['38 + 41 = ?', '79'],
  ['27 + 52 = ?', '79'],
  ['11 + 88 = ?', '99'],
  ['43 + 35 = ?', '78'],
]

export const DEMO_QUESTIONS: Record<string, Question[]> = {
  'g-addition': ADDITION_TEXTS.map(([text, answer], i) => ({
    id: `q-${i + 1}`,
    text,
    answer,
    points: i % 3 === 0 ? 10 : 20,
  })),
  'g-animals': [],
  'g-wheel-3a': [],
}

export const DEMO_TEAMS: Team[] = [
  { id: 't-orange', name: 'Đội Cam', color: '#F28C28' },
  { id: 't-blue', name: 'Đội Biển', color: '#3563E9' },
  { id: 't-green', name: 'Đội Lá', color: '#2E9E6A' },
  { id: 't-purple', name: 'Đội Tím', color: '#8B5CF6' },
]

const STUDENT_NAMES: [string, number][] = [
  ['Minh Anh', 12], ['Bảo', 10], ['Hà', 9], ['Khôi', 8], ['Ngọc', 8], ['Tùng', 7], ['Linh', 7],
  ['Phúc', 6], ['An', 6], ['Chi', 5], ['Dũng', 5], ['Giang', 5], ['Huy', 4], ['Lan Anh', 4],
  ['Long', 4], ['Mai', 3], ['Nam', 3], ['Nhi', 3], ['Phong', 3], ['Quân', 2], ['Quỳnh', 2],
  ['Sơn', 2], ['Thảo', 2], ['Thư', 1], ['Trang', 1], ['Uyên', 1], ['Vy', 1], ['Yến', 0],
]

export const DEMO_STUDENTS: Student[] = STUDENT_NAMES.map(([name, stars], i) => ({
  id: `s-${i + 1}`,
  name,
  stars,
}))
