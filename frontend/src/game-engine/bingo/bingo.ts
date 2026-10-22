import type { PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import { findLine } from '@/game-engine/shared/lines'
import { shuffle } from '@/game-engine/shared/shuffle'
import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'

/** Text of an answer as a card shows it, and as two answers are compared (case and spaces aside). */
const key = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Questions Bingo can ask: choice questions (true / false ones all share "Đúng" and "Sai"), and the different right
 * answers among them, which the cards are made of.
 */
export function bingoQuestions(questions: PlayableQuizQuestion[]) {
  const asked = questions.filter((q) => !q.trueFalse)
  const answers = new Map<string, string>()
  for (const q of asked) {
    const text = q.options.find((o) => o.id === q.correctId)!.text.trim()
    if (!answers.has(key(text))) answers.set(key(text), text)
  }
  return { asked, answers: [...answers.values()] }
}

/** Side of the cards: 3×3 with nine answers or more, 2×2 with four or more, else no game. */
export const cardSize = (answers: number) => (answers >= 9 ? 3 : answers >= 4 ? 2 : 0)

/** One card per team: `size`² different answers, each card its own pick and order. */
export function makeCards(answers: string[], teamCount: number, size: number, random: () => number = Math.random): string[][] {
  return Array.from({ length: teamCount }, () => shuffle(answers, random).slice(0, size * size))
}

/** Whether a card shows the right answer of `question`, and where. */
export function cellOf(card: string[], question: PlayableQuizQuestion): number {
  const right = question.options.find((o) => o.id === question.correctId)
  return right ? card.findIndex((text) => key(text) === key(right.text)) : -1
}


export interface BingoState {
  index: number
  teams: TeamScore[]
  /** One card per team (answers), in the order of `teams`. */
  cards: string[][]
  marked: boolean[][]
  /** The cell each team pointed at for this question. */
  claims: Record<string, number>
  revealed: boolean
  /** Teams that completed a line on the last reveal. */
  bingo: string[]
  finished: boolean
}

export type BingoAction =
  | { type: 'claim'; teamId: string; cell: number }
  | { type: 'reveal'; question: PlayableQuizQuestion; points: number }
  | { type: 'next'; total: number }
  | { type: 'finish' }
  | { type: 'restart'; cards: string[][] }

export const initialBingo = (cards: string[][]): BingoState => ({
  index: 0,
  teams: freshTeams(cards.length),
  cards,
  marked: cards.map((c) => c.map(() => false)),
  claims: {},
  revealed: false,
  bingo: [],
  finished: false,
})

/** Whether a card has a full line (across, down or diagonal). */
export function hasLine(marked: boolean[]): boolean {
  const size = Math.round(Math.sqrt(marked.length))
  return findLine(marked.map((m) => (m ? 'x' : null)), size, size, size) !== null
}

export function bingoReducer(state: BingoState, action: BingoAction): BingoState {
  switch (action.type) {
    case 'claim': {
      const t = state.teams.findIndex((team) => team.id === action.teamId)
      if (state.revealed || t < 0 || state.marked[t][action.cell] !== false) return state
      // Pointing at the same cell again takes the claim back.
      const claims = { ...state.claims }
      if (claims[action.teamId] === action.cell) delete claims[action.teamId]
      else claims[action.teamId] = action.cell
      return { ...state, claims }
    }
    case 'reveal': {
      if (state.revealed) return state
      let teams = state.teams
      const marked = state.marked.map((m) => [...m])
      state.teams.forEach((team, t) => {
        const claim = state.claims[team.id]
        if (claim === undefined) return
        if (claim === cellOf(state.cards[t], action.question)) {
          marked[t][claim] = true
          teams = award(teams, team.id, action.points)
        } else teams = miss(teams, team.id)
      })
      const bingo = state.teams.filter((_, t) => hasLine(marked[t]) && !hasLine(state.marked[t])).map((team) => team.id)
      return { ...state, teams, marked, revealed: true, bingo }
    }
    case 'next':
      if (!state.revealed) return state
      if (state.bingo.length || state.index + 1 >= action.total) return { ...state, finished: true }
      return { ...state, index: state.index + 1, claims: {}, revealed: false }
    case 'finish':
      return { ...state, finished: true }
    case 'restart':
      return initialBingo(action.cards)
  }
}
