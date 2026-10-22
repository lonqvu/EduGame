import { describe, expect, it } from 'vitest'
import {
  fiftyFifty,
  initialMillionaire,
  ladderFor,
  milestonesFor,
  millionaireReducer,
  prizeAfterWrong,
  prizeWhenStopping,
  type MillionaireAction,
  type MillionaireState,
} from '@/game-engine/millionaire/millionaire'
import type { PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'

const q = (correctId = 'b', ids = ['a', 'b', 'c', 'd']): PlayableQuizQuestion => ({
  id: 'q',
  trueFalse: false,
  text: '?',
  options: ids.map((id) => ({ id, text: id })),
  correctId,
})
const play = (state: MillionaireState, ...actions: MillionaireAction[]) => actions.reduce(millionaireReducer, state)

describe('the prize ladder', () => {
  it('ends at 1.000.000 whatever the number of questions, with safe levels', () => {
    expect(ladderFor(15)).toHaveLength(15)
    expect(ladderFor(10).at(-1)).toBe(1_000_000)
    expect(ladderFor(40)).toHaveLength(15)
    expect(milestonesFor(15)).toEqual([5, 10])
    expect(milestonesFor(9)).toEqual([3, 6])
    expect(milestonesFor(2)).toEqual([])
  })

  it('keeps the last safe level after a wrong answer, the last level answered when stopping', () => {
    expect(prizeAfterWrong(4, 15)).toBe(0)
    expect(prizeAfterWrong(7, 15)).toBe(1_000)
    expect(prizeAfterWrong(12, 15)).toBe(32_000)
    expect(prizeWhenStopping(1, 15)).toBe(0)
    expect(prizeWhenStopping(8, 15)).toBe(4_000)
  })
})

describe('millionaireReducer', () => {
  it('climbs on locked right answers and wins the top prize', () => {
    let s = play(initialMillionaire(), { type: 'select', optionId: 'b' }, { type: 'lock' }, { type: 'next', question: q(), levels: 2 })
    expect(s.level).toBe(1)
    s = play(s, { type: 'select', optionId: 'b' }, { type: 'lock' }, { type: 'next', question: q(), levels: 2 })
    expect(s.end).toEqual({ reason: 'won', prize: 1_000_000 })
  })

  it('ends on a wrong answer, and needs the answer locked first', () => {
    const s = play(initialMillionaire(), { type: 'select', optionId: 'a' }, { type: 'next', question: q(), levels: 15 })
    expect(s.end).toBeNull()
    expect(play(s, { type: 'lock' }, { type: 'next', question: q(), levels: 15 }).end).toEqual({ reason: 'wrong', prize: 0 })
  })

  it('uses each lifeline once: 50:50 hides two wrong options, the poll counts hands', () => {
    const hide = fiftyFifty(q(), () => 0)
    expect(hide).toHaveLength(2)
    expect(hide).not.toContain('b')
    expect(fiftyFifty(q('a', ['a', 'b']))).toEqual([])

    let s = play(initialMillionaire(), { type: 'select', optionId: hide[0] }, { type: 'fifty', hide })
    expect(s.selected).toBeNull()
    expect(play(s, { type: 'fifty', hide: ['x'] }).hidden).toEqual(hide)
    s = play(s, { type: 'poll' }, { type: 'vote', optionId: 'b' }, { type: 'vote', optionId: 'b' }, { type: 'vote', optionId: hide[0] })
    expect(s.poll).toEqual({ b: 2 })
    expect(play(s, { type: 'friend' }, { type: 'friend' }).used).toEqual({ fifty: true, poll: true, friend: true })
  })

  it('stops with the prize of the last answered level', () => {
    let s = play(initialMillionaire(), { type: 'select', optionId: 'b' }, { type: 'lock' }, { type: 'next', question: q(), levels: 15 })
    s = play(s, { type: 'stop', levels: 15 })
    expect(s.end).toEqual({ reason: 'stopped', prize: 100 })
  })
})
