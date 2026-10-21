import type { GameSummary, GameType } from '@/types/game'

/** "Hôm nay cô muốn làm gì?": what the teacher wants from the next minutes, and the games that do it. */
export interface Purpose {
  key: 'warmup' | 'review' | 'call' | 'groups' | 'timer'
  title: string
  icon: string
  /** The teacher's latest game of one of these types is played; question games only. */
  types: GameType[]
  /** Played when the teacher has none of `types` yet: the sample game, or the tool. */
  fallback: GameType
  /** What the fallback is, as the tile says it. */
  fallbackText: string
}

export const PURPOSES: Purpose[] = [
  {
    key: 'warmup',
    title: 'Khởi động lớp',
    icon: '🎉',
    types: ['GRID_BOARD', 'MEMORY', 'CROSSWORD'],
    fallback: 'GRID_BOARD',
    fallbackText: 'Lật ô thi đua, câu hỏi mẫu',
  },
  {
    key: 'review',
    title: 'Ôn bài',
    icon: '📚',
    types: ['QUIZ', 'GOLDEN_BELL', 'BOAT_RACE', 'MATCHING', 'ORDERING', 'SORTING'],
    fallback: 'QUIZ',
    fallbackText: 'Trắc nghiệm, câu hỏi mẫu',
  },
  { key: 'call', title: 'Gọi tên phát biểu', icon: '🎡', types: [], fallback: 'SPIN_WHEEL', fallbackText: 'Vòng quay may mắn' },
  { key: 'groups', title: 'Chia nhóm', icon: '👥', types: [], fallback: 'TEAM_MAKER', fallbackText: 'Chia nhóm ngẫu nhiên' },
  { key: 'timer', title: 'Hẹn giờ', icon: '⏱', types: [], fallback: 'TIMER', fallbackText: 'Đồng hồ đếm ngược' },
]

/**
 * The game a purpose plays: the teacher's most recently changed game of its types that has something to play
 * (games come newest first), or none, and then the purpose's fallback.
 */
export function purposeGame(purpose: Purpose, games: GameSummary[]): GameSummary | undefined {
  return games.find((g) => purpose.types.includes(g.type) && g.itemCount > 0)
}
