import { shuffleChanged } from '@/game-engine/shared/shuffle'
import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'
import type { OrderSet, TextEntry } from '@/types/game'

/** A set as played: its filled-in cards in the right order, and the shuffled order they are dealt in. */
export interface PlayableOrderSet {
  id: string
  text: string
  /** Right order. */
  entries: TextEntry[]
  /** Card ids in the order they are dealt (never already right). */
  dealt: string[]
}

/** Sets with at least two filled-in cards; blank cards are left out. */
export function playableOrderSets(sets: OrderSet[], random: () => number = Math.random): PlayableOrderSet[] {
  return sets.flatMap((set) => {
    const entries = set.entries.filter((e) => e.text.trim()).map((e) => ({ ...e, text: e.text.trim() }))
    if (entries.length < 2) return []
    return [{ id: set.id, text: set.text.trim(), entries, dealt: shuffleChanged(entries.map((e) => e.id), random) }]
  })
}

export interface OrderingState {
  setIndex: number
  teams: TeamScore[]
  turn: number
  /** Card id in each slot (null = empty). */
  slots: (string | null)[]
  /** Slots already checked right (they stay). */
  locked: boolean[]
  /** Slots that were wrong at the last check, shown briefly. */
  lastWrong: number[]
  /** Teams that checked this set. */
  tries: number
  /** Team that completed the set, or the right order is shown because nobody did. */
  solvedBy: string | null
  revealed: boolean
  finished: boolean
}

export type OrderingAction =
  /** Puts a dealt card in the first empty slot. */
  | { type: 'place'; entryId: string }
  /** Takes a card back out of its slot. */
  | { type: 'unplace'; slot: number }
  | { type: 'check'; order: string[]; points: number; allowSteal: boolean }
  | { type: 'clearWrong' }
  | { type: 'reveal'; order: string[] }
  | { type: 'nextSet'; total: number; size: number }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number; size: number }

const emptySet = (size: number) => ({
  slots: Array<string | null>(size).fill(null),
  locked: Array<boolean>(size).fill(false),
  lastWrong: [],
  tries: 0,
  solvedBy: null,
  revealed: false,
})

export const initialOrdering = ({ teamCount, size }: { teamCount: number; size: number }): OrderingState => ({
  setIndex: 0,
  teams: freshTeams(teamCount),
  turn: 0,
  finished: false,
  ...emptySet(size),
})

/** The set is over: someone completed it or the answer is shown. */
export const isSetDone = (state: OrderingState) => state.solvedBy !== null || state.revealed

export function orderingReducer(state: OrderingState, action: OrderingAction): OrderingState {
  if (state.finished && action.type !== 'restart') return state
  switch (action.type) {
    case 'place': {
      if (isSetDone(state) || state.slots.includes(action.entryId)) return state
      const empty = state.slots.indexOf(null)
      if (empty < 0) return state
      const slots = [...state.slots]
      slots[empty] = action.entryId
      return { ...state, slots, lastWrong: [] }
    }

    case 'unplace': {
      if (isSetDone(state) || state.locked[action.slot] || state.slots[action.slot] === null) return state
      const slots = [...state.slots]
      slots[action.slot] = null
      return { ...state, slots }
    }

    case 'check': {
      if (isSetDone(state) || state.slots.includes(null)) return state
      const team = state.teams[state.turn]
      const turn = (state.turn + 1) % state.teams.length
      const right = state.slots.map((id, i) => id === action.order[i])
      if (right.every(Boolean)) {
        return {
          ...state,
          teams: award(state.teams, team.id, action.points),
          locked: right,
          solvedBy: team.id,
          tries: state.tries + 1,
          turn,
        }
      }
      const tries = state.tries + 1
      // Right cards stay in place; wrong ones go back to the table for the next team.
      const lastWrong = right.flatMap((ok, i) => (ok ? [] : [i]))
      const outOfTries = !action.allowSteal || tries >= state.teams.length
      return {
        ...state,
        teams: miss(state.teams, team.id),
        slots: outOfTries ? action.order : state.slots.map((id, i) => (right[i] ? id : null)),
        locked: outOfTries ? right.map(() => true) : right,
        lastWrong,
        tries,
        revealed: outOfTries,
        turn,
      }
    }

    case 'clearWrong':
      return state.lastWrong.length ? { ...state, lastWrong: [] } : state

    case 'reveal':
      if (isSetDone(state)) return state
      return { ...state, slots: action.order, locked: action.order.map(() => true), revealed: true, lastWrong: [] }

    case 'nextSet':
      if (state.setIndex + 1 >= action.total) return { ...state, finished: true }
      return { ...state, setIndex: state.setIndex + 1, ...emptySet(action.size) }

    case 'finish':
      return { ...state, finished: true }

    case 'restart':
      return initialOrdering({ teamCount: action.teamCount, size: action.size })
  }
}
