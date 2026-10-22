/** Mirrors `game_template.code` on the backend. */
export type GameType =
  | 'GRID_BOARD'
  | 'QUIZ'
  | 'GOLDEN_BELL'
  | 'BOAT_RACE'
  | 'MILLIONAIRE'
  | 'TUG_OF_WAR'
  | 'FLOWER_PICK'
  | 'WHACK_MOLE'
  | 'TRUE_FALSE'
  | 'LUCKY_STAR'
  | 'SECRET_PICTURE'
  | 'MOUNTAIN_CLIMB'
  | 'POINT_WHEEL'
  | 'TIC_TAC_TOE'
  | 'CONNECT_FOUR'
  | 'TREASURE_CHEST'
  | 'BUILD_TOWER'
  | 'BEE_FLOWER'
  | 'BINGO'
  | 'WORD_SCRAMBLE'
  | 'HANGMAN'
  | 'MATCHING'
  | 'MEMORY'
  | 'CROSSWORD'
  | 'ORDERING'
  | 'SORTING'
  | 'SPIN_WHEEL'
  | 'NAME_RACE'
  | 'TEAM_MAKER'
  | 'TIMER'
  | 'DICE'
  | 'COIN_FLIP'
  | 'RANDOM_NUMBER'
  | 'SCOREBOARD'
  | 'NOISE_METER'
  | 'TRAFFIC_LIGHT'
  | 'STOPWATCH'
  | 'CARD_DRAW'
  | 'SEATING'

export type GameCategory = 'QUESTION' | 'PUZZLE' | 'RANDOM_TOOL' | 'CLASS_TOOL'

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
  /** "Toán", "Tiếng Việt"... */
  subject?: string
  /** ISO time of the last edit. */
  updatedAt?: string
  /** Made by "Chơi ngay" from the built-in sample content. */
  sample?: boolean
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

/** CROSSWORD row: content `{clue}`, solution `{answer, keyIndex}`. */
export interface CrosswordRow {
  id: string
  clue: string
  answer: string
  /** Letter of the answer (spaces not counted) that sits in the keyword column; null until the teacher picks it. */
  keyIndex: number | null
}

/** A card of an ORDERING or SORTING set. */
export interface TextEntry {
  id: string
  text: string
}

/** ORDERING `ORDER_SET`: entries in the right order (the projector shuffles them). */
export interface OrderSet {
  id: string
  /** What to put in order, e.g. "Xếp các số từ bé đến lớn". */
  text: string
  entries: TextEntry[]
}

/** A SORTING card and the group it belongs in (null while the teacher has not said). */
export interface SortCard extends TextEntry {
  groupId: string | null
}

/** SORTING `SORT_SET`: 2-4 groups and the cards to drop into them. */
export interface SortSet {
  id: string
  text: string
  groups: TextEntry[]
  cards: SortCard[]
}

/** Item of any game, as the editor and the projector use it. Which one depends on the game type. */
export type GameItem = Question | QuizQuestion | PairSet | CrosswordRow | OrderSet | SortSet

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
  /** Stars this week. */
  stars: number
  totalStars: number
}
