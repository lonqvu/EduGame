import { describe, expect, it } from 'vitest'
import { freshTeams, award } from '@/game-engine/shared/teamScore'
import { pullWinner, ropePosition } from '@/game-engine/tug-of-war/tugOfWar'

describe('the rope', () => {
  it('moves toward the team with more right answers and stops at its line', () => {
    let teams = freshTeams(2)
    teams = award(award(award(teams, teams[0].id, 1), teams[0].id, 1), teams[1].id, 1)
    expect(ropePosition(teams, 4)).toBe(1)
    expect(pullWinner(teams, 4)).toBeNull()
    for (let i = 0; i < 5; i++) teams = award(teams, teams[1].id, 1)
    expect(ropePosition(teams, 4)).toBe(-4)
    expect(pullWinner(teams, 4)?.id).toBe(teams[1].id)
  })
})
