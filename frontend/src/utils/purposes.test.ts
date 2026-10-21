import { describe, expect, it } from 'vitest'
import type { GameSummary } from '@/types/game'
import { PURPOSES, purposeGame } from '@/utils/purposes'

const purpose = (key: string) => PURPOSES.find((p) => p.key === key)!
const game = (id: string, type: GameSummary['type'], itemCount = 5): GameSummary => ({ id, type, title: id, itemCount })

describe('purposeGame', () => {
  it('plays the newest game of the purpose that has something to play', () => {
    const games = [game('empty', 'QUIZ', 0), game('board', 'GRID_BOARD'), game('bell', 'GOLDEN_BELL'), game('quiz', 'QUIZ')]
    expect(purposeGame(purpose('review'), games)?.id).toBe('bell')
    expect(purposeGame(purpose('warmup'), games)?.id).toBe('board')
  })

  it('has none for a new teacher, nor for the tools, which play their fallback', () => {
    expect(purposeGame(purpose('review'), [])).toBeUndefined()
    expect(purposeGame(purpose('call'), [game('quiz', 'QUIZ')])).toBeUndefined()
  })

  it('falls back to games and tools that exist, each purpose once', () => {
    expect(new Set(PURPOSES.map((p) => p.key)).size).toBe(PURPOSES.length)
    for (const p of PURPOSES) expect(p.types.includes(p.fallback) || p.types.length === 0).toBe(true)
  })
})
