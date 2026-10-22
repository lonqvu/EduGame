import type { CreateGameItemRequest, GameItemResponse } from '@/types/api'
import { answerLetters } from '@/game-engine/crossword/letters'
import type {
  ChoiceOption,
  CrosswordRow,
  Draft,
  GameItem,
  GameType,
  ItemDraft,
  OrderSet,
  PairSet,
  Question,
  QuizQuestion,
  SortSet,
  TextPair,
} from '@/types/game'
import { toItemFields, toQuestion } from '@/utils/gameMapping'

type ItemFields = Pick<CreateGameItemRequest, 'content' | 'solution'>

/** How the items of one game type are stored on the backend and shown in the editor. */
export interface ItemCodec<T extends GameItem> {
  itemType: (draft: Draft<T>) => string
  fromItem: (item: GameItemResponse) => T
  toFields: (draft: Draft<T>) => ItemFields
  empty: () => Draft<T>
  /** One line for the sidebar; empty while nothing has been typed. */
  summary: (item: Draft<T>) => string
}

/** Most options of a quiz question / pairs of a set (same limits as GameItemValidator on the backend). */
export const MAX_OPTIONS = 6
export const MIN_OPTIONS = 2
export const MAX_PAIRS = 12
/** Limits of the puzzles (same as GameItemValidator). */
export const MAX_ANSWER_LETTERS = 15
export const MIN_ORDER_ENTRIES = 2
export const MAX_ORDER_ENTRIES = 8
export const MIN_GROUPS = 2
export const MAX_GROUPS = 4
export const MAX_SORT_CARDS = 16

export const OPTION_LETTERS = 'ABCDEF'

const str = (value: unknown) => (typeof value === 'string' ? value : '')
const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null) : []
const idPairs = (solution: GameItemResponse['solution']): [string, string][] =>
  (Array.isArray(solution?.pairs) ? solution.pairs : []).flatMap((p) =>
    Array.isArray(p) && p.length === 2 && typeof p[0] === 'string' && typeof p[1] === 'string' ? [[p[0], p[1]]] : [],
  )

