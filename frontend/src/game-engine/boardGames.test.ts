import { describe, expect, it } from 'vitest'
import { bingoQuestions, bingoReducer, cardSize, cellOf, hasLine, initialBingo, makeCards } from '@/game-engine/bingo/bingo'
import type { PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import { dropRow, findLine } from '@/game-engine/shared/lines'
import { freshTeams } from '@/game-engine/shared/teamScore'
import { initialTurnQuiz, turnOf, turnQuizReducer } from '@/game-engine/shared/turnQuiz'
import { dealChests, openTreasure, TREASURES } from '@/game-engine/treasure-chest/chests'

describe('turnQuizReducer', () => {
  it('earns a move on a right answer, passes the turn on a wrong one', () => {
    let s = turnQuizReducer(initialTurnQuiz(2), { type: 'choose', optionId: 'b', correctId: 'b', points: 1 })
    expect(s.earned).toBe(true)
    expect(s.teams[0].score).toBe(1)
    s = turnQuizReducer(s, { type: 'next' })
    expect(turnOf(s).id).toBe(s.teams[1].id)
    expect(s.asked).toBe(1)
    s = turnQuizReducer(s, { type: 'choose', optionId: 'a', correctId: 'b', points: 1 })
    expect(s.earned).toBe(false)
    expect(s.revealed).toBe(true)
    expect(turnQuizReducer(s, { type: 'choose', optionId: 'b', correctId: 'b', points: 1 }).teams[1].score).toBe(0)
    s = turnQuizReducer(turnQuizReducer(s, { type: 'next' }), { type: 'setScores', scores: { [s.teams[0].id]: 40 } })
    expect(s.teams[0].score).toBe(40)
  })
})

describe('lines', () => {
  it('finds three in a row across, down and on both diagonals', () => {
    expect(findLine(['a', 'a', 'a', null, null, null, null, null, null], 3, 3, 3)).toEqual({ owner: 'a', cells: [0, 1, 2] })
    expect(findLine([null, 'b', null, null, 'b', null, null, 'b', null], 3, 3, 3)?.cells).toEqual([1, 4, 7])
    expect(findLine(['a', null, 'b', null, 'b', null, 'b', null, 'a'], 3, 3, 3)).toEqual({ owner: 'b', cells: [2, 4, 6] })
    expect(findLine(['a', 'b', 'a', 'a', 'b', 'b', 'b', 'a', 'a'], 3, 3, 3)).toBeNull()
  })

  it('drops a disc to the lowest free row of a column, four in a row wins', () => {
    const grid: (string | null)[] = Array(42).fill(null)
    expect(dropRow(grid, 6, 7, 3)).toBe(5)
    for (const c of [0, 1, 2, 3]) grid[5 * 7 + c] = 'a'
    expect(findLine(grid, 6, 7, 4)?.owner).toBe('a')
    for (let r = 0; r < 6; r++) grid[r * 7 + 6] = 'b'
    expect(dropRow(grid, 6, 7, 6)).toBe(-1)
  })
})

describe('chests', () => {
  const teams = freshTeams(3).map((t, i) => ({ ...t, score: [10, 50, 30][i] }))
  const [a, b] = teams

  it('deals three different chests', () => {
    const chests = dealChests()
    expect(chests).toHaveLength(3)
    expect(new Set(chests).size).toBe(3)
    expect(chests.every((c) => TREASURES.includes(c))).toBe(true)
  })

  it('adds points, doubles, steals from the leader, swaps when it helps', () => {
    expect(openTreasure(teams, a.id, { kind: 'points', points: 20 })).toEqual({ [a.id]: 30 })
    expect(openTreasure(teams, a.id, { kind: 'double' })).toEqual({ [a.id]: 20 })
    expect(openTreasure(teams, a.id, { kind: 'steal', points: 20 })).toEqual({ [a.id]: 30, [b.id]: 30 })
    expect(openTreasure(teams, a.id, { kind: 'swap' })).toEqual({ [a.id]: 50, [b.id]: 10 })
    expect(openTreasure(teams, b.id, { kind: 'swap' })).toEqual({})
    expect(openTreasure(teams, a.id, { kind: 'empty' })).toEqual({})
  })
})

describe('bingo', () => {
  const q = (id: string, right: string, trueFalse = false): PlayableQuizQuestion => ({
    id,
    trueFalse,
    text: id,
    options: [
      { id: 'a', text: right },
      { id: 'b', text: 'x' },
    ],
    correctId: 'a',
  })

  it('makes cards of the different right answers, true / false questions aside', () => {
    const { asked, answers } = bingoQuestions([q('1', '7'), q('2', ' 7 '), q('3', '8'), q('4', 'Đúng', true)])
    expect(asked).toHaveLength(3)
    expect(answers).toEqual(['7', '8'])
    expect(cardSize(9)).toBe(3)
    expect(cardSize(5)).toBe(2)
    expect(cardSize(3)).toBe(0)
    const cards = makeCards(['1', '2', '3', '4', '5'], 3, 2)
    expect(cards).toHaveLength(3)
    expect(cards.every((c) => c.length === 4 && new Set(c).size === 4)).toBe(true)
    expect(cellOf(['5', '7'], q('x', '7'))).toBe(1)
    expect(cellOf(['5'], q('x', '7'))).toBe(-1)
  })
})

describe('bingoReducer', () => {
  const question = (right: string): PlayableQuizQuestion => ({
    id: right,
    trueFalse: false,
    text: '?',
    options: [
      { id: 'a', text: right },
      { id: 'b', text: 'không' },
    ],
    correctId: 'a',
  })

  it('marks the right claims, scores them, and calls a bingo on a full line', () => {
    const cards = [
      ['1', '2', '3', '4'],
      ['4', '3', '2', '1'],
    ]
    let s = initialBingo(cards)
    const [a, b] = s.teams
    s = bingoReducer(s, { type: 'claim', teamId: a.id, cell: 0 })
    s = bingoReducer(s, { type: 'claim', teamId: b.id, cell: 0 })
    s = bingoReducer(s, { type: 'reveal', question: question('1'), points: 10 })
    expect(s.marked).toEqual([
      [true, false, false, false],
      [false, false, false, false],
    ])
    expect(s.teams.map((t) => t.score)).toEqual([10, 0])
    expect(s.bingo).toEqual([])
    s = bingoReducer(s, { type: 'next', total: 5 })
    s = bingoReducer(s, { type: 'claim', teamId: a.id, cell: 1 })
    s = bingoReducer(s, { type: 'reveal', question: question('2'), points: 10 })
    expect(s.bingo).toEqual([a.id])
    expect(hasLine(s.marked[0])).toBe(true)
    expect(bingoReducer(s, { type: 'next', total: 5 }).finished).toBe(true)
  })
})
