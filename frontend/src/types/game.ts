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

export interface ChoiceOption {
  id: string
  text: string
}

/** QUIZ question: content `{text, image?, options}`, solution `{correct: [optionId]}`. */
export interface QuizQuestion {
  id: string
  /** TRUE_FALSE item: two fixed options "Đúng" / "Sai". Fixed when the question is created. */
  trueFalse: boolean
  text: string
  imageUrl?: string
  options: ChoiceOption[]
  /** null while the teacher has not picked the right option yet. */
  correctId: string | null
}

/** Two texts that belong together: a MATCHING pair (left ↔ right) or two MEMORY cards. */
export interface TextPair {
  id: string
  a: string
  b: string
}

/** MATCHING `PAIR_SET` or MEMORY `CARD_SET` item: one round of pairs. */
export interface PairSet {
  id: string
  pairs: TextPair[]
}

/** Item of any game, as the editor and the projector use it. Which one depends on the game type. */
export type GameItem = Question | QuizQuestion | PairSet

/** An item before it has a server id (distributes over unions, unlike Omit). */
export type Draft<T> = T extends unknown ? Omit<T, 'id'> : never

export type ItemDraft = Draft<GameItem>

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
