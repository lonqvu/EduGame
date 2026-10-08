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
  /** `game.code` on the backend, e.g. "g-addition". */
  id: string
  type: GameType
  title: string
  /** Grade the game is for (1-5), shown as "Lớp 3". */
  grade?: number
  /** Items of the version being edited (questions, card sets...). */
  itemCount: number
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
