import { describe, expect, it } from 'vitest'
import { arrivedTeam, boatStep } from '@/game-engine/boat-race/boatRace'
import { goldenBellReducer, initialGoldenBell, stillIn, type GoldenBellState } from '@/game-engine/golden-bell/goldenBellRound'
import { initialQuizRound, quizReducer } from '@/game-engine/quiz/quizRound'
import { readPlaySettings } from '@/game-engine/shared/gameSettings'
import { isQuizFamily } from '@/game-engine/registry'

const CLASS = ['an', 'binh', 'chi', 'dung', 'em']

const answer = (s: GoldenBellState, wrong: string[], total = 5) => {
  let next = goldenBellReducer(s, { type: 'reveal' })
  for (const id of wrong) next = goldenBellReducer(next, { type: 'toggleWrong', studentId: id })
  return goldenBellReducer(next, { type: 'next', total, studentIds: CLASS })
}

describe('Rung chuông vàng', () => {
  it('students marked wrong are out from the next question, with the question they fell at', () => {
    const s = answer(initialGoldenBell(1), ['an', 'chi'])
    expect(s).toMatchObject({ index: 1, revealed: false, wrongNow: [], out: { an: 1, chi: 1 } })
    expect(stillIn(s, CLASS)).toEqual(['binh', 'dung', 'em'])
  })

  it('marks only count after the answer is shown, and a second tap unmarks', () => {
    let s = goldenBellReducer(initialGoldenBell(1), { type: 'toggleWrong', studentId: 'an' })
    expect(s.wrongNow).toEqual([])
    s = goldenBellReducer(s, { type: 'reveal' })
    s = goldenBellReducer(s, { type: 'toggleWrong', studentId: 'an' })
    s = goldenBellReducer(s, { type: 'toggleWrong', studentId: 'an' })
    expect(s.wrongNow).toEqual([])
    // Moving on is only possible once the answer is shown.
    expect(goldenBellReducer(initialGoldenBell(1), { type: 'next', total: 5, studentIds: CLASS }).index).toBe(0)
  })

  it('nobody is out when every student still in got it wrong', () => {
    let s = answer(initialGoldenBell(0), ['an', 'binh'])
    s = answer(s, ['chi', 'dung', 'em'])
    expect(s.everyoneWrong).toBe(true)
    expect(stillIn(s, CLASS)).toEqual(['chi', 'dung', 'em'])
    expect(s.index).toBe(2)
  })

  it('a student already out cannot be marked again', () => {
    let s = answer(initialGoldenBell(0), ['an'])
    s = goldenBellReducer(goldenBellReducer(s, { type: 'reveal' }), { type: 'toggleWrong', studentId: 'an' })
    expect(s.wrongNow).toEqual([])
  })

  it('a rescue brings everyone back once per rescue', () => {
    let s = answer(initialGoldenBell(1), ['an', 'binh', 'chi'])
    s = goldenBellReducer(s, { type: 'rescue' })
    expect(stillIn(s, CLASS)).toEqual(CLASS)
    expect(s.rescuesLeft).toBe(0)
    s = answer(s, ['an'])
    expect(goldenBellReducer(s, { type: 'rescue' })).toBe(s)
    // Nothing to rescue: the rescue is kept.
    const fresh = initialGoldenBell(1)
    expect(goldenBellReducer(fresh, { type: 'rescue' })).toBe(fresh)
  })

  it('ends when one student is left, even with questions remaining', () => {
    const s = answer(initialGoldenBell(0), ['an', 'binh', 'chi', 'dung'], 10)
    expect(s.finished).toBe(true)
    expect(stillIn(s, CLASS)).toEqual(['em'])
    expect(goldenBellReducer(s, { type: 'rescue' })).toBe(s)
  })

  it('ends after the last question with everyone still in as winners', () => {
    let s = initialGoldenBell(0)
    for (let i = 0; i < 3; i++) s = answer(s, i === 0 ? ['an'] : [], 3)
    expect(s.finished).toBe(true)
    expect(stillIn(s, CLASS)).toEqual(['binh', 'chi', 'dung', 'em'])
    expect(goldenBellReducer(s, { type: 'restart', rescues: 2 })).toEqual(initialGoldenBell(2))
  })

  it('reads the rescue count from the game settings', () => {
    expect(readPlaySettings({ rules: { rescue: { count: 2 } } }).rescues).toBe(2)
    expect(readPlaySettings({}, { rescues: 1 }).rescues).toBe(1)
    expect(readPlaySettings({ rules: { rescue: { count: 99 } } }).rescues).toBe(5)
  })
})

describe('Đua thuyền', () => {
  it('a boat moves one stage per right answer and stops at the finish', () => {
    let s = quizReducer(initialQuizRound(2), { type: 'pickTeam', teamId: 't-blue' })
    s = quizReducer(s, { type: 'choose', optionId: 'a', correctId: 'a', points: 1, allowSteal: true })
    expect(boatStep(s.teams[1], 5)).toBe(1)
    expect(boatStep({ ...s.teams[1], correct: 9 }, 5)).toBe(5)
    expect(arrivedTeam(s.teams, 5)).toBeNull()
    expect(arrivedTeam(s.teams.map((t, i) => (i === 1 ? { ...t, correct: 5 } : t)), 5)?.id).toBe('t-blue')
  })

  it('reads the race length from the game settings', () => {
    expect(readPlaySettings({ rules: { win: { steps: 7 } } }).raceSteps).toBe(7)
    expect(readPlaySettings({ rules: { win: { steps: 1 } } }).raceSteps).toBe(2)
  })

  it('quiz games share their questions', () => {
    expect(['QUIZ', 'GOLDEN_BELL', 'BOAT_RACE'].every((t) => isQuizFamily(t as never))).toBe(true)
    expect(isQuizFamily('MATCHING')).toBe(false)
  })
})
