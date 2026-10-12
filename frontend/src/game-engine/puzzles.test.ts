import { describe, expect, it } from 'vitest'
import { parseBulkCrossword, parseBulkOrder, parseBulkSort } from '@/editor/parseBulkItems'
import {
  boardShape,
  crosswordReducer,
  initialCrossword,
  keywordValue,
  playableRows,
  rowsLeft,
  type CrosswordState,
} from '@/game-engine/crossword/crosswordRound'
import { answerLetters, keywordOf } from '@/game-engine/crossword/letters'
import { initialOrdering, isSetDone, orderingReducer, playableOrderSets } from '@/game-engine/ordering/orderingRound'
import { initialSorting, playableSortSets, sortingReducer } from '@/game-engine/sorting/sortingRound'
import type { GameItemResponse } from '@/types/api'
import type { CrosswordRow, OrderSet, SortSet } from '@/types/game'
import { itemCodec, toCreateRequest } from '@/utils/gameItems'

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

const response = (patch: Partial<GameItemResponse>): GameItemResponse => ({ id: 7, itemType: 'X', position: 0, content: {}, ...patch })

describe('Ô chữ bí mật', () => {
  const rows: CrosswordRow[] = [
    { id: '1', clue: 'Cây gì?', answer: 'Cây tre', keyIndex: 3 },
    { id: '2', clue: 'Mọc ở đằng Đông?', answer: 'MẶT TRỜI', keyIndex: 4 },
    { id: '3', clue: 'Chưa xong', answer: 'HOA', keyIndex: null },
    { id: '4', clue: '', answer: 'SEN', keyIndex: 0 },
    { id: '5', clue: 'Ai dạy em?', answer: 'CÔ GIÁO', keyIndex: 2 },
  ]

  it('counts letters like the backend: uppercase, NFC, spaces left out', () => {
    expect(answerLetters(' Hà  nội ')).toEqual(['H', 'À', 'N', 'Ộ', 'I'])
    expect(answerLetters('HUẾ')).toEqual(['H', 'U', 'Ế'])
  })

  it('plays only rows with a clue and a key letter inside the answer, and spells the keyword', () => {
    expect(playableRows(rows).map((r) => r.id)).toEqual(['1', '2', '5'])
    expect(keywordOf(rows)).toBe('TRG')
    expect(playableRows([{ id: 'x', clue: 'a', answer: 'AB', keyIndex: 2 }])).toEqual([])
  })

  it('lines every row up on its key letter', () => {
    const played = playableRows(rows)
    // CÂYTRE key 3 → 3 left, 2 right; MẶTTRỜI key 4 → 4 left, 2 right; CÔGIÁO key 2 → 3 right.
    expect(boardShape(played)).toEqual({ left: 4, right: 3, columns: 8 })
  })

  const mark = (s: CrosswordState, correct: boolean, allowSteal = true) =>
    crosswordReducer(s, { type: 'markRow', correct, points: 10, allowSteal })

  it('the team in turn answers a row; right scores and passes the turn', () => {
    let s = crosswordReducer(initialCrossword(3), { type: 'openRow', row: 1 })
    expect(s).toMatchObject({ current: 1, answeringTeamId: 't-orange' })
    // Another row cannot be opened meanwhile.
    expect(crosswordReducer(s, { type: 'openRow', row: 0 })).toBe(s)
    s = mark(s, true)
    expect(s).toMatchObject({ current: null, turn: 1, results: { 1: { status: 'solved', teamId: 't-orange' } } })
    expect(s.teams[0].score).toBe(10)
    expect(crosswordReducer(s, { type: 'openRow', row: 1 })).toBe(s)
  })

  it('a wrong answer lets the next teams steal; when all miss the row closes', () => {
    let s = crosswordReducer({ ...initialCrossword(3), turn: 1 }, { type: 'openRow', row: 0 })
    s = mark(s, false)
    expect(s).toMatchObject({ answeringTeamId: 't-green', triedTeams: ['t-blue'] })
    s = mark(s, false)
    expect(s.answeringTeamId).toBe('t-orange')
    s = mark(s, false)
    expect(s).toMatchObject({ current: null, results: { 0: { status: 'closed' } }, turn: 2 })
    expect(s.teams.every((t) => t.score === 0)).toBe(true)

    // No stealing: the first miss closes the row.
    const noSteal = mark(crosswordReducer(initialCrossword(2), { type: 'openRow', row: 0 }), false, false)
    expect(noSteal.results[0]).toEqual({ status: 'closed' })
  })

  it('guessing the keyword early is worth more; a wrong guess rules the team out of guessing', () => {
    expect(keywordValue(40, 4)).toBe(80)
    let s = crosswordReducer(initialCrossword(2), { type: 'startGuess' })
    s = crosswordReducer(s, { type: 'pickGuessTeam', teamId: 't-blue' })
    s = crosswordReducer(s, { type: 'markGuess', correct: false, points: 80 })
    expect(s).toMatchObject({ guessing: false, keywordOut: ['t-blue'] })
    s = crosswordReducer(s, { type: 'startGuess' })
    expect(crosswordReducer(s, { type: 'pickGuessTeam', teamId: 't-blue' }).guessTeamId).toBeNull()
    s = crosswordReducer(s, { type: 'pickGuessTeam', teamId: 't-orange' })
    s = crosswordReducer(s, { type: 'markGuess', correct: true, points: 80 })
    expect(s).toMatchObject({ keywordBy: 't-orange' })
    expect(s.teams[0].score).toBe(80)
    // The game is decided: no more rows.
    expect(crosswordReducer(s, { type: 'openRow', row: 0 })).toBe(s)
  })

  it('counts rows still hidden', () => {
    let s = mark(crosswordReducer(initialCrossword(2), { type: 'openRow', row: 0 }), true)
    s = crosswordReducer(s, { type: 'openRow', row: 2 })
    s = crosswordReducer(s, { type: 'closeRow' })
    expect(rowsLeft(s, 5)).toBe(3)
  })

  it('stores rows as clue / answer / key letter, and drops an answer whose key letter is missing', () => {
    const codec = itemCodec('CROSSWORD')!
    const row = codec.fromItem(response({ itemType: 'CROSSWORD_ROW', content: { clue: 'Cây gì?' }, solution: { answer: 'CÂY TRE', keyIndex: 3 } }))
    expect(row).toEqual({ id: '7', clue: 'Cây gì?', answer: 'CÂY TRE', keyIndex: 3 })
    expect(toCreateRequest('CROSSWORD', { clue: 'a', answer: ' HUẾ ', keyIndex: 1 } as never)).toEqual({
      itemType: 'CROSSWORD_ROW',
      content: { clue: 'a' },
      solution: { answer: 'HUẾ', keyIndex: 1 },
    })
    expect(codec.toFields({ clue: 'a', answer: 'HUẾ', keyIndex: 3 } as never).solution).toBeNull()
    expect(codec.toFields({ clue: 'a', answer: 'HUẾ', keyIndex: null } as never).solution).toBeNull()
    expect(codec.toFields({ clue: 'a', answer: 'X'.repeat(16), keyIndex: 0 } as never).solution).toBeNull()
  })

  it('reads pasted rows with the key letter in brackets', () => {
    expect(parseBulkCrossword('Mọc ở đằng Đông? = MẶT T[R]ỜI\nCó gì? = HOA\n\n = ')).toEqual([
      { clue: 'Mọc ở đằng Đông?', answer: 'MẶT TRỜI', keyIndex: 4 },
      { clue: 'Có gì?', answer: 'HOA', keyIndex: null },
    ])
  })
})

