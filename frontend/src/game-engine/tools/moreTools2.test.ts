import { describe, expect, it } from 'vitest'
import { arrangeSeats, drawCard, formatStopwatch, MAX_CARDS, parseCards, swapSeats } from '@/game-engine/tools/moreTools2'

describe('formatStopwatch', () => {
  it('shows minutes, seconds and tenths, hours past an hour', () => {
    expect(formatStopwatch(0)).toBe('00:00.0')
    expect(formatStopwatch(83_450)).toBe('01:23.4')
    expect(formatStopwatch(3_723_900)).toBe('1:02:03.9')
    expect(formatStopwatch(-5)).toBe('00:00.0')
  })
})

describe('Bốc thăm', () => {
  it('makes one card per line, without blanks or repeats', () => {
    expect(parseCards('  Chủ đề 1 \n\nchủ đề 1\nChủ   đề 2\n')).toEqual(['Chủ đề 1', 'Chủ đề 2'])
    expect(parseCards(Array.from({ length: 80 }, (_, i) => `Lá ${i}`).join('\n'))).toHaveLength(MAX_CARDS)
  })

  it('draws the cards not drawn yet, none when all are', () => {
    expect(drawCard(['a', 'b'], ['a'])).toBe('b')
    expect(drawCard(['a'], ['a'])).toBeNull()
  })
})

describe('Sơ đồ chỗ ngồi', () => {
  it('seats every student once, and swaps two seats', () => {
    const plan = arrangeSeats(['An', 'Bình', 'Chi', 'Dũng'])
    expect([...plan].sort()).toEqual(['An', 'Bình', 'Chi', 'Dũng'])
    expect(swapSeats(['An', 'Bình', 'Chi'], 0, 2)).toEqual(['Chi', 'Bình', 'An'])
    expect(swapSeats(['An'], 0, 5)).toEqual(['An'])
  })
})
