import { describe, expect, it } from 'vitest'
import { drawNumber, flipCoin, MAX_NUMBER, noiseLevel, noiseScore } from '@/game-engine/tools/classTools'
import { addPoints, leaders, restoreTeams, scoreboardTeams } from '@/game-engine/tools/scoreboard'

describe('flipCoin', () => {
  it('lands on either side', () => {
    expect(flipCoin(() => 0.2)).toBe('HEADS')
    expect(flipCoin(() => 0.7)).toBe('TAILS')
  })
})

describe('drawNumber', () => {
  it('draws inside the range, bounds in either order', () => {
    expect(drawNumber(1, 30, [], () => 0)).toBe(1)
    expect(drawNumber(30, 1, [], () => 0.9999)).toBe(30)
    expect(drawNumber(5, 5)).toBe(5)
  })

  it('never draws a number twice, and says when the range is used up', () => {
    expect(drawNumber(1, 3, [1, 3], () => 0.9)).toBe(2)
    expect(drawNumber(1, 3, [1, 2, 3])).toBeNull()
  })

  it('keeps the range sensible', () => {
    expect(drawNumber(-5, -1)).toBe(0)
    expect(drawNumber(1, 5000, [], () => 0.9999)).toBe(MAX_NUMBER)
  })
})

describe('noise', () => {
  it('maps the microphone level to 0-100 and to quiet / ok / loud', () => {
    expect(noiseScore(0)).toBe(0)
    expect(noiseScore(1)).toBe(100)
    expect(noiseScore(0.001)).toBe(0)
    expect(noiseScore(0.03)).toBeGreaterThan(40)
    expect(noiseLevel(30, 60)).toBe('QUIET')
    expect(noiseLevel(50, 60)).toBe('OK')
    expect(noiseLevel(61, 60)).toBe('LOUD')
  })
})

describe('scoreboard', () => {
  it('makes 2-6 teams, adds and takes points without going under 0, and finds the leaders', () => {
    expect(scoreboardTeams(1)).toHaveLength(2)
    expect(scoreboardTeams(9)).toHaveLength(6)
    let teams = scoreboardTeams(3)
    expect(leaders(teams)).toEqual([])
    teams = addPoints(addPoints(teams, 't1', 10), 't2', 10)
    teams = addPoints(teams, 't3', -5)
    expect(teams.map((t) => t.score)).toEqual([10, 10, 0])
    expect(leaders(teams)).toEqual(['t1', 't2'])
  })

  it('restores only teams that look right', () => {
    expect(restoreTeams(scoreboardTeams(4))).toHaveLength(4)
    expect(restoreTeams([{ id: 't1' }])).toBeNull()
    expect(restoreTeams('x')).toBeNull()
  })
})
