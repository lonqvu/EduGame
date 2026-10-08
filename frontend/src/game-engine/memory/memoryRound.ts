import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'
import { shuffle } from '@/game-engine/shared/shuffle'
import type { PairSet } from '@/types/game'

export interface MemoryCard {
  /** Unique in the deck: `<pairId>:a` / `<pairId>:b`. */
  key: string
  pairId: string
  text: string
}

/** A set as played: both cards of every complete pair, shuffled face down. */
export interface PlayableMemorySet {
  id: string
  cards: MemoryCard[]
}

/** Sets with at least two complete pairs; incomplete pairs are left out. */
export function playableMemorySets(sets: PairSet[], random: () => number = Math.random): PlayableMemorySet[] {
  return sets.flatMap((set) => {
    const pairs = set.pairs.filter((p) => p.a.trim() && p.b.trim())
    if (pairs.length < 2) return []
    const cards = pairs.flatMap((p) => [
      { key: `${p.id}:a`, pairId: p.id, text: p.a.trim() },
      { key: `${p.id}:b`, pairId: p.id, text: p.b.trim() },
    ])
    return [{ id: set.id, cards: shuffle(cards, random) }]
  })
}

export interface MemoryRoundState {
  setIndex: number
  teams: TeamScore[]
  turn: number
  /** Cards turned this turn (0-2), by key. */
  faceUp: string[]
  /** Card key → team that found its pair. */
  matched: Record<string, string>
  finished: boolean
}

export type MemoryAction =
  | { type: 'flip'; card: MemoryCard; deck: MemoryCard[]; points: number }
  /** Turns a wrong pair back face down; the next team plays. */
  | { type: 'hide' }
  | { type: 'nextSet'; total: number }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number }

export const initialMemoryRound = (teamCount: number): MemoryRoundState => ({
  setIndex: 0,
  teams: freshTeams(teamCount),
  turn: 0,
  faceUp: [],
  matched: {},
  finished: false,
})

/** Two different cards are face up and are not a pair: waiting for `hide`. */
export const isShowingMiss = (state: MemoryRoundState) => state.faceUp.length === 2

export function memoryReducer(state: MemoryRoundState, action: MemoryAction): MemoryRoundState {
  switch (action.type) {
    case 'flip': {
      const { card } = action
      if (state.finished || isShowingMiss(state) || card.key in state.matched || state.faceUp.includes(card.key)) {
        return state
      }
      if (state.faceUp.length === 0) return { ...state, faceUp: [card.key] }

      const first = action.deck.find((c) => c.key === state.faceUp[0])
      if (first && first.pairId === card.pairId) {
        // Found a pair: the team scores and keeps the turn.
        const team = state.teams[state.turn]
        return {
          ...state,
          teams: award(state.teams, team.id, action.points),
          matched: { ...state.matched, [first.key]: team.id, [card.key]: team.id },
          faceUp: [],
        }
      }
      return { ...state, faceUp: [...state.faceUp, card.key] }
    }

    case 'hide':
      if (!isShowingMiss(state)) return state
      return {
        ...state,
        teams: miss(state.teams, state.teams[state.turn].id),
        faceUp: [],
        turn: (state.turn + 1) % state.teams.length,
      }

    case 'nextSet':
      if (state.setIndex + 1 >= action.total) return { ...state, finished: true }
      return { ...state, setIndex: state.setIndex + 1, faceUp: [], matched: {} }

    case 'finish':
      return { ...state, finished: true }

    case 'restart':
      return initialMemoryRound(action.teamCount)
  }
}
