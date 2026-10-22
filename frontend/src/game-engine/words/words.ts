import { shuffle } from '@/game-engine/shared/shuffle'
import { award, freshTeams, miss, type TeamScore } from '@/game-engine/shared/teamScore'
import type { Question } from '@/types/game'

/** Longest answer the word games play (letters, spaces aside): longer ones do not fit the projector. */
export const MAX_LETTERS = 16

/** A question of a word game: its clue and its answer in capitals, words split. */
export interface WordQuestion {
  id: string
  clue: string
  imageUrl?: string
  points: number
  /** "HÀ NỘI" */
  answer: string
  /** [["H","À"],["N","Ộ","I"]] */
  words: string[][]
}

const letters = (word: string) => [...word.normalize('NFC')]

/**
 * Questions the word games can play: a clue and an answer of 1-16 letters (letters and digits only; spaces split
 * the words).
 */
export function wordQuestions(questions: Question[], { shuffleItems = false, random = Math.random } = {}): WordQuestion[] {
  const ready = questions.flatMap((q) => {
    const answer = q.answer.normalize('NFC').trim().toLocaleUpperCase('vi').replace(/\s+/g, ' ')
    const words = answer.split(' ').map(letters)
    const count = words.flat().length
    if (!q.text.trim() || count === 0 || count > MAX_LETTERS || !words.flat().every((ch) => /[\p{L}\p{N}]/u.test(ch))) return []
    return [{ id: q.id, clue: q.text.trim(), imageUrl: q.imageUrl, points: q.points > 0 ? q.points : 20, answer, words }]
  })
  return shuffleItems ? shuffle(ready, random) : ready
}

/** The letters of an answer in a shuffled order, different from the answer when they can be. */
export function scrambled(question: WordQuestion, random: () => number = Math.random): string[] {
  const all = question.words.flat()
  for (let attempt = 0; attempt < 8; attempt++) {
    const out = shuffle(all, random)
    if (out.join('') !== all.join('')) return out
  }
  return all
}

/** Tone marks (huyền, sắc, hỏi, ngã, nặng): a guess of "O" opens Ò, Ó, Ỏ, Õ, Ọ too, but not Ô or Ơ. */
const TONES = /[̣̀́̃̉]/g

/** The letter as guessed in "Đoán chữ": its tone mark taken away, its other marks kept (Ă, Â, Ê, Ô, Ơ, Ư, Đ). */
export const baseLetter = (ch: string) => ch.normalize('NFD').replace(TONES, '').normalize('NFC').toLocaleUpperCase('vi')

/** The keyboard of "Đoán chữ": the Vietnamese alphabet, then F, J, W, Z for English words, then digits. */
export const KEYBOARD = [
  ...'A Ă Â B C D Đ E Ê G H I K L M N O Ô Ơ P Q R S T U Ư V X Y'.split(' '),
  'F',
  'J',
  'W',
  'Z',
]

// --- Vua Tiếng Việt -------------------------------------------------------------------------------------------

export interface ScrambleState {
  index: number
  teams: TeamScore[]
  answeringTeamId: string | null
  triedTeams: string[]
  /** Tiles put in the slots, in order (indexes in the shuffled tiles). */
  placed: number[]
  /** Letters at the start of the answer kept in place by "Gợi ý" (they cannot be taken back). */
  hints: number
  /** Times "Gợi ý" was used on this word. */
  helped: number
  /** The last full answer was wrong (the slots shake, then empty). */
  wrong: boolean
  revealed: boolean
  finished: boolean
}

export type ScrambleAction =
  | { type: 'pickTeam'; teamId: string }
  | { type: 'place'; tile: number; tiles: string[]; question: WordQuestion; allowSteal: boolean }
  | { type: 'undo' }
  | { type: 'hint'; tiles: string[]; question: WordQuestion }
  | { type: 'reveal' }
  | { type: 'next'; total: number }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number }

export const initialScramble = (teamCount: number): ScrambleState => ({
  index: 0,
  teams: freshTeams(teamCount),
  answeringTeamId: null,
  triedTeams: [],
  placed: [],
  hints: 0,
  helped: 0,
  wrong: false,
  revealed: false,
  finished: false,
})

/** Points of a word: half when more than half of its letters were given by "Gợi ý". */
export const scramblePoints = (question: WordQuestion, helped: number) =>
  helped * 2 > question.words.flat().length ? Math.round(question.points / 2) : question.points

