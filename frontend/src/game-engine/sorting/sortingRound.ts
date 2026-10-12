import { shuffle } from '@/game-engine/shared/shuffle'
import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'
import type { SortSet, TextEntry } from '@/types/game'

/** A card as played: its text and the group it belongs in. */
export interface PlayableSortCard extends TextEntry {
  groupId: string
}

/** A set as played: named groups and the cards that have a group, shuffled into a deck. */
export interface PlayableSortSet {
  id: string
  text: string
  groups: TextEntry[]
  cards: PlayableSortCard[]
}

/** Sets with at least two named groups and two cards that have text and a group. */
export function playableSortSets(sets: SortSet[], random: () => number = Math.random): PlayableSortSet[] {
  return sets.flatMap((set) => {
    const groups = set.groups.filter((g) => g.text.trim()).map((g) => ({ ...g, text: g.text.trim() }))
    const ids = new Set(groups.map((g) => g.id))
    const cards = set.cards.flatMap((c) =>
      c.text.trim() && c.groupId && ids.has(c.groupId) ? [{ id: c.id, text: c.text.trim(), groupId: c.groupId }] : [],
    )
    if (groups.length < 2 || cards.length < 2) return []
    return [{ id: set.id, text: set.text.trim(), groups, cards: shuffle(cards, random) }]
  })
}

export interface SortingState {
  setIndex: number
  teams: TeamScore[]
  turn: number
  /** Card ids still to sort, the first one is on show. */
  deck: string[]
  /** Card id → team that sorted it right. */
  sorted: Record<string, string>
  /** Last wrong drop, shown briefly. */
  lastWrong: { cardId: string; groupId: string } | null
  finished: boolean
}

export type SortingAction =
  /** The team whose turn it is drops the card on show into `groupId`. */
  | { type: 'drop'; groupId: string; rightGroupId: string; points: number }
  | { type: 'clearWrong' }
  | { type: 'nextSet'; total: number; deck: string[] }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number; deck: string[] }

export const initialSorting = ({ teamCount, deck }: { teamCount: number; deck: string[] }): SortingState => ({
  setIndex: 0,
  teams: freshTeams(teamCount),
  turn: 0,
  deck,
  sorted: {},
  lastWrong: null,
  finished: false,
})

export function sortingReducer(state: SortingState, action: SortingAction): SortingState {
  if (state.finished && action.type !== 'restart') return state
  switch (action.type) {
    case 'drop': {
      const [cardId, ...rest] = state.deck
      if (!cardId || state.lastWrong) return state
      const team = state.teams[state.turn]
      const turn = (state.turn + 1) % state.teams.length
      if (action.groupId === action.rightGroupId) {
        return { ...state, teams: award(state.teams, team.id, action.points), deck: rest, sorted: { ...state.sorted, [cardId]: team.id }, turn }
      }
      // Wrong basket: the card goes to the bottom of the deck and comes back later.
      return { ...state, teams: miss(state.teams, team.id), deck: [...rest, cardId], lastWrong: { cardId, groupId: action.groupId }, turn }
    }

    case 'clearWrong':
      return state.lastWrong ? { ...state, lastWrong: null } : state

    case 'nextSet':
      if (state.setIndex + 1 >= action.total) return { ...state, finished: true }
      return { ...state, setIndex: state.setIndex + 1, deck: action.deck, sorted: {}, lastWrong: null }

    case 'finish':
      return { ...state, finished: true }

    case 'restart':
      return initialSorting({ teamCount: action.teamCount, deck: action.deck })
  }
}