let lastLocalId = 0
/** Id of a pair / option created in the editor (only needs to be unique inside its item). */
export const localId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(lastLocalId++).toString(36)}`

// --- GRID_BOARD -------------------------------------------------------------------------------------------------

const gridCodec: ItemCodec<Question> = {
  itemType: () => 'OPEN_QUESTION',
  fromItem: toQuestion,
  toFields: toItemFields,
  empty: () => ({ text: '', answer: '', points: 20 }),
  summary: (q) => q.text.trim(),
}

// --- QUIZ -------------------------------------------------------------------------------------------------------

export const TRUE_FALSE_OPTIONS: ChoiceOption[] = [
  { id: 'true', text: 'Đúng' },
  { id: 'false', text: 'Sai' },
]

/** Next free option id: a, b, c... */
export function nextOptionId(options: ChoiceOption[]): string {
  const used = new Set(options.map((o) => o.id))
  for (const letter of 'abcdefghijklmnopqrstuvwxyz') if (!used.has(letter)) return letter
  return localId('o')
}

export const emptyQuizQuestion = (trueFalse = false): Draft<QuizQuestion> => ({
  trueFalse,
  text: '',
  options: trueFalse ? TRUE_FALSE_OPTIONS.map((o) => ({ ...o })) : ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' })),
  correctId: null,
})

const quizCodec: ItemCodec<QuizQuestion> = {
  itemType: (q) => (q.trueFalse ? 'TRUE_FALSE' : 'SINGLE_CHOICE'),
  fromItem: (item) => {
    const options = list(item.content.options).map((o) => ({ id: String(o.id ?? ''), text: str(o.text) }))
    const correct = Array.isArray(item.solution?.correct) ? item.solution.correct[0] : undefined
    return {
      id: String(item.id),
      trueFalse: item.itemType === 'TRUE_FALSE',
      text: str(item.content.text),
      imageUrl: str(item.content.image) || undefined,
      options,
      correctId: typeof correct === 'string' && options.some((o) => o.id === correct) ? correct : null,
    }
  },
  toFields: (q) => {
    const image = q.imageUrl && !q.imageUrl.startsWith('blob:') ? q.imageUrl : undefined
    const correct = q.options.some((o) => o.id === q.correctId) ? q.correctId : null
    return {
      content: { text: q.text, options: q.options.map((o) => ({ id: o.id, text: o.text })), ...(image ? { image } : {}) },
      solution: correct ? { correct: [correct] } : null,
    }
  },
  empty: () => emptyQuizQuestion(),
  summary: (q) => q.text.trim(),
}

// --- MATCHING / MEMORY ----------------------------------------------------------------------------------------

export const emptyPairSet = (): Draft<PairSet> => ({ pairs: [{ id: localId('p'), a: '', b: '' }] })

/** Joins the two sides of the stored pairs; an entry without a partner keeps an empty other side. */
function joinPairs(
  first: Record<string, unknown>[],
  second: Record<string, unknown>[],
  solution: GameItemResponse['solution'],
): TextPair[] {
  const text = new Map([...first, ...second].map((e) => [String(e.id ?? ''), str(e.text)]))
  const used = new Set<string>()
  const pairs: TextPair[] = []
  for (const [x, y] of idPairs(solution)) {
    if (!text.has(x) || !text.has(y) || used.has(x) || used.has(y)) continue
    used.add(x)
    used.add(y)
    pairs.push({ id: x, a: text.get(x) ?? '', b: text.get(y) ?? '' })
  }
  for (const e of first) if (!used.has(String(e.id))) pairs.push({ id: String(e.id), a: str(e.text), b: '' })
  for (const e of second) if (!used.has(String(e.id))) pairs.push({ id: String(e.id), a: '', b: str(e.text) })
  return pairs.length ? pairs : emptyPairSet().pairs
}

const pairSummary = (set: Draft<PairSet>) =>
  set.pairs
    .filter((p) => p.a.trim() || p.b.trim())
    .map((p) => p.a.trim() || p.b.trim())
    .join(', ')

/** MATCHING `PAIR_SET`: content `{left: [{id, text}], right: [...]}`, solution `{pairs: [[leftId, rightId]]}`. */
const matchingCodec: ItemCodec<PairSet> = {
  itemType: () => 'PAIR_SET',
  fromItem: (item) => ({
    id: String(item.id),
    pairs: joinPairs(list(item.content.left), list(item.content.right), item.solution),
  }),
  toFields: ({ pairs }) => ({
    content: {
      left: pairs.map((p, i) => ({ id: `l${i + 1}`, text: p.a })),
      right: pairs.map((p, i) => ({ id: `r${i + 1}`, text: p.b })),
    },
    solution: { pairs: pairs.map((_, i) => [`l${i + 1}`, `r${i + 1}`]) },
  }),
  empty: emptyPairSet,
  summary: pairSummary,
}

/** MEMORY `CARD_SET`: content `{cards: [{id, text}]}`, solution `{pairs: [[cardId, cardId]]}`. */
const memoryCodec: ItemCodec<PairSet> = {
  itemType: () => 'CARD_SET',
  fromItem: (item) => ({ id: String(item.id), pairs: joinPairs(list(item.content.cards), [], item.solution) }),
  toFields: ({ pairs }) => ({
    content: { cards: pairs.flatMap((p, i) => [{ id: `a${i + 1}`, text: p.a }, { id: `b${i + 1}`, text: p.b }]) },
    solution: { pairs: pairs.map((_, i) => [`a${i + 1}`, `b${i + 1}`]) },
  }),
  empty: emptyPairSet,
  summary: pairSummary,
}

// --- CROSSWORD --------------------------------------------------------------------------------------------------

export const emptyCrosswordRow = (): Draft<CrosswordRow> => ({ clue: '', answer: '', keyIndex: null })

/** CROSSWORD `CROSSWORD_ROW`: content `{clue}`, solution `{answer, keyIndex}` (none until both are set and valid). */
const crosswordCodec: ItemCodec<CrosswordRow> = {
  itemType: () => 'CROSSWORD_ROW',
  fromItem: (item) => {
    const key = item.solution?.keyIndex
    return {
      id: String(item.id),
      clue: str(item.content.clue),
      answer: str(item.solution?.answer),
      keyIndex: typeof key === 'number' && Number.isInteger(key) ? key : null,
    }
  },
  toFields: (row) => {
    const letters = answerLetters(row.answer).length
    const valid = letters > 0 && letters <= MAX_ANSWER_LETTERS && row.keyIndex !== null && row.keyIndex < letters
    return {
      content: { clue: row.clue },
      solution: valid ? { answer: row.answer.trim(), keyIndex: row.keyIndex } : null,
    }
  },
  empty: emptyCrosswordRow,
  summary: (row) => row.clue.trim() || row.answer.trim(),
}

// --- ORDERING ---------------------------------------------------------------------------------------------------

export const emptyOrderSet = (): Draft<OrderSet> => ({
  text: '',
  entries: [0, 1, 2].map(() => ({ id: localId('e'), text: '' })),
})

/** ORDERING `ORDER_SET`: content `{text, items: [{id, text}]}`, solution `{order: [id]}`. */
const orderingCodec: ItemCodec<OrderSet> = {
  itemType: () => 'ORDER_SET',
  fromItem: (item) => {
    const entries = list(item.content.items).map((e) => ({ id: String(e.id ?? ''), text: str(e.text) }))
    const order = Array.isArray(item.solution?.order) ? item.solution.order.filter((id): id is string => typeof id === 'string') : []
    const byId = new Map(entries.map((e) => [e.id, e]))
    const ordered = order.flatMap((id) => byId.get(id) ?? [])
    // Entries the order does not mention (should not happen) keep their stored place at the end.
    const rest = entries.filter((e) => !order.includes(e.id))
    return { id: String(item.id), text: str(item.content.text), entries: [...ordered, ...rest] }
  },
  toFields: (set) => {
    const items = set.entries.map((e, i) => ({ id: `e${i + 1}`, text: e.text }))
    return { content: { text: set.text, items }, solution: { order: items.map((e) => e.id) } }
  },
  empty: emptyOrderSet,
  summary: (set) => set.text.trim() || set.entries.map((e) => e.text.trim()).filter(Boolean).join(', '),
}

// --- SORTING ----------------------------------------------------------------------------------------------------

export const emptySortSet = (): Draft<SortSet> => {
  const groups = [
    { id: localId('g'), text: '' },
    { id: localId('g'), text: '' },
  ]
  return { text: '', groups, cards: [0, 1, 2, 3].map(() => ({ id: localId('c'), text: '', groupId: null })) }
}

/** SORTING `SORT_SET`: content `{text, groups, cards}`, solution `{assign: [[cardId, groupId]]}`. */
const sortingCodec: ItemCodec<SortSet> = {
  itemType: () => 'SORT_SET',
  fromItem: (item) => {
    const groups = list(item.content.groups).map((g) => ({ id: String(g.id ?? ''), text: str(g.text) }))
    const groupOf = new Map(
      (Array.isArray(item.solution?.assign) ? item.solution.assign : []).flatMap((a) =>
        Array.isArray(a) && typeof a[0] === 'string' && typeof a[1] === 'string' ? [[a[0], a[1]] as const] : [],
      ),
    )
    const cards = list(item.content.cards).map((c) => {
      const id = String(c.id ?? '')
      const groupId = groupOf.get(id)
      return { id, text: str(c.text), groupId: groupId && groups.some((g) => g.id === groupId) ? groupId : null }
    })
    return { id: String(item.id), text: str(item.content.text), groups, cards }
  },
  toFields: (set) => {
    const groupIds = new Map(set.groups.map((g, i) => [g.id, `g${i + 1}`]))
    const cards = set.cards.map((c, i) => ({ id: `c${i + 1}`, text: c.text }))
    return {
      content: { text: set.text, groups: set.groups.map((g) => ({ id: groupIds.get(g.id), text: g.text })), cards },
      solution: {
        assign: set.cards.flatMap((c, i) => (c.groupId && groupIds.has(c.groupId) ? [[`c${i + 1}`, groupIds.get(c.groupId)]] : [])),
      },
    }
  },
  empty: emptySortSet,
  summary: (set) => set.text.trim() || set.groups.map((g) => g.text.trim()).filter(Boolean).join(' / '),
}

// --- Registry -----------------------------------------------------------------------------------------------------

interface ItemOf {
  GRID_BOARD: Question
  QUIZ: QuizQuestion
  GOLDEN_BELL: QuizQuestion
  BOAT_RACE: QuizQuestion
  MILLIONAIRE: QuizQuestion
  TUG_OF_WAR: QuizQuestion
  FLOWER_PICK: QuizQuestion
  WHACK_MOLE: QuizQuestion
  TRUE_FALSE: QuizQuestion
  LUCKY_STAR: QuizQuestion
  SECRET_PICTURE: QuizQuestion
  MOUNTAIN_CLIMB: QuizQuestion
  POINT_WHEEL: QuizQuestion
  TIC_TAC_TOE: QuizQuestion
  CONNECT_FOUR: QuizQuestion
  TREASURE_CHEST: QuizQuestion
  BUILD_TOWER: QuizQuestion
  BEE_FLOWER: QuizQuestion
  BINGO: QuizQuestion
  MATCHING: PairSet
  MEMORY: PairSet
  CROSSWORD: CrosswordRow
  ORDERING: OrderSet
  SORTING: SortSet
}

const CODECS: { [K in keyof ItemOf]: ItemCodec<ItemOf[K]> } = {
  GRID_BOARD: gridCodec,
  QUIZ: quizCodec,
  // Same questions as QUIZ, played another way.
  GOLDEN_BELL: quizCodec,
  BOAT_RACE: quizCodec,
  MILLIONAIRE: quizCodec,
  TUG_OF_WAR: quizCodec,
  FLOWER_PICK: quizCodec,
  WHACK_MOLE: quizCodec,
  TRUE_FALSE: quizCodec,
  LUCKY_STAR: quizCodec,
  SECRET_PICTURE: quizCodec,
  MOUNTAIN_CLIMB: quizCodec,
  POINT_WHEEL: quizCodec,
  TIC_TAC_TOE: quizCodec,
  CONNECT_FOUR: quizCodec,
  TREASURE_CHEST: quizCodec,
  BUILD_TOWER: quizCodec,
  BEE_FLOWER: quizCodec,
  BINGO: quizCodec,
  MATCHING: matchingCodec,
  MEMORY: memoryCodec,
  CROSSWORD: crosswordCodec,
  ORDERING: orderingCodec,
  SORTING: sortingCodec,
}

/** Codec of a game type, or null for tools without items (wheel, name race). */
export function itemCodec(type: GameType): ItemCodec<GameItem> | null {
  return Object.hasOwn(CODECS, type) ? (CODECS[type as keyof ItemOf] as unknown as ItemCodec<GameItem>) : null
}

export function toCreateRequest(type: GameType, draft: ItemDraft): CreateGameItemRequest {
  const codec = itemCodec(type)
  if (!codec) throw new Error(`${type} has no items`)
  return { itemType: codec.itemType(draft), ...codec.toFields(draft) }
}