describe('Sắp xếp thứ tự', () => {
  const set: OrderSet = {
    id: 's',
    text: ' Từ bé đến lớn ',
    entries: [
      { id: 'a', text: '1' },
      { id: 'b', text: ' ' },
      { id: 'c', text: '2' },
      { id: 'd', text: '3' },
    ],
  }
  const order = ['a', 'c', 'd']

  it('deals the filled-in cards shuffled, never already in order', () => {
    for (let seed = 1; seed < 20; seed++) {
      const [played] = playableOrderSets([set], seeded(seed))
      expect(played.entries.map((e) => e.id)).toEqual(order)
      expect([...played.dealt].sort()).toEqual([...order].sort())
      expect(played.dealt).not.toEqual(order)
    }
    expect(playableOrderSets([{ id: 'x', text: '', entries: [{ id: 'a', text: 'only' }] }])).toEqual([])
  })

  const placeAll = (ids: string[]) =>
    ids.reduce((s, id) => orderingReducer(s, { type: 'place', entryId: id }), initialOrdering({ teamCount: 2, size: 3 }))

  it('cards fill the first empty slot and can be taken back', () => {
    let s = placeAll(['c', 'a'])
    expect(s.slots).toEqual(['c', 'a', null])
    expect(orderingReducer(s, { type: 'place', entryId: 'a' })).toBe(s)
    s = orderingReducer(s, { type: 'unplace', slot: 0 })
    s = orderingReducer(s, { type: 'place', entryId: 'd' })
    expect(s.slots).toEqual(['d', 'a', null])
  })

  it('a right order scores; a wrong one keeps the right cards and passes the turn', () => {
    let s = placeAll(['a', 'd', 'c'])
    s = orderingReducer(s, { type: 'check', order, points: 10, allowSteal: true })
    expect(s).toMatchObject({ slots: ['a', null, null], locked: [true, false, false], lastWrong: [1, 2], turn: 1, tries: 1 })
    // A locked card stays put.
    expect(orderingReducer(s, { type: 'unplace', slot: 0 })).toBe(s)
    s = orderingReducer(s, { type: 'place', entryId: 'c' })
    s = orderingReducer(s, { type: 'place', entryId: 'd' })
    s = orderingReducer(s, { type: 'check', order, points: 10, allowSteal: true })
    expect(s).toMatchObject({ solvedBy: 't-blue', locked: [true, true, true] })
    expect(s.teams[1].score).toBe(10)
    expect(isSetDone(s)).toBe(true)
  })

  it('shows the answer once every team has tried, or at the first miss without stealing', () => {
    let s = orderingReducer(placeAll(['d', 'c', 'a']), { type: 'check', order, points: 10, allowSteal: false })
    expect(s).toMatchObject({ revealed: true, slots: order, solvedBy: null })
    s = orderingReducer(placeAll(['d', 'c', 'a']), { type: 'check', order, points: 10, allowSteal: true })
    s = ['c', 'd', 'a'].reduce((x, id) => orderingReducer(x, { type: 'place', entryId: id }), s)
    s = orderingReducer(s, { type: 'check', order, points: 10, allowSteal: true })
    expect(s.revealed).toBe(true)
    expect(s.teams.every((t) => t.score === 0)).toBe(true)
  })

  it('checking needs every slot filled', () => {
    const s = placeAll(['a'])
    expect(orderingReducer(s, { type: 'check', order, points: 10, allowSteal: true })).toBe(s)
  })

  it('moves to the next set, then finishes', () => {
    let s = orderingReducer(placeAll(['a', 'c', 'd']), { type: 'check', order, points: 10, allowSteal: true })
    s = orderingReducer(s, { type: 'nextSet', total: 2, size: 5 })
    expect(s).toMatchObject({ setIndex: 1, slots: [null, null, null, null, null], solvedBy: null })
    expect(orderingReducer(s, { type: 'nextSet', total: 2, size: 0 }).finished).toBe(true)
  })

  it('stores the cards with their order, and reads it back in that order', () => {
    const codec = itemCodec('ORDERING')!
    expect(toCreateRequest('ORDERING', { text: 'Xếp', entries: [{ id: 'x', text: 'B' }, { id: 'y', text: 'A' }] } as never)).toEqual({
      itemType: 'ORDER_SET',
      content: { text: 'Xếp', items: [{ id: 'e1', text: 'B' }, { id: 'e2', text: 'A' }] },
      solution: { order: ['e1', 'e2'] },
    })
    const read = codec.fromItem(
      response({ content: { text: 'Xếp', items: [{ id: 'e1', text: 'A' }, { id: 'e2', text: 'B' }] }, solution: { order: ['e2', 'e1'] } }),
    ) as OrderSet
    expect(read.entries.map((e) => e.text)).toEqual(['B', 'A'])
  })

  it('reads pasted orderings', () => {
    expect(parseBulkOrder('Từ bé đến lớn = 1 | 2 | 3\nEm | đi | học\n=').map((s) => [s.text, s.entries.map((e) => e.text)])).toEqual([
      ['Từ bé đến lớn', ['1', '2', '3']],
      ['', ['Em', 'đi', 'học']],
    ])
  })
})

