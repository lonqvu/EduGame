import { beforeEach, describe, expect, it } from 'vitest'
import { podiumHeight, podiumOrder, rankTeams } from '@/game-engine/grid-board/ranking'
import { initialMatchingRound, isMatch, matchingReducer, playableMatchingSets } from '@/game-engine/matching/matchingRound'
import { initialMemoryRound, isShowingMiss, memoryReducer, playableMemorySets } from '@/game-engine/memory/memoryRound'
import { initialQuizRound, playableQuizQuestions, quizReducer } from '@/game-engine/quiz/quizRound'
import { freshTeams } from '@/game-engine/shared/teamScore'
import { useGridBoardStore } from '@/store/gridBoardStore'
import type { PairSet, QuizQuestion } from '@/types/game'

/** Deterministic "random" numbers, so every simulated class plays the same way on every run. */
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

const pick = <T,>(items: T[], random: () => number) => items[Math.floor(random() * items.length)]
const totalScore = (teams: { score: number }[]) => teams.reduce((sum, t) => sum + t.score, 0)
const totalCorrect = (teams: { correct: number }[]) => teams.reduce((sum, t) => sum + t.correct, 0)

describe('grid board store ("Lật ô thi đua")', () => {
  const store = useGridBoardStore
  beforeEach(() => store.getState().ensureRound(`game-${Math.random()}`))

  it('scores a right answer, opens the tile and passes the turn', () => {
    const [orange, blue] = store.getState().teams
    store.getState().answer(3, orange.id, true, 20)
    expect(store.getState()).toMatchObject({ openedTiles: [3], turn: 1 })
    expect(store.getState().teams[0]).toMatchObject({ score: 20, correct: 1, streak: 1 })

    // A wrong answer leaves the tile closed and ends the streak.
    store.getState().answer(5, blue.id, false, 10)
    expect(store.getState()).toMatchObject({ openedTiles: [3], turn: 2 })
    expect(store.getState().teams[1]).toMatchObject({ score: 0, streak: 0 })
  })

  it('turns wrap around after the last team', () => {
    const teams = store.getState().teams
    teams.forEach((t, i) => store.getState().answer(i + 1, t.id, false, 10))
    expect(store.getState().turn).toBe(0)
  })

  it('ignores a second answer for a tile already won (double click)', () => {
    const [orange, blue] = store.getState().teams
    store.getState().answer(1, orange.id, true, 10)
    const after = store.getState()
    store.getState().answer(1, orange.id, true, 10)
    store.getState().answer(1, blue.id, true, 10)
    store.getState().answer(2, 'no-such-team', true, 10)
    expect(store.getState()).toBe(after)
    expect(totalScore(store.getState().teams)).toBe(10)
  })

  it('undo steps back one answer at a time, and does nothing with no history', () => {
    const before = store.getState()
    store.getState().undo()
    expect(store.getState().teams).toBe(before.teams)

    const [orange, blue] = store.getState().teams
    store.getState().answer(1, orange.id, true, 10)
    store.getState().answer(2, blue.id, true, 30)
    store.getState().undo()
    expect(store.getState()).toMatchObject({ openedTiles: [1], turn: 1 })
    expect(totalScore(store.getState().teams)).toBe(10)
    store.getState().undo()
    expect(store.getState()).toMatchObject({ openedTiles: [], turn: 0, history: [] })
    expect(store.getState().teams).toEqual(freshTeams())
  })

  it('keeps a running round when the same game is opened again, and starts fresh for another game', () => {
    store.getState().ensureRound('g-addition')
    store.getState().answer(4, store.getState().teams[0].id, true, 10)
    store.getState().ensureRound('g-addition')
    expect(store.getState().openedTiles).toEqual([4])
    store.getState().ensureRound('g-other')
    expect(store.getState()).toMatchObject({ gameId: 'g-other', openedTiles: [], turn: 0 })
    store.getState().answer(1, store.getState().teams[0].id, true, 10)
    store.getState().restart()
    expect(store.getState()).toMatchObject({ gameId: 'g-other', openedTiles: [], history: [] })
  })

  it('a whole board of 24 tiles: every tile opens once and the points add up', () => {
    const random = seeded(9)
    const points = (tile: number) => (tile % 3 === 0 ? 20 : 10)
    let expected = 0
    let answers = 0
    while (store.getState().openedTiles.length < 24) {
      const { teams, turn, openedTiles } = store.getState()
      const closed = Array.from({ length: 24 }, (_, i) => i + 1).filter((n) => !openedTiles.includes(n))
      const tile = pick(closed, random)
      const correct = random() < 0.6
      if (correct) expected += points(tile)
      store.getState().answer(tile, teams[turn].id, correct, points(tile))
      answers++
    }
    const { teams, openedTiles, history } = store.getState()
    expect(new Set(openedTiles).size).toBe(24)
    expect(totalScore(teams)).toBe(expected)
    expect(totalCorrect(teams)).toBe(24)
    expect(history).toHaveLength(answers)
    const ranked = rankTeams(teams)
    expect(ranked[0].score).toBe(Math.max(...teams.map((t) => t.score)))
    expect(podiumOrder(ranked)[1]).toBe(ranked[0])
    for (const t of ranked) expect(podiumHeight(t.rank)).toBeGreaterThan(0)
  })
})

