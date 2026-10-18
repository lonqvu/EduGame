import { describe, expect, it } from 'vitest'
import { AUTO, fromChoice, GAME_DEFAULT_OPTIONS, hasGameDefaults, toChoice, withDefaults } from '@/utils/settings'

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
