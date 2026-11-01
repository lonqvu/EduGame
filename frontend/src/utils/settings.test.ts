import { describe, expect, it } from 'vitest'
import { applyGameDefaults, AUTO, fromChoice, GAME_DEFAULT_OPTIONS, hasGameDefaults, toChoice, withDefaults } from '@/utils/settings'

describe('game default choices', () => {
  it('shows a missing default as "Theo từng trò"', () => {
    expect(toChoice({}, 'teams')).toBe(AUTO)
    expect(toChoice({ teams: null }, 'teams')).toBe(AUTO)
  })

  it('shows numbers as they are and booleans as yes / no', () => {
    expect(toChoice({ teams: 3 }, 'teams')).toBe(3)
    expect(toChoice({ timeLimitSec: 0 }, 'timeLimitSec')).toBe(0)
    expect(toChoice({ allowSteal: true }, 'allowSteal')).toBe(1)
    expect(toChoice({ shuffleItems: false }, 'shuffleItems')).toBe(0)
  })

  it('stores a choice the way the server reads it', () => {
    expect(fromChoice('teams', AUTO)).toBeNull()
    expect(fromChoice('teams', 4)).toBe(4)
    expect(fromChoice('timeLimitSec', 0)).toBe(0)
    expect(fromChoice('allowSteal', 1)).toBe(true)
    expect(fromChoice('shuffleItems', 0)).toBe(false)
  })

  it('every choice goes there and back', () => {
    for (const [key, options] of Object.entries(GAME_DEFAULT_OPTIONS) as [keyof typeof GAME_DEFAULT_OPTIONS, typeof GAME_DEFAULT_OPTIONS.teams][]) {
      for (const { value } of options) {
        expect(toChoice({ [key]: fromChoice(key, value) }, key)).toBe(value)
      }
    }
  })

  it('offers only what the server accepts', () => {
    const numbers = (key: 'teams' | 'timeLimitSec') => GAME_DEFAULT_OPTIONS[key].map((o) => o.value).filter((v) => v !== AUTO)
    expect(numbers('teams').every((n) => typeof n === 'number' && n >= 2 && n <= 4)).toBe(true)
    expect(numbers('timeLimitSec').every((n) => typeof n === 'number' && n >= 0 && n <= 600)).toBe(true)
  })

  it('knows whether any default is set', () => {
    expect(hasGameDefaults({})).toBe(false)
    expect(hasGameDefaults({ teams: null, allowSteal: null })).toBe(false)
    expect(hasGameDefaults({ allowSteal: false })).toBe(true)
    expect(hasGameDefaults({ timeLimitSec: 0 })).toBe(true)
  })
})

describe('withDefaults', () => {
  it('fills every missing key', () => {
    expect(withDefaults(undefined)).toEqual({
      display: { reduceMotion: false, fullscreenOnStart: false },
      games: {},
      notifications: { newSignInEmail: true, passwordChangedEmail: true },
      sound: { enabled: true, volume: 80, music: true },
    })
    expect(withDefaults({ notifications: { newSignInEmail: false } as never }).notifications).toEqual({
      newSignInEmail: false,
      passwordChangedEmail: true,
    })
  })
})

describe('defaults for new games (a visitor\'s, as the server applies a teacher\'s)', () => {
  it('changes only the rules the game plays by', () => {
    const quiz = { timeLimitSec: 20, shuffleItems: false, rules: { participants: { teams: 2, assign: 'RANDOM' }, scoring: { allowSteal: false } } }
    expect(applyGameDefaults(quiz, { teams: 4, timeLimitSec: 45, allowSteal: true, shuffleItems: true })).toEqual({
      timeLimitSec: 45,
      shuffleItems: true,
      rules: { participants: { teams: 4, assign: 'RANDOM' }, scoring: { allowSteal: true } },
    })
  })

  it('leaves teams set by hand, and rules a game does not have', () => {
    const gridBoard = { rules: { participants: { teams: 2, assign: 'MANUAL' } } }
    expect(applyGameDefaults(gridBoard, { teams: 4, timeLimitSec: 30, allowSteal: true, shuffleItems: true })).toEqual({
      rules: { participants: { teams: 2, assign: 'MANUAL' } },
    })
  })

  it('"Theo từng trò" (null) keeps the game\'s own default', () => {
    expect(applyGameDefaults({ timeLimitSec: 20 }, { timeLimitSec: null })).toEqual({ timeLimitSec: 20 })
  })
})
