import { describe, expect, it } from 'vitest'
import { countPlayable, gameGuide, isGuideGame } from '@/game-engine/gameGuide'
import { PLAY_DEFAULTS, readPlaySettings, writePlaySettings } from '@/game-engine/shared/gameSettings'
import { QUICK_SETTINGS } from '@/pages/game-start/quickSettings'
import type { GameType, QuizQuestion } from '@/types/game'

const quiz = (settings: Record<string, unknown>) => gameGuide('QUIZ', settings).rules.join(' | ')

describe('gameGuide', () => {
  it('writes the rules from the settings the game is played with', () => {
    const rules = quiz({ timeLimitSec: 20, rules: { participants: { teams: 3 }, scoring: { points: 5, allowSteal: true } } })
    expect(rules).toContain('Lớp chia thành 3 đội.')
    expect(rules).toContain('Mỗi câu có 20 giây để suy nghĩ.')
    expect(rules).toContain('đội được cộng 5 điểm')
    expect(rules).toContain('Các đội còn lại được giành quyền trả lời tiếp.')
  })

  it('falls back on the defaults the projector uses, and leaves out rules that are off', () => {
    expect(quiz({})).toContain('Lớp chia thành 4 đội.')
    expect(quiz({})).toContain('Mỗi câu có 30 giây')
    const noTimerNoSteal = quiz({ timeLimitSec: 0, rules: { scoring: { allowSteal: false } } })
    expect(noTimerNoSteal).not.toContain('giây')
    expect(noTimerNoSteal).not.toContain('giành quyền trả lời tiếp')
    expect(noTimerNoSteal).toContain('Cô sẽ công bố đáp án đúng.')
  })

  it('explains each game its own way', () => {
    expect(gameGuide('BOAT_RACE', { rules: { win: { steps: 7 } } }).rules.join(' ')).toContain('7 chặng')
    expect(gameGuide('GOLDEN_BELL', { rules: { rescue: { count: 2 } } }).rules.join(' ')).toContain('2 lần cứu trợ')
    expect(gameGuide('GOLDEN_BELL', { rules: { rescue: { count: 0 } } }).rules.join(' ')).not.toContain('cứu trợ')
    expect(gameGuide('CROSSWORD', { rules: { scoring: { keywordPoints: 60 } } }).rules.join(' ')).toContain('được 60 điểm')
    expect(gameGuide('GRID_BOARD', {}).rules[0]).toBe('Lớp chia thành 4 đội: Cam, Biển, Lá, Tím.')
  })

  it('gives every game a goal, rules, four steps and who wins', () => {
    for (const type of ['GRID_BOARD', ...Object.keys(PLAY_DEFAULTS)] as GameType[]) {
      if (!isGuideGame(type)) throw new Error(type)
      const guide = gameGuide(type, {})
      expect(guide.goal).not.toBe('')
      expect(guide.rules.length).toBeGreaterThan(2)
      expect(guide.steps).toHaveLength(4)
      expect(guide.winner).not.toBe('')
    }
  })

  it('has no guide for the tools', () => {
    expect(isGuideGame('SPIN_WHEEL')).toBe(false)
    expect(isGuideGame('DICE')).toBe(false)
    expect(isGuideGame('GRID_BOARD')).toBe(true)
  })
})

describe('countPlayable', () => {
  it('leaves out half-written questions', () => {
    const question = (id: string, text: string, correctId: string): QuizQuestion => ({
      id,
      trueFalse: false,
      text,
      options: [
        { id: 'a', text: '1' },
        { id: 'b', text: '2' },
      ],
      correctId,
    })
    expect(countPlayable('QUIZ', [question('1', '1 + 1 = ?', 'b'), question('2', '', 'a'), question('3', '2 - 1 = ?', '')])).toBe(1)
  })
})

describe('writePlaySettings', () => {
  it('changes the rule where readPlaySettings reads it and keeps the rest', () => {
    const before = { readAloud: false, rules: { turn: { type: 'BUZZER' }, scoring: { type: 'FIXED', points: 10, allowSteal: true } } }
    const after = writePlaySettings(before, { points: 20, teams: 3, timeLimitSec: 45, rescues: 2 })
    expect(readPlaySettings(after)).toMatchObject({ points: 20, teams: 3, timeLimitSec: 45, rescues: 2, allowSteal: true })
    expect(after).toMatchObject({ readAloud: false, rules: { turn: { type: 'BUZZER' }, scoring: { type: 'FIXED' } } })
    // The original is not touched.
    expect(before.rules.scoring.points).toBe(10)
  })

  it('only offers quick settings the game reads', () => {
    for (const [type, settings] of Object.entries(QUICK_SETTINGS)) {
      if (type === 'GRID_BOARD') continue
      const defaults = PLAY_DEFAULTS[type as keyof typeof PLAY_DEFAULTS]
      for (const s of settings) {
        // A rule the projector reads either has a default for this game or is one of the shared shuffles.
        expect(s.key in defaults || s.key === 'shuffleItems', `${type}.${s.key}`).toBe(true)
      }
    }
  })
})
