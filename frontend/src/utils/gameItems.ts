import type { CreateGameItemRequest, GameItemResponse } from '@/types/api'
import type { ChoiceOption, Draft, GameItem, GameType, ItemDraft, PairSet, Question, QuizQuestion, TextPair } from '@/types/game'
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

// --- Registry -----------------------------------------------------------------------------------------------------

interface ItemOf {
  GRID_BOARD: Question
  QUIZ: QuizQuestion
  MATCHING: PairSet
  MEMORY: PairSet
}

const CODECS: { [K in keyof ItemOf]: ItemCodec<ItemOf[K]> } = {
  GRID_BOARD: gridCodec,
  QUIZ: quizCodec,
  MATCHING: matchingCodec,
  MEMORY: memoryCodec,
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
