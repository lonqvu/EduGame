import { describe, expect, it } from 'vitest'
import { isMatch, initialMatchingRound, matchingReducer, playableMatchingSets } from '@/game-engine/matching/matchingRound'
import { initialMemoryRound, memoryReducer, playableMemorySets, type MemoryCard } from '@/game-engine/memory/memoryRound'
import { initialQuizRound, playableQuizQuestions, quizReducer } from '@/game-engine/quiz/quizRound'
import { readPlaySettings } from '@/game-engine/shared/gameSettings'
import { shuffle, shuffleChanged } from '@/game-engine/shared/shuffle'
import { freshTeams } from '@/game-engine/shared/teamScore'
import { bestBy, rankTeams } from '@/game-engine/grid-board/ranking'
import type { PairSet, QuizQuestion } from '@/types/game'

/** Deterministic "random" numbers for shuffles. */
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

describe('shared helpers', () => {
  it('shuffle keeps every item', () => {
    const items = [1, 2, 3, 4, 5, 6]
    expect([...shuffle(items, seeded())].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('shuffleChanged never returns the original order', () => {
    const identity = () => 0.999999 // Fisher-Yates with j = i: nothing moves
    expect(shuffleChanged(['a', 'b'], identity)).toEqual(['b', 'a'])
    expect(shuffleChanged(['a'], identity)).toEqual(['a'])
  })

  it('freshTeams clamps the team count to 2-4', () => {
    expect(freshTeams(1)).toHaveLength(2)
    expect(freshTeams(9)).toHaveLength(4)
    expect(freshTeams(Number.NaN)).toHaveLength(2)
  })

  it('reads settings with defaults and bounds', () => {
    expect(
      readPlaySettings({ timeLimitSec: 30, rules: { participants: { teams: 4 }, scoring: { points: 10, allowSteal: true } } }),
    ).toMatchObject({ teams: 4, points: 10, allowSteal: true, timeLimitSec: 30 })
    expect(readPlaySettings(undefined, { teams: 2 })).toMatchObject({ teams: 2, points: 10, allowSteal: false, timeLimitSec: 0 })
    expect(readPlaySettings({ timeLimitSec: -5, flipBackDelayMs: 'x', rules: [] })).toMatchObject({
      timeLimitSec: 0,
      flipBackDelayMs: 1000,
    })
  })

  it('ranks ties together and finds a strict best', () => {
    const teams = freshTeams(3).map((t, i) => ({ ...t, score: [20, 20, 10][i], correct: [1, 2, 2][i] }))
    expect(rankTeams(teams).map((t) => t.rank)).toEqual([1, 1, 2])
    expect(bestBy(teams, (t) => t.correct)).toBeNull()
    expect(bestBy(teams, (t) => t.score)).toBeNull()
  })
})

describe('quiz round', () => {
  const question = (patch: Partial<QuizQuestion>): QuizQuestion => ({
    id: 'q',
    trueFalse: false,
    text: 'Q?',
    options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: '' }],
    correctId: 'a',
    ...patch,
  })

  it('skips half-written questions and blank options', () => {
    const playable = playableQuizQuestions(
      [
        question({ id: '1' }),
        question({ id: '2', text: '  ' }),
        question({ id: '3', correctId: null }),
        question({ id: '4', correctId: 'c' }), // right answer is a blank option
        question({ id: '5', options: [{ id: 'a', text: 'A' }] }),
      ],
      { shuffleOptions: false },
    )
    expect(playable.map((q) => q.id)).toEqual(['1'])
    expect(playable[0].options).toHaveLength(2)
  })

  it('does not shuffle true / false options', () => {
    const tf = question({ trueFalse: true, options: [{ id: 'true', text: 'Đúng' }, { id: 'false', text: 'Sai' }], correctId: 'false' })
    for (let seed = 1; seed < 20; seed++) {
      expect(playableQuizQuestions([tf], { random: seeded(seed) })[0].options[0].id).toBe('true')
    }
  })

  it('scores the team that answers right and reveals', () => {
    let s = initialQuizRound(4)
    const blue = s.teams[1].id
    s = quizReducer(s, { type: 'choose', optionId: 'a', correctId: 'a', points: 10, allowSteal: true })
    expect(s.teams.every((t) => t.score === 0)).toBe(true) // nobody picked yet: ignored
    s = quizReducer(s, { type: 'pickTeam', teamId: blue })
    s = quizReducer(s, { type: 'choose', optionId: 'a', correctId: 'a', points: 10, allowSteal: true })
    expect(s.teams.find((t) => t.id === blue)?.score).toBe(10)
    expect(s.revealed).toBe(true)
    // Nothing more can happen on a revealed question.
    expect(quizReducer(s, { type: 'pickTeam', teamId: s.teams[0].id })).toBe(s)
  })

  it('lets other teams steal until every team has tried', () => {
    let s = initialQuizRound(2)
    const [orange, blue] = s.teams.map((t) => t.id)
    s = quizReducer(s, { type: 'pickTeam', teamId: orange })
    s = quizReducer(s, { type: 'choose', optionId: 'b', correctId: 'a', points: 10, allowSteal: true })
    expect(s).toMatchObject({ revealed: false, triedTeams: [orange], tried: { b: false } })
    // The team that missed cannot answer again, and a tried option cannot be chosen again.
    expect(quizReducer(s, { type: 'pickTeam', teamId: orange }).answeringTeamId).toBeNull()
    s = quizReducer(s, { type: 'pickTeam', teamId: blue })
    expect(quizReducer(s, { type: 'choose', optionId: 'b', correctId: 'a', points: 10, allowSteal: true })).toBe(s)
    s = quizReducer(s, { type: 'choose', optionId: 'c', correctId: 'a', points: 10, allowSteal: true })
    expect(s.revealed).toBe(true)
    expect(s.teams.every((t) => t.score === 0)).toBe(true)
  })

  it('reveals at the first wrong answer when stealing is off', () => {
    let s = quizReducer(initialQuizRound(4), { type: 'pickTeam', teamId: 't-orange' })
    s = quizReducer(s, { type: 'choose', optionId: 'b', correctId: 'a', points: 10, allowSteal: false })
    expect(s.revealed).toBe(true)
  })

  it('moves to the next question and finishes after the last', () => {
    let s = quizReducer(initialQuizRound(2), { type: 'reveal' })
    s = quizReducer(s, { type: 'next', total: 2 })
    expect(s).toMatchObject({ index: 1, revealed: false, tried: {}, triedTeams: [] })
    s = quizReducer(s, { type: 'next', total: 2 })
    expect(s.finished).toBe(true)
    expect(quizReducer(s, { type: 'restart', teamCount: 3 })).toEqual(initialQuizRound(3))
  })
})

describe('matching round', () => {
  const set: PairSet = {
    id: 's',
    pairs: [
      { id: 'p1', a: '2 + 2', b: '4' },
      { id: 'p2', a: '3 + 1', b: '4 ' },
      { id: 'p3', a: '5 + 5', b: '10' },
      { id: 'p4', a: 'Thiếu', b: '' },
    ],
  }

  it('plays complete pairs and shuffles the right column', () => {
    const [played] = playableMatchingSets([set, { id: 'tiny', pairs: [{ id: 'x', a: 'a', b: 'b' }] }], seeded(3))
    expect(played.pairs.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
    expect([...played.rightOrder].sort()).toEqual(['p1', 'p2', 'p3'])
    expect(played.rightOrder).not.toEqual(['p1', 'p2', 'p3'])
    expect(playableMatchingSets([{ id: 'tiny', pairs: [{ id: 'x', a: 'a', b: 'b' }] }])).toEqual([])
  })

  it('accepts any right entry with the same text', () => {
    const [played] = playableMatchingSets([set])
    expect(isMatch(played, 'p1', 'p2')).toBe(true)
    expect(isMatch(played, 'p1', 'p3')).toBe(false)
  })

  it('scores right matches, passes the turn on every attempt, and blocks reused entries', () => {
    let s = initialMatchingRound(2)
    s = matchingReducer(s, { type: 'attempt', leftId: 'p1', rightId: 'p3', correct: false, points: 10 })
    expect(s).toMatchObject({ turn: 1, lastWrong: { leftId: 'p1', rightId: 'p3' } })
    s = matchingReducer(s, { type: 'attempt', leftId: 'p1', rightId: 'p1', correct: true, points: 10 })
    expect(s.teams[1].score).toBe(10)
    expect(s).toMatchObject({ turn: 0, lastWrong: null, matched: { p1: { rightId: 'p1', teamId: s.teams[1].id } } })
    expect(matchingReducer(s, { type: 'attempt', leftId: 'p1', rightId: 'p2', correct: true, points: 10 })).toBe(s)
    expect(matchingReducer(s, { type: 'attempt', leftId: 'p2', rightId: 'p1', correct: true, points: 10 })).toBe(s)
  })

  it('goes to the next set, then finishes', () => {
    let s = matchingReducer(initialMatchingRound(2), { type: 'attempt', leftId: 'a', rightId: 'a', correct: true, points: 5 })
    s = matchingReducer(s, { type: 'nextSet', total: 2 })
    expect(s).toMatchObject({ setIndex: 1, matched: {} })
    expect(s.teams[0].score).toBe(5)
    expect(matchingReducer(s, { type: 'nextSet', total: 2 }).finished).toBe(true)
  })
})

describe('memory round', () => {
  const [played] = playableMemorySets(
    [{ id: 's', pairs: [{ id: 'p1', a: 'Mèo', b: 'Meo meo' }, { id: 'p2', a: 'Chó', b: 'Gâu gâu' }, { id: 'p3', a: '', b: 'x' }] }],
    seeded(5),
  )
  const card = (key: string) => played.cards.find((c) => c.key === key) as MemoryCard
  const flip = (s: ReturnType<typeof initialMemoryRound>, key: string) =>
    memoryReducer(s, { type: 'flip', card: card(key), deck: played.cards, points: 10 })

  it('deals both cards of every complete pair', () => {
    expect(played.cards.map((c) => c.key).sort()).toEqual(['p1:a', 'p1:b', 'p2:a', 'p2:b'])
  })

  it('a found pair scores and the team keeps the turn', () => {
    let s = flip(initialMemoryRound(2), 'p1:a')
    expect(flip(s, 'p1:a')).toBe(s) // same card twice: ignored
    s = flip(s, 'p1:b')
    expect(s).toMatchObject({ turn: 0, faceUp: [], matched: { 'p1:a': 't-orange', 'p1:b': 't-orange' } })
    expect(s.teams[0].score).toBe(10)
    expect(flip(s, 'p1:a')).toBe(s) // matched cards stay put
  })

  it('a miss stays visible until hidden, then the next team plays', () => {
    let s = flip(flip(initialMemoryRound(2), 'p1:a'), 'p2:a')
    expect(s.faceUp).toEqual(['p1:a', 'p2:a'])
    expect(flip(s, 'p1:b')).toBe(s) // no third card
    s = memoryReducer(s, { type: 'hide' })
    expect(s).toMatchObject({ faceUp: [], turn: 1 })
    expect(memoryReducer(s, { type: 'hide' })).toBe(s)
  })

  it('finishes after the last set', () => {
    const s = memoryReducer(initialMemoryRound(2), { type: 'nextSet', total: 1 })
    expect(s.finished).toBe(true)
  })
})
