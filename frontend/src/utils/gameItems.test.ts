import { describe, expect, it } from 'vitest'
import type { GameItemResponse } from '@/types/api'
import type { PairSet, QuizQuestion } from '@/types/game'
import { emptyQuizQuestion, itemCodec, nextOptionId, toCreateRequest } from '@/utils/gameItems'

const response = (itemType: string, content: Record<string, unknown>, solution?: Record<string, unknown>): GameItemResponse => ({
  id: 7,
  itemType,
  position: 0,
  content,
  solution,
})

describe('quiz codec', () => {
  const codec = itemCodec('QUIZ')!

  it('reads a stored single choice question', () => {
    const q = codec.fromItem(
      response('SINGLE_CHOICE', { text: '5 + 3 = ?', options: [{ id: 'a', text: '7' }, { id: 'b', text: '8' }] }, { correct: ['b'] }),
    ) as QuizQuestion
    expect(q).toEqual({
      id: '7',
      trueFalse: false,
      text: '5 + 3 = ?',
      imageUrl: undefined,
      options: [{ id: 'a', text: '7' }, { id: 'b', text: '8' }],
      correctId: 'b',
    })
  })

  it('drops a right answer that is not an option, and survives malformed content', () => {
    const q = codec.fromItem(response('TRUE_FALSE', { text: 3, options: 'nope' }, { correct: ['x'] })) as QuizQuestion
    expect(q).toMatchObject({ trueFalse: true, text: '', options: [], correctId: null })
  })

  it('writes the shape the backend validates, without a solution until an answer is picked', () => {
    const draft = { ...emptyQuizQuestion(), text: 'Thủ đô?', imageUrl: 'blob:local-preview' }
    expect(toCreateRequest('QUIZ', draft)).toEqual({
      itemType: 'SINGLE_CHOICE',
      content: { text: 'Thủ đô?', options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' })) },
      solution: null,
    })
    expect(toCreateRequest('QUIZ', { ...emptyQuizQuestion(true), correctId: 'false' })).toMatchObject({
      itemType: 'TRUE_FALSE',
      content: { options: [{ id: 'true', text: 'Đúng' }, { id: 'false', text: 'Sai' }] },
      solution: { correct: ['false'] },
    })
  })

  it('does not send a right answer whose option was deleted', () => {
    const draft = { ...emptyQuizQuestion(), options: [{ id: 'a', text: '1' }, { id: 'c', text: '2' }], correctId: 'b' }
    expect(codec.toFields(draft).solution).toBeNull()
  })

  it('round-trips through the backend shape', () => {
    const original: QuizQuestion = {
      id: '7',
      trueFalse: false,
      text: 'Q',
      imageUrl: 'https://cdn/x.png',
      options: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }, { id: 'c', text: '3' }],
      correctId: 'c',
    }
    const fields = codec.toFields(original)
    expect(codec.fromItem(response('SINGLE_CHOICE', fields.content, fields.solution ?? undefined))).toEqual(original)
  })

  it('picks the next free option id', () => {
    expect(nextOptionId([{ id: 'a', text: '' }, { id: 'c', text: '' }])).toBe('b')
  })
})

describe('matching codec', () => {
  const codec = itemCodec('MATCHING')!

  it('joins left and right by the stored pairs, keeping entries without a partner', () => {
    const set = codec.fromItem(
      response(
        'PAIR_SET',
        {
          left: [{ id: 'l1', text: 'Hà Nội' }, { id: 'l2', text: 'Huế' }, { id: 'l3', text: 'Lẻ' }],
          right: [{ id: 'r2', text: 'Sông Hương' }, { id: 'r1', text: 'Hồ Gươm' }],
        },
        { pairs: [['l1', 'r1'], ['l2', 'r2']] },
      ),
    ) as PairSet
    expect(set.pairs.map((p) => [p.a, p.b])).toEqual([
      ['Hà Nội', 'Hồ Gươm'],
      ['Huế', 'Sông Hương'],
      ['Lẻ', ''],
    ])
  })

  it('writes left / right columns with matching pairs', () => {
    const fields = codec.toFields({ pairs: [{ id: 'x', a: 'A', b: 'B' }, { id: 'y', a: 'C', b: '' }] })
    expect(fields).toEqual({
      content: { left: [{ id: 'l1', text: 'A' }, { id: 'l2', text: 'C' }], right: [{ id: 'r1', text: 'B' }, { id: 'r2', text: '' }] },
      solution: { pairs: [['l1', 'r1'], ['l2', 'r2']] },
    })
  })

  it('gives an empty stored set one blank pair to type into', () => {
    const set = codec.fromItem(response('PAIR_SET', { left: [], right: [] })) as PairSet
    expect(set.pairs).toHaveLength(1)
    expect(set.pairs[0]).toMatchObject({ a: '', b: '' })
  })
})

describe('memory codec', () => {
  const codec = itemCodec('MEMORY')!

  it('reads the seeded layout (all first cards, then all second cards)', () => {
    const set = codec.fromItem(
      response(
        'CARD_SET',
        { cards: [{ id: 'a1', text: 'Mèo' }, { id: 'a2', text: 'Chó' }, { id: 'b1', text: 'Meo meo' }, { id: 'b2', text: 'Gâu gâu' }] },
        { pairs: [['a1', 'b1'], ['a2', 'b2']] },
      ),
    ) as PairSet
    expect(set.pairs.map((p) => [p.a, p.b])).toEqual([
      ['Mèo', 'Meo meo'],
      ['Chó', 'Gâu gâu'],
    ])
  })

  it('round-trips', () => {
    const draft = { pairs: [{ id: 'p', a: '3 x 4', b: '12' }, { id: 'q', a: '5 x 5', b: '25' }] }
    const fields = codec.toFields(draft)
    expect(fields.content.cards).toHaveLength(4)
    const back = codec.fromItem(response('CARD_SET', fields.content, fields.solution ?? undefined)) as PairSet
    expect(back.pairs.map((p) => [p.a, p.b])).toEqual([
      ['3 x 4', '12'],
      ['5 x 5', '25'],
    ])
  })
})

describe('itemCodec', () => {
  it('has no codec for the class-list tools', () => {
    expect(itemCodec('SPIN_WHEEL')).toBeNull()
    expect(itemCodec('NAME_RACE')).toBeNull()
  })
})