export function scrambleReducer(state: ScrambleState, action: ScrambleAction): ScrambleState {
  switch (action.type) {
    case 'pickTeam':
      if (state.revealed || state.triedTeams.includes(action.teamId) || !state.teams.some((t) => t.id === action.teamId)) return state
      return { ...state, answeringTeamId: action.teamId, wrong: false }
    case 'place': {
      const teamId = state.answeringTeamId
      if (!teamId || state.revealed || state.placed.includes(action.tile) || action.tile >= action.tiles.length) return state
      const placed = [...state.placed, action.tile]
      const target = action.question.words.flat()
      if (placed.length < target.length) return { ...state, placed, wrong: false }
      // Full: judged at once.
      if (placed.map((i) => action.tiles[i]).join('') === target.join('')) {
        return {
          ...state,
          placed,
          teams: award(state.teams, teamId, scramblePoints(action.question, state.helped)),
          answeringTeamId: null,
          revealed: true,
        }
      }
      const triedTeams = [...state.triedTeams, teamId]
      const over = !action.allowSteal || triedTeams.length >= state.teams.length
      return {
        ...state,
        teams: miss(state.teams, teamId),
        placed: over ? placed : placed.slice(0, state.hints),
        triedTeams,
        answeringTeamId: null,
        wrong: true,
        revealed: over,
      }
    }
    case 'undo':
      if (state.revealed || state.placed.length <= state.hints) return state
      return { ...state, placed: state.placed.slice(0, -1), wrong: false }
    case 'hint': {
      // The next letter of the answer, from the tiles not used yet; the letters already placed stay only if right.
      if (state.revealed) return state
      const target = action.question.words.flat()
      const keep = state.placed.filter((tile, i) => i < state.hints || action.tiles[tile] === target[i])
      const prefix: number[] = []
      for (let i = 0; i < keep.length && action.tiles[keep[i]] === target[i]; i++) prefix.push(keep[i])
      if (prefix.length >= target.length - 1) return state
      const want = target[prefix.length]
      const tile = action.tiles.findIndex((ch, i) => ch === want && !prefix.includes(i))
      return tile < 0 ? state : { ...state, placed: [...prefix, tile], hints: prefix.length + 1, helped: state.helped + 1, wrong: false }
    }
    case 'reveal':
      return { ...state, revealed: true, answeringTeamId: null }
    case 'next':
      if (!state.revealed) return state
      if (state.index + 1 >= action.total) return { ...state, finished: true }
      return { ...state, index: state.index + 1, answeringTeamId: null, triedTeams: [], placed: [], hints: 0, helped: 0, wrong: false, revealed: false }
    case 'finish':
      return { ...state, finished: true }
    case 'restart':
      return initialScramble(action.teamCount)
  }
}

// --- Đoán chữ --------------------------------------------------------------------------------------------------

export interface HangmanState {
  index: number
  teams: TeamScore[]
  turn: number
  /** Letters guessed on this word (base letters). */
  guessed: string[]
  /** The last guess: the letter and how many times it is in the word. */
  last: { letter: string; count: number } | null
  /** The word is solved or shown; `solvedBy` is the team that solved it. */
  revealed: boolean
  solvedBy: string | null
  finished: boolean
}

export type HangmanAction =
  | { type: 'guess'; letter: string; question: WordQuestion; points: number; bonus: number }
  | { type: 'solve'; right: boolean; question: WordQuestion; points: number; bonus: number }
  | { type: 'reveal' }
  | { type: 'next'; total: number }
  | { type: 'finish' }
  | { type: 'restart'; teamCount: number }

export const initialHangman = (teamCount: number): HangmanState => ({
  index: 0,
  teams: freshTeams(teamCount),
  turn: 0,
  guessed: [],
  last: null,
  revealed: false,
  solvedBy: null,
  finished: false,
})

export const hangmanTurn = (state: HangmanState) => state.teams[state.turn % state.teams.length]

/** Letters of the word still hidden after these guesses. */
export const hiddenLetters = (question: WordQuestion, guessed: string[]) =>
  question.words.flat().filter((ch) => !guessed.includes(baseLetter(ch))).length

export function hangmanReducer(state: HangmanState, action: HangmanAction): HangmanState {
  switch (action.type) {
    case 'guess': {
      if (state.revealed || state.guessed.includes(action.letter)) return state
      const team = hangmanTurn(state)
      const count = action.question.words.flat().filter((ch) => baseLetter(ch) === action.letter).length
      const guessed = [...state.guessed, action.letter]
      if (count === 0) {
        // Not in the word: the turn passes.
        return { ...state, guessed, last: { letter: action.letter, count }, teams: miss(state.teams, team.id), turn: (state.turn + 1) % state.teams.length }
      }
      let teams = award(state.teams, team.id, count * action.points)
      // The last hidden letter solves the word: its bonus too.
      const solved = hiddenLetters(action.question, guessed) === 0
      if (solved) teams = teams.map((t) => (t.id === team.id ? { ...t, score: t.score + action.bonus } : t))
      return { ...state, guessed, last: { letter: action.letter, count }, teams, revealed: solved, solvedBy: solved ? team.id : null }
    }
    case 'solve': {
      if (state.revealed) return state
      const team = hangmanTurn(state)
      if (!action.right) {
        return { ...state, last: null, teams: miss(state.teams, team.id), turn: (state.turn + 1) % state.teams.length }
      }
      // Solving earns the bonus and the points of the letters still hidden.
      const points = action.bonus + hiddenLetters(action.question, state.guessed) * action.points
      return { ...state, teams: award(state.teams, team.id, points), revealed: true, solvedBy: team.id }
    }
    case 'reveal':
      return { ...state, revealed: true }
    case 'next':
      if (!state.revealed) return state
      if (state.index + 1 >= action.total) return { ...state, finished: true }
      return { ...state, index: state.index + 1, guessed: [], last: null, revealed: false, solvedBy: null, turn: (state.turn + 1) % state.teams.length }
    case 'finish':
      return { ...state, finished: true }
    case 'restart':
      return initialHangman(action.teamCount)
  }
}
