import { shuffle } from '@/game-engine/shared/shuffle'
import type { PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'

/** The prize ladder of the show, in points; a game with fewer questions plays its top rungs. */
export const LADDER = [100, 200, 300, 500, 1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 125_000, 250_000, 500_000, 1_000_000]

/** Most questions one game asks. */
export const MAX_LEVELS = LADDER.length

/** Prizes of a game of `levels` questions, from the first question to the last. */
export const ladderFor = (levels: number) => LADDER.slice(LADDER.length - Math.min(Math.max(levels, 0), MAX_LEVELS))

/**
 * Safe levels (1-based): reaching one keeps its prize even after a wrong answer. Questions 5 and 10 of the full
 * ladder, a third and two thirds of the way in shorter games.
 */
export function milestonesFor(levels: number): number[] {
  if (levels < 3) return []
  if (levels >= MAX_LEVELS) return [5, 10]
  return [...new Set([Math.round(levels / 3), Math.round((2 * levels) / 3)])].filter((l) => l > 0 && l < levels)
}

/** Prize kept when question `level` (1-based) is answered wrong: the last safe level passed, else nothing. */
export function prizeAfterWrong(level: number, levels: number): number {
  const prizes = ladderFor(levels)
  const safe = milestonesFor(levels).filter((m) => m < level)
  return safe.length ? prizes[safe[safe.length - 1] - 1] : 0
}

/** Prize taken when the player stops before answering question `level`: the last level answered. */
export const prizeWhenStopping = (level: number, levels: number) => (level > 1 ? ladderFor(levels)[level - 2] : 0)

/** "1.000.000" */
export const formatPrize = (points: number) => points.toLocaleString('vi-VN')

/** 50:50 — the options to hide: every wrong option but one (picked at random). Nothing for a two-option question. */
export function fiftyFifty(question: PlayableQuizQuestion, random: () => number = Math.random): string[] {
  const wrong = question.options.filter((o) => o.id !== question.correctId).map((o) => o.id)
  if (wrong.length < 2) return []
  const [kept] = shuffle(wrong, random)
  return wrong.filter((id) => id !== kept)
}

export type MillionaireEnd = { reason: 'won' | 'wrong' | 'stopped'; prize: number }

export interface MillionaireState {
  /** 0-based index of the question being asked. */
  level: number
  /** Option the player picked, not locked yet. */
  selected: string | null
  /** "Câu trả lời cuối cùng": the answer is locked and shown right or wrong. */
  locked: boolean
  /** Options removed by 50:50 on this question. */
  hidden: string[]
  /** Lifelines used. */
  used: { fifty: boolean; poll: boolean; friend: boolean }
  /** Hands raised for each option during "Hỏi ý kiến cả lớp" on this question, or null. */
  poll: Record<string, number> | null
  end: MillionaireEnd | null
}

export type MillionaireAction =
  | { type: 'select'; optionId: string }
  | { type: 'lock' }
  | { type: 'next'; question: PlayableQuizQuestion; levels: number }
  | { type: 'fifty'; hide: string[] }
  | { type: 'poll' }
  | { type: 'vote'; optionId: string }
  | { type: 'friend' }
  | { type: 'stop'; levels: number }
  | { type: 'restart' }

export const initialMillionaire = (): MillionaireState => ({
  level: 0,
  selected: null,
  locked: false,
  hidden: [],
  used: { fifty: false, poll: false, friend: false },
  poll: null,
  end: null,
})

export function millionaireReducer(state: MillionaireState, action: MillionaireAction): MillionaireState {
  if (state.end && action.type !== 'restart') return state
  switch (action.type) {
    case 'select':
      if (state.locked || state.hidden.includes(action.optionId)) return state
      return { ...state, selected: action.optionId }
    case 'lock':
      return state.selected && !state.locked ? { ...state, locked: true } : state
    case 'next': {
      // After the locked answer is shown: the next rung, the top prize, or the end of the climb.
      if (!state.locked || !state.selected) return state
      const prizes = ladderFor(action.levels)
      if (state.selected !== action.question.correctId) {
        return { ...state, end: { reason: 'wrong', prize: prizeAfterWrong(state.level + 1, action.levels) } }
      }
      if (state.level + 1 >= action.levels) return { ...state, end: { reason: 'won', prize: prizes[action.levels - 1] } }
      return { ...state, level: state.level + 1, selected: null, locked: false, hidden: [], poll: null }
    }
    case 'fifty':
      if (state.used.fifty || state.locked || action.hide.length === 0) return state
      return {
        ...state,
        used: { ...state.used, fifty: true },
        hidden: action.hide,
        selected: state.selected && action.hide.includes(state.selected) ? null : state.selected,
      }
    case 'poll':
      if (state.used.poll || state.locked) return state
      return { ...state, used: { ...state.used, poll: true }, poll: {} }
    case 'vote':
      if (!state.poll || state.locked || state.hidden.includes(action.optionId)) return state
      return { ...state, poll: { ...state.poll, [action.optionId]: (state.poll[action.optionId] ?? 0) + 1 } }
    case 'friend':
      if (state.used.friend || state.locked) return state
      return { ...state, used: { ...state.used, friend: true } }
    case 'stop':
      if (state.locked) return state
      return { ...state, end: { reason: 'stopped', prize: prizeWhenStopping(state.level + 1, action.levels) } }
    case 'restart':
      return initialMillionaire()
  }
}
