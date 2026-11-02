import { describe, expect, it } from 'vitest'
import type { GuideGameType } from '@/game-engine/gameGuide'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { enGuide } from '@/i18n/guides/en'
import { viGuide } from '@/i18n/guides/vi'

const VIETNAMESE = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i
const GAMES = ['GRID_BOARD', ...Object.keys(PLAY_DEFAULTS)] as GuideGameType[]
const TEAMS = ['A', 'B', 'C', 'D']

/** Settings that turn every optional rule on, and off. */
const VARIANTS = [
  { allowSteal: true, luckyStars: 2, rescues: 1, timeLimitSec: 30 },
  { allowSteal: false, luckyStars: 0, rescues: 0, timeLimitSec: 0 },
]

describe('the game rules', () => {
  it('say the same in English as in Vietnamese: as many rules, the same steps and notes', () => {
    for (const type of GAMES) {
      for (const variant of VARIANTS) {
        const s = readPlaySettings(variant, type === 'GRID_BOARD' ? {} : PLAY_DEFAULTS[type])
        const vi = viGuide(type, s, TEAMS)
        const en = enGuide(type, s, TEAMS)
        expect(en.rules.length, type).toBe(vi.rules.length)
        expect(en.steps.length, type).toBe(vi.steps.length)
        expect(en.teacherNotes.length, type).toBe(vi.teacherNotes.length)
        // The numbers of the settings are said in both.
        expect(`${en.rules.join(' ')} ${en.winner}`.match(/\d+/g)?.sort(), type).toEqual(`${vi.rules.join(' ')} ${vi.winner}`.match(/\d+/g)?.sort())
      }
    }
  })

  it('leave no Vietnamese in English (but the letters of the Vietnamese alphabet Đoán chữ explains)', () => {
    for (const type of GAMES) {
      const en = enGuide(type, readPlaySettings({}, type === 'GRID_BOARD' ? {} : PLAY_DEFAULTS[type]), TEAMS)
      const text = [en.goal, ...en.rules, ...en.steps.flatMap((s) => [s.title, s.text]), en.winner, ...en.teacherNotes]
        .join(' ')
        .replace(/Ò, Ó, Ỏ, Õ, Ọ|Ô|Ơ/g, '')
      expect(text, type).not.toMatch(VIETNAMESE)
    }
  })
})
