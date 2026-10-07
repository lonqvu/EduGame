/** Mirrors `game_template.code` on the backend. */
export type GameType = 'GRID_BOARD' | 'QUIZ' | 'MATCHING' | 'MEMORY' | 'SPIN_WHEEL' | 'NAME_RACE'

export type GameCategory = 'QUESTION' | 'PUZZLE' | 'RANDOM_TOOL'

export interface GameTemplate {
  type: GameType
  category: GameCategory
  name: string
  description: string
  tags: string[]
  isNew?: boolean
}

export interface GameSummary {
  id: string
  type: GameType
  title: string
  className: string
  /** e.g. "24 câu", "8 cặp", "28 bạn" */
  sizeLabel: string
}

export interface Question {
  id: string
  text: string
  answer: string
  imageUrl?: string
  points: number
}

export interface Team {
  id: string
  name: string
  color: string
}

export interface Student {
  id: string
  name: string
  stars: number
}
