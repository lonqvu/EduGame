import { describe, expect, it } from 'vitest'
import type { PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import { initialTrueFalse, statementsOf, trueFalseReducer } from '@/game-engine/true-false/trueFalseRound'

const choice: PlayableQuizQuestion = {
  id: 'c',
  trueFalse: false,
  text: '2 + 2 = ?',
  options: [
    { id: 'a', text: '3' },
    { id: 'b', text: '4' },
    { id: 'c', text: '5' },
  ],
  correctId: 'b',
}
const tf: PlayableQuizQuestion = {
  id: 't',
  trueFalse: true,
  text: 'Cá sống dưới nước.',
  options: [
    { id: 'true', text: 'Đúng' },
    { id: 'false', text: 'Sai' },
  ],
  correctId: 'true',
}

describe('statementsOf', () => {
  it('shows the right answer or a wrong one, and keeps true/false items as they are', () => {
    const [shownRight] = statementsOf([choice], () => 0.1)
    expect(shownRight).toMatchObject({ answer: '4', truth: true, rightAnswer: '4' })
    const [shownWrong] = statementsOf([choice], () => 0.9)
    expect(shownWrong.truth).toBe(false)
    expect(['3', '5']).toContain(shownWrong.answer)
    expect(statementsOf([tf])[0]).toMatchObject({ answer: null, truth: true })
  })
})

describe('trueFalseReducer', () => {
  it('scores every team that judged right when the answer is shown', () => {
    let s = initialTrueFalse(3)
    const [a, b, c] = s.teams
    s = trueFalseReducer(s, { type: 'vote', teamId: a.id, value: true })
    s = trueFalseReducer(s, { type: 'vote', teamId: b.id, value: false })
    s = trueFalseReducer(s, { type: 'vote', teamId: b.id, value: true })
    s = trueFalseReducer(s, { type: 'reveal', truth: true, points: 10 })
    expect(s.teams.map((t) => t.score)).toEqual([10, 10, 0])
    expect(trueFalseReducer(s, { type: 'vote', teamId: c.id, value: true }).votes[c.id]).toBeUndefined()
    s = trueFalseReducer(s, { type: 'next', total: 1 })
    expect(s.finished).toBe(true)
  })
})