describe('a whole quiz game', () => {
  const questions: QuizQuestion[] = Array.from({ length: 12 }, (_, i) => ({
    id: `q${i}`,
    trueFalse: i % 4 === 0,
    text: `Câu ${i + 1}`,
    options:
      i % 4 === 0
        ? [{ id: 'true', text: 'Đúng' }, { id: 'false', text: 'Sai' }]
        : [{ id: 'a', text: '1' }, { id: 'b', text: '2' }, { id: 'c', text: '3' }, { id: 'd', text: '4' }],
    correctId: i % 4 === 0 ? 'false' : 'c',
  }))

  for (const [teamCount, allowSteal, seed] of [[2, true, 1], [3, false, 2], [4, true, 3], [4, false, 4]] as const) {
    it(`${teamCount} teams, stealing ${allowSteal ? 'on' : 'off'}: ends after the last question with consistent scores`, () => {
      const random = seeded(seed)
      const playable = playableQuizQuestions(questions, { shuffleItems: true, random })
      expect(playable).toHaveLength(12)
      let s = initialQuizRound(teamCount)
      let rightAnswers = 0
      for (let step = 0; step < 500 && !s.finished; step++) {
        const q = playable[s.index]
        if (s.revealed) {
          s = quizReducer(s, { type: 'next', total: playable.length })
          continue
        }
        const free = s.teams.filter((t) => !s.triedTeams.includes(t.id))
        s = quizReducer(s, { type: 'pickTeam', teamId: pick(free, random).id })
        const untried = q.options.filter((o) => !(o.id in s.tried))
        const option = pick(untried, random)
        if (option.id === q.correctId) rightAnswers++
        s = quizReducer(s, { type: 'choose', optionId: option.id, correctId: q.correctId, points: 10, allowSteal })
        expect(s.answeringTeamId).toBeNull()
      }
      expect(s.finished).toBe(true)
      expect(totalCorrect(s.teams)).toBe(rightAnswers)
      expect(totalScore(s.teams)).toBe(rightAnswers * 10)
      for (const t of s.teams) expect(t.bestStreak).toBeLessThanOrEqual(t.correct)
    })
  }
})

describe('a whole matching game', () => {
  const sets: PairSet[] = [
    { id: 's1', pairs: Array.from({ length: 12 }, (_, i) => ({ id: `a${i}`, a: `${i} + ${i}`, b: `${i * 2}` })) },
    // Two pairs share an answer: either right entry counts.
    { id: 's2', pairs: [{ id: 'b1', a: '2 + 2', b: '4' }, { id: 'b2', a: '3 + 1', b: '4' }, { id: 'b3', a: '1 + 1', b: '2' }] },
    { id: 'skip', pairs: [{ id: 'c1', a: 'only one', b: 'pair' }] },
  ]

  it('every left entry ends up matched once and the turn rotates on every attempt', () => {
    const random = seeded(21)
    const playable = playableMatchingSets(sets, random)
    expect(playable.map((p) => p.id)).toEqual(['s1', 's2'])
    let s = initialMatchingRound(3)
    let attempts = 0
    for (const set of playable) {
      while (Object.keys(s.matched).length < set.pairs.length) {
        const lefts = set.pairs.map((p) => p.id).filter((id) => !(id in s.matched))
        const rights = set.rightOrder.filter((id) => !Object.values(s.matched).some((m) => m.rightId === id))
        const leftId = pick(lefts, random)
        const rightId = pick(rights, random)
        const turnBefore = s.turn
        s = matchingReducer(s, { type: 'attempt', leftId, rightId, correct: isMatch(set, leftId, rightId), points: 10 })
        s = matchingReducer(s, { type: 'clearWrong' })
        attempts++
        expect(s.turn).toBe((turnBefore + 1) % 3)
        expect(attempts).toBeLessThan(2000)
      }
      const used = Object.values(s.matched).map((m) => m.rightId)
      expect(new Set(used).size).toBe(set.pairs.length)
      s = matchingReducer(s, { type: 'nextSet', total: playable.length })
    }
    expect(s.finished).toBe(true)
    expect(totalCorrect(s.teams)).toBe(15)
    expect(totalScore(s.teams)).toBe(150)
  })
})

describe('a whole memory game', () => {
  const sets: PairSet[] = [
    { id: 'm1', pairs: Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, a: `Con ${i}`, b: `Tiếng ${i}` })) },
    { id: 'm2', pairs: [{ id: 'x1', a: 'Mèo', b: 'Meo' }, { id: 'x2', a: 'Chó', b: 'Gâu' }] },
  ]

  it('teams with a poor memory still find every pair, and a pair keeps the turn', () => {
    const random = seeded(33)
    const playable = playableMemorySets(sets, random)
    let s = initialMemoryRound(2)
    for (const set of playable) {
      expect(set.cards).toHaveLength(set.id === 'm1' ? 24 : 4)
      for (let step = 0; Object.keys(s.matched).length < set.cards.length; step++) {
        expect(step).toBeLessThan(5000)
        if (isShowingMiss(s)) {
          const turn = s.turn
          s = memoryReducer(s, { type: 'hide' })
          expect(s.turn).toBe((turn + 1) % 2)
          continue
        }
        const hidden = set.cards.filter((c) => !(c.key in s.matched) && !s.faceUp.includes(c.key))
        const turn = s.turn
        const found = Object.keys(s.matched).length
        s = memoryReducer(s, { type: 'flip', card: pick(hidden, random), deck: set.cards, points: 5 })
        if (Object.keys(s.matched).length > found) expect(s.turn).toBe(turn)
      }
      s = memoryReducer(s, { type: 'nextSet', total: playable.length })
    }
    expect(s.finished).toBe(true)
    expect(totalCorrect(s.teams)).toBe(14)
    expect(totalScore(s.teams)).toBe(70)
  })

  it('"Kết thúc" ends early and "Chơi lại" starts clean', () => {
    let s = memoryReducer(initialMemoryRound(3), { type: 'finish' })
    expect(s.finished).toBe(true)
    s = memoryReducer(s, { type: 'restart', teamCount: 3 })
    expect(s).toEqual(initialMemoryRound(3))
  })
})
