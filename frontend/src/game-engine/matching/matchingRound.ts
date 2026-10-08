import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'
import { shuffleChanged } from '@/game-engine/shared/shuffle'
import type { PairSet, TextPair } from '@/types/game'

/** A set as played: complete pairs only, and the right column in shuffled order. */
export interface PlayableMatchingSet {
  id: string
  pairs: TextPair[]
  /** Pair ids in the order of the right column. */
  rightOrder: string[]
}

/** Sets with at least two complete pairs (both sides filled in); incomplete pairs are left out. */
export function playableMatchingSets(sets: PairSet[], random: () => number = Math.random): PlayableMatchingSet[] {
  return sets.flatMap((set) => {
    const pairs = set.pairs
      .filter((p) => p.a.trim() && p.b.trim())
      .map((p) => ({ ...p, a: p.a.trim(), b: p.b.trim() }))
    if (pairs.length < 2) return []
    return [{ id: set.id, pairs, rightOrder: shuffleChanged(pairs.map((p) => p.id), random) }]
  })
}

const norm = (text: string) => text.trim().toLocaleLowerCase('vi')

/**
 * Does the left entry of pair `leftId` go with the right entry of pair `rightId`? Its own partner does, and so
 * does any right entry with the same text (two pairs may share an answer, e.g. "2 + 2" and "3 + 1" both "4").
 */
export function isMatch(set: PlayableMatchingSet, leftId: string, rightId: string): boolean {
  if (leftId === rightId) return true
  const left = set.pairs.find((p) => p.id === leftId)
  const right = set.pairs.find((p) => p.id === rightId)
  return !!left && !!right && norm(left.b) === norm(right.b)
}

export interface MatchingRoundState {
  setIndex: number
  teams: TeamScore[]
  turn: number
  /** Matched left pair id → the right pair id it was joined to, and by which team. */
  matched: Record<string, { rightId: string; teamId: string }>
  /** Last wrong attempt, shown briefly on the projector. */
  lastWrong: { leftId: string; rightId: string } | null
  finished: boolean
}

export type MatchingAction =
  | { type: 'attempt'; leftId: string; rightId: string; correct: boolean; points: number }
  | { type: 'clearWrong' }
  | { type: 'nextSet'; total: number }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number }

export const initialMatchingRound = (teamCount: number): MatchingRoundState => ({
  setIndex: 0,
  teams: freshTeams(teamCount),
  turn: 0,
  matched: {},
  lastWrong: null,
  finished: false,
})

export const isRightUsed = (state: MatchingRoundState, rightId: string) =>
  Object.values(state.matched).some((m) => m.rightId === rightId)

export function matchingReducer(state: MatchingRoundState, action: MatchingAction): MatchingRoundState {
  switch (action.type) {
    case 'attempt': {
      if (state.finished || action.leftId in state.matched || isRightUsed(state, action.rightId)) return state
      const team = state.teams[state.turn]
      // Every attempt passes the turn on, right or wrong (ROUND_ROBIN).
      const turn = (state.turn + 1) % state.teams.length
      if (action.correct) {
        return {
          ...state,
          teams: award(state.teams, team.id, action.points),
          matched: { ...state.matched, [action.leftId]: { rightId: action.rightId, teamId: team.id } },
          lastWrong: null,
          turn,
        }
      }
      return { ...state, teams: miss(state.teams, team.id), lastWrong: { leftId: action.leftId, rightId: action.rightId }, turn }
    }

    case 'clearWrong':
      return state.lastWrong ? { ...state, lastWrong: null } : state

    case 'nextSet':
      if (state.setIndex + 1 >= action.total) return { ...state, finished: true }
      return { ...state, setIndex: state.setIndex + 1, matched: {}, lastWrong: null }

    case 'finish':
      return { ...state, finished: true }

    case 'restart':
      return initialMatchingRound(action.teamCount)
  }
}
