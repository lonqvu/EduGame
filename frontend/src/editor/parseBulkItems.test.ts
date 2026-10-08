import { describe, expect, it } from 'vitest'
import { parseBulkPairs, parseBulkQuiz } from '@/editor/parseBulkItems'
import { parseBulkQuestions } from '@/editor/parseBulkQuestions'

describe('parseBulkQuiz', () => {
  it('puts the right answer first and the wrong ones after', () => {
    expect(parseBulkQuiz('Thủ đô của Việt Nam? = Hà Nội | Huế | Đà Nẵng')).toEqual([
      {
        trueFalse: false,
        text: 'Thủ đô của Việt Nam?',
        options: [{ id: 'a', text: 'Hà Nội' }, { id: 'b', text: 'Huế' }, { id: 'c', text: 'Đà Nẵng' }],
        correctId: 'a',
      },
    ])
  })

  it('keeps "=" inside the question', () => {
    expect(parseBulkQuiz('5 + 3 = ? = 8 | 7')[0]).toMatchObject({ text: '5 + 3 = ?', correctId: 'a' })
    expect(parseBulkQuiz('25 + 13 = ?')[0]).toMatchObject({ text: '25 + 13 = ?', correctId: null })
  })

  it('makes true / false questions from "Đúng" / "Sai"', () => {
    const [yes, no] = parseBulkQuiz('Mặt trời mọc ở đằng Đông = Đúng\nCá sống trên cây = sai')
    expect(yes).toMatchObject({ trueFalse: true, correctId: 'true' })
    expect(no).toMatchObject({ trueFalse: true, correctId: 'false' })
  })

  it('pads a single answer with empty options and caps at six', () => {
    expect(parseBulkQuiz('Q = A')[0].options.map((o) => o.text)).toEqual(['A', '', '', ''])
    expect(parseBulkQuiz('Q = 1|2|3|4|5|6|7|8')[0].options).toHaveLength(6)
  })

  it('skips blank lines and lines without a question', () => {
    expect(parseBulkQuiz('\n   \n= A | B\n')).toEqual([])
  })
})

describe('parseBulkPairs', () => {
  it('splits each line into a pair, at the last "="', () => {
    const [set] = parseBulkPairs('Hà Nội = Hồ Gươm\n3 x 4 = 12\nChỉ một vế')
    expect(set.pairs.map((p) => [p.a, p.b])).toEqual([
      ['Hà Nội', 'Hồ Gươm'],
      ['3 x 4', '12'],
      ['Chỉ một vế', ''],
    ])
    expect(new Set(set.pairs.map((p) => p.id)).size).toBe(3)
  })

  it('groups at most 12 pairs per set', () => {
    const text = Array.from({ length: 25 }, (_, i) => `${i} = ${i * 2}`).join('\n')
    expect(parseBulkPairs(text).map((s) => s.pairs.length)).toEqual([12, 12, 1])
  })

  it('returns nothing for empty input', () => {
    expect(parseBulkPairs('  \n ')).toEqual([])
  })
})

describe('parseBulkQuestions (grid board)', () => {
  it('reads question = answer', () => {
    expect(parseBulkQuestions('Con gì kêu meo meo? = Con mèo\n25 + 13 = ? = 38', 20)).toEqual([
      { text: 'Con gì kêu meo meo?', answer: 'Con mèo', points: 20 },
      { text: '25 + 13 = ?', answer: '38', points: 20 },
    ])
  })
})
