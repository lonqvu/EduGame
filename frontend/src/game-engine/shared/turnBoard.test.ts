import { describe, expect, it } from 'vitest'
import { initialTurnBoard, turnBoardReducer, turnTeam, type TurnBoardAction, type TurnBoardState } from '@/game-engine/shared/turnBoard'

const play = (state: TurnBoardState, ...actions: TurnBoardAction[]) => actions.reduce(turnBoardReducer, state)
const choose = (optionId: string, allowSteal = true): TurnBoardAction => ({ type: 'choose', optionId, correctId: 'b', allowSteal })

describe('turnBoardReducer', () => {
  it('gives the cell to the team whose turn it is, and the points of the cell to a right answer', () => {
    const s = play(initialTurnBoard({ teamCount: 3, cells: 2 }), { type: 'open', cell: 1, points: 20 }, choose('b'))
    expect(s.teams.map((t) => t.score)).toEqual([20, 0, 0])
    expect(s.revealed).toBe(true)
    const next = play(s, { type: 'close' })
    expect(next.done).toEqual([false, true])
    expect(turnTeam(next).id).toBe(next.teams[1].id)
    expect(next.finished).toBe(false)
  })

  it('lets another team steal after a wrong answer, or shows the answer when stealing is off', () => {
    const opened = play(initialTurnBoard({ teamCount: 2, cells: 1 }), { type: 'open', cell: 0, points: 10 }, choose('a'))
    expect(opened.revealed).toBe(false)
    expect(opened.answeringTeamId).toBeNull()
    const stolen = play(opened, { type: 'pickTeam', teamId: opened.teams[0].id }, { type: 'pickTeam', teamId: opened.teams[1].id }, choose('b'))
    expect(stolen.answeringTeamId).toBeNull()
    expect(stolen.teams.map((t) => t.score)).toEqual([0, 10])

    const noSteal = play(initialTurnBoard({ teamCount: 2, cells: 1 }), { type: 'open', cell: 0, points: 10 }, choose('a', false))
    expect(noSteal.revealed).toBe(true)
  })

  it('gives a lucky cell its points at once, and ends when every cell is done', () => {
    let s = play(initialTurnBoard({ teamCount: 2, cells: 2 }), { type: 'open', cell: 0, points: 30, lucky: true })
    expect(s.lucky).toBe(true)
    expect(s.teams[0].score).toBe(30)
    s = play(s, { type: 'close' }, { type: 'open', cell: 0, points: 10 })
    expect(s.current).toBeNull()
    s = play(s, { type: 'open', cell: 1, points: 10 }, { type: 'reveal' }, { type: 'close' })
    expect(s.finished).toBe(true)
    expect(s.teams.map((t) => t.score)).toEqual([30, 0])
  })

  it('waits for the teacher to end the game when told not to end by itself', () => {
    const s = play(initialTurnBoard({ teamCount: 2, cells: 1, autoFinish: false }), { type: 'open', cell: 0, points: 10 }, { type: 'reveal' }, { type: 'close' })
    expect(s.done).toEqual([true])
    expect(s.finished).toBe(false)
  })

  it('skips a turn between cells only, and awards bonus points to any team', () => {
    let s = play(initialTurnBoard({ teamCount: 3, cells: 2 }), { type: 'skipTurn' })
    expect(s.turn).toBe(1)
    s = play(s, { type: 'open', cell: 0, points: 10 }, { type: 'skipTurn' }, { type: 'award', teamId: s.teams[2].id, points: 40 })
    expect(s.turn).toBe(1)
    expect(s.teams[2].score).toBe(40)
  })
})