describe('Phân loại', () => {
  const set: SortSet = {
    id: 's',
    text: 'Ăn gì?',
    groups: [
      { id: 'g1', text: 'Ăn cỏ' },
      { id: 'g2', text: 'Ăn thịt' },
      { id: 'g3', text: ' ' },
    ],
    cards: [
      { id: 'c1', text: 'Bò', groupId: 'g1' },
      { id: 'c2', text: 'Hổ', groupId: 'g2' },
      { id: 'c3', text: 'Dê', groupId: null },
      { id: 'c4', text: 'Ma', groupId: 'g3' },
      { id: 'c5', text: 'Thỏ', groupId: 'g1' },
    ],
  }

  it('plays named groups and cards that have a group', () => {
    const [played] = playableSortSets([set], seeded(2))
    expect(played.groups.map((g) => g.id)).toEqual(['g1', 'g2'])
    expect(played.cards.map((c) => c.id).sort()).toEqual(['c1', 'c2', 'c5'])
    expect(playableSortSets([{ ...set, groups: [set.groups[0]] }])).toEqual([])
  })

  it('a right basket scores, a wrong one sends the card to the bottom; the turn passes every time', () => {
    let s = initialSorting({ teamCount: 2, deck: ['c1', 'c2', 'c5'] })
    s = sortingReducer(s, { type: 'drop', groupId: 'g2', rightGroupId: 'g1', points: 10 })
    expect(s).toMatchObject({ deck: ['c2', 'c5', 'c1'], turn: 1, lastWrong: { cardId: 'c1', groupId: 'g2' } })
    // Nothing happens while the wrong drop is shown.
    expect(sortingReducer(s, { type: 'drop', groupId: 'g2', rightGroupId: 'g2', points: 10 })).toBe(s)
    s = sortingReducer(s, { type: 'clearWrong' })
    s = sortingReducer(s, { type: 'drop', groupId: 'g2', rightGroupId: 'g2', points: 10 })
    expect(s).toMatchObject({ deck: ['c5', 'c1'], turn: 0, sorted: { c2: 't-blue' } })
    expect(s.teams[1].score).toBe(10)
  })

  it('a whole set: every card ends in its basket', () => {
    const groupOf: Record<string, string> = { c1: 'g1', c2: 'g2', c5: 'g1' }
    const random = seeded(4)
    let s = initialSorting({ teamCount: 3, deck: ['c1', 'c2', 'c5'] })
    for (let i = 0; i < 100 && s.deck.length; i++) {
      const right = groupOf[s.deck[0]]
      s = sortingReducer(s, { type: 'drop', groupId: random() < 0.5 ? right : 'g9', rightGroupId: right, points: 10 })
      s = sortingReducer(s, { type: 'clearWrong' })
    }
    expect(Object.keys(s.sorted).sort()).toEqual(['c1', 'c2', 'c5'])
    expect(s.teams.reduce((n, t) => n + t.score, 0)).toBe(30)
    s = sortingReducer(s, { type: 'nextSet', total: 1, deck: [] })
    expect(s.finished).toBe(true)
  })

  it('stores groups and cards with renamed ids, keeping which card goes where', () => {
    const fields = itemCodec('SORTING')!.toFields(set)
    expect(fields).toEqual({
      content: {
        text: 'Ăn gì?',
        groups: [{ id: 'g1', text: 'Ăn cỏ' }, { id: 'g2', text: 'Ăn thịt' }, { id: 'g3', text: ' ' }],
        cards: set.cards.map((c, i) => ({ id: `c${i + 1}`, text: c.text })),
      },
      solution: { assign: [['c1', 'g1'], ['c2', 'g2'], ['c4', 'g3'], ['c5', 'g1']] },
    })
    const read = itemCodec('SORTING')!.fromItem(response({ content: fields.content, solution: fields.solution ?? undefined })) as SortSet
    expect(read.cards.map((c) => c.groupId)).toEqual(['g1', 'g2', null, 'g3', 'g1'])
  })

  it('reads pasted sortings, one block per set', () => {
    const sets = parseBulkSort('Con vật ăn gì?\nĂn cỏ = Bò, Dê\nĂn thịt = Hổ\n\nChẵn = 2, 4\nLẻ = 1\n\nMột nhóm = A')
    expect(sets).toHaveLength(2)
    expect(sets[0].text).toBe('Con vật ăn gì?')
    expect(sets[0].groups.map((g) => g.text)).toEqual(['Ăn cỏ', 'Ăn thịt'])
    expect(sets[0].cards.map((c) => [c.text, sets[0].groups.find((g) => g.id === c.groupId)?.text])).toEqual([
      ['Bò', 'Ăn cỏ'],
      ['Dê', 'Ăn cỏ'],
      ['Hổ', 'Ăn thịt'],
    ])
    expect(sets[1].text).toBe('')
  })
})
