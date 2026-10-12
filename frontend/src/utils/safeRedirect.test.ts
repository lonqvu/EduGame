import { describe, expect, it } from 'vitest'
import { safeRedirect } from '@/utils/safeRedirect'

describe('safeRedirect', () => {
  it('returns to pages of this app, with their query', () => {
    expect(safeRedirect('/games/new')).toBe('/games/new')
    expect(safeRedirect('/play/g-quiz?x=1')).toBe('/play/g-quiz?x=1')
  })

  it('falls back to the home page when there is nothing usable', () => {
    expect(safeRedirect(null)).toBe('/')
    expect(safeRedirect('')).toBe('/')
    expect(safeRedirect('games')).toBe('/')
  })

  it('never leaves the site', () => {
    for (const from of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      '/\t/evil.example',
      '/\n/evil.example',
      'javascript:alert(1)',
    ]) {
      expect(safeRedirect(from), from).toBe('/')
    }
  })

  it('does not loop back to the sign-in pages', () => {
    expect(safeRedirect('/login')).toBe('/')
    expect(safeRedirect('/login?from=%2Fgames')).toBe('/')
    expect(safeRedirect('/register')).toBe('/')
    expect(safeRedirect('/forgot-password')).toBe('/')
  })
})
