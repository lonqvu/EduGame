import { describe, expect, it } from 'vitest'
import {
  baseLetter,
  hangmanReducer,
  hangmanTurn,
  hiddenLetters,
  initialHangman,
  initialScramble,
  scrambled,
  scrambleReducer,
  wordQuestions,
  type ScrambleAction,
  type ScrambleState,
} from '@/game-engine/words/words'
import type { Question } from '@/types/game'

const q = (answer: string, text = 'Gợi ý'): Question => ({ id: answer, text, answer, points: 20 })

describe('wordQuestions', () => {
  it('keeps answers of letters that fit, in capitals, split into words', () => {
    const [hn] = wordQuestions([q(' hà   nội ')])
    expect(hn.answer).toBe('HÀ NỘI')
    expect(hn.words).toEqual([
      ['H', 'À'],
      ['N', 'Ộ', 'I'],
    ])
    expect(wordQuestions([q('25 + 13')])).toHaveLength(0)
    expect(wordQuestions([q('a'.repeat(17))])).toHaveLength(0)
    expect(wordQuestions([q('MÈO', ' ')])).toHaveLength(0)
  })
})

describe('letters', () => {
  it('takes the tone marks away, keeps the other marks', () => {
    expect(['Ò', 'Ố', 'Ợ', 'Ẵ', 'Đ', 'ữ'].map(baseLetter)).toEqual(['O', 'Ô', 'Ơ', 'Ă', 'Đ', 'Ư'])
  })

  it('scrambles the letters of the answer into another order', () => {
    const [word] = wordQuestions([q('TRƯỜNG')])
    const tiles = scrambled(word)
    expect([...tiles].sort()).toEqual([...word.words.flat()].sort())
    expect(tiles.join('')).not.toBe('TRƯỜNG')
  })
})

describe('scrambleReducer', () => {
  const [word] = wordQuestions([q('MÈO')])
  const tiles = ['O', 'M', 'È']
  const play = (s: ScrambleState, ...actions: ScrambleAction[]) => actions.reduce(scrambleReducer, s)
  const place = (tile: number): ScrambleAction => ({ type: 'place', tile, tiles, question: word, allowSteal: true })

  it('scores a team that puts the letters back in order', () => {
    const s0 = initialScramble(2)
    const s = play(s0, place(1), { type: 'pickTeam', teamId: s0.teams[0].id }, place(1), place(2), place(0))
    expect(s.revealed).toBe(true)
    expect(s.teams[0].score).toBe(20)
  })

  it('empties the slots on a wrong word and lets another team try', () => {
    const s0 = initialScramble(2)
    let s = play(s0, { type: 'pickTeam', teamId: s0.teams[0].id }, place(0), place(1), place(2))
    expect(s.wrong).toBe(true)
    expect(s.placed).toEqual([])
    expect(s.revealed).toBe(false)
    s = play(s, { type: 'pickTeam', teamId: s0.teams[0].id })
    expect(s.answeringTeamId).toBeNull()
  })

  it('counts as hints only the letters "Gợi ý" gave', () => {
    const s0 = initialScramble(2)
    const s = play(s0, { type: 'pickTeam', teamId: s0.teams[0].id }, place(1), { type: 'hint', tiles, question: word }, place(0))
    expect(s.helped).toBe(1)
    expect(s.teams[0].score).toBe(20)
  })

  it('gives the next letters as hints, and halves the points when they are most of the word', () => {
    const s0 = initialScramble(2)
    let s = play(s0, { type: 'hint', tiles, question: word }, { type: 'hint', tiles, question: word })
    expect(s.placed).toEqual([1, 2])
    expect(play(s, { type: 'hint', tiles, question: word })).toBe(s)
    s = play(s, { type: 'pickTeam', teamId: s0.teams[1].id }, { type: 'undo' }, place(0))
    expect(s.teams[1].score).toBe(10)
  })
})

describe('hangmanReducer', () => {
  const [word] = wordQuestions([q('CON VOI')])
  const guess = (letter: string) => ({ type: 'guess' as const, letter, question: word, points: 10, bonus: 30 })

  it('opens every place of a letter, keeps the turn on a hit, passes it on a miss', () => {
    let s = hangmanReducer(initialHangman(2), guess('O'))
    expect(s.teams[0].score).toBe(20)
    expect(hangmanTurn(s).id).toBe(s.teams[0].id)
    expect(hiddenLetters(word, s.guessed)).toBe(4)
    s = hangmanReducer(s, guess('Z'))
    expect(hangmanTurn(s).id).toBe(s.teams[1].id)
    expect(hangmanReducer(s, guess('O'))).toBe(s)
  })

  it('solves the word for its bonus and the letters still hidden, or passes the turn when wrong', () => {
    let s = hangmanReducer(initialHangman(2), guess('C'))
    s = hangmanReducer(s, { type: 'solve', right: false, question: word, points: 10, bonus: 30 })
    expect(hangmanTurn(s).id).toBe(s.teams[1].id)
    s = hangmanReducer(s, { type: 'solve', right: true, question: word, points: 10, bonus: 30 })
    expect(s.solvedBy).toBe(s.teams[1].id)
    expect(s.teams[1].score).toBe(30 + 5 * 10)
  })

  it('solves the word by its last letter too', () => {
    const [short] = wordQuestions([q('OI')])
    let s = hangmanReducer(initialHangman(2), { type: 'guess', letter: 'O', question: short, points: 10, bonus: 30 })
    s = hangmanReducer(s, { type: 'guess', letter: 'I', question: short, points: 10, bonus: 30 })
    expect(s.revealed).toBe(true)
    expect(s.teams[0].score).toBe(10 + 10 + 30)
  })
})
