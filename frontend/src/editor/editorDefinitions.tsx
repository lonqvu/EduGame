import i18n from 'i18next'
import type { ReactNode } from 'react'
import { CrosswordForm } from '@/editor/CrosswordForm'
import { OrderSetForm } from '@/editor/OrderSetForm'
import { PairSetForm, type PairSetLabels } from '@/editor/PairSetForm'
import { parseBulkCrossword, parseBulkOrder, parseBulkPairs, parseBulkQuiz, parseBulkSort } from '@/editor/parseBulkItems'
import { parseBulkQuestions } from '@/editor/parseBulkQuestions'
import { QuestionForm } from '@/editor/QuestionForm'
import { QuizForm } from '@/editor/QuizForm'
import { SortSetForm } from '@/editor/SortSetForm'
import type { Translation } from '@/i18n/locales/vi'
import type { CrosswordRow, GameItem, GameType, ItemDraft, OrderSet, PairSet, Question, QuizQuestion, SortSet } from '@/types/game'
import { emptyCrosswordRow, emptyOrderSet, emptyPairSet, emptyQuizQuestion, emptySortSet } from '@/utils/gameItems'

export interface ItemFormProps {
  /** Code of the game (image uploads go to it). */
  gameId: string
  item: GameItem
  /** Every item of the game (the crossword shows the keyword they spell). */
  items: GameItem[]
  number: number
  isLast: boolean
  onChange: (patch: Partial<ItemDraft>) => void
  onDelete: () => void
  onNext: () => void
}

export interface EditorDefinition {
  /** "Câu hỏi", "Bộ nối cặp"... (heads the form: "Câu hỏi 3"). */
  noun: string
  /** "câu hỏi", in a sentence. */
  nounLower: string
  /** "3 câu hỏi": a number of items. */
  count: (count: number) => string
  /** "Thêm câu hỏi": the main add button (adds `newItem()`). */
  addLabel: string
  newItem: () => ItemDraft
  /** Other kinds of item the teacher can add, e.g. a true / false question. */
  extraAdds?: { label: string; newItem: () => ItemDraft }[]
  /** Shown in the sidebar for an item with nothing typed. */
  blankLabel: string
  form: (props: ItemFormProps) => ReactNode
  paste: {
    title: string
    hint: string
    placeholder: string
    parse: (text: string) => ItemDraft[]
  }
}

type Kind = keyof Translation['editor']['kinds']

/** The labels of an editor, read in the current language when shown (editor.kinds.*). */
function labelled(kind: Kind, parts: Pick<EditorDefinition, 'newItem' | 'form' | 'extraAdds'> & { parse: (text: string) => ItemDraft[] }): EditorDefinition {
  const { parse, ...rest } = parts
  return {
    ...rest,
    get noun() {
      return i18n.t(`editor.kinds.${kind}.noun`)
    },
    get nounLower() {
      return i18n.t(`editor.kinds.${kind}.nounLower`)
    },
    count: (count) => i18n.t(`editor.kinds.${kind}.count`, { count }),
    get addLabel() {
      return i18n.t(`editor.kinds.${kind}.add`)
    },
    get blankLabel() {
      return i18n.t(`editor.kinds.${kind}.blank`)
    },
    paste: {
      parse,
      get title() {
        return i18n.t(`editor.kinds.${kind}.pasteTitle`)
      },
      get hint() {
        return i18n.t(`editor.kinds.${kind}.pasteHint`)
      },
      get placeholder() {
        return i18n.t(`editor.kinds.${kind}.pastePlaceholder`)
      },
    },
  }
}

/** The column names of a pair editor (matching or memory). */
const pairLabels = (kind: 'matching' | 'memory'): PairSetLabels => ({
  get noun() {
    return i18n.t(`editor.kinds.${kind}.noun`)
  },
  get nounLower() {
    return i18n.t(`editor.kinds.${kind}.nounLower`)
  },
  get sideA() {
    return i18n.t(`editor.kinds.${kind}.sideA`)
  },
  get sideB() {
    return i18n.t(`editor.kinds.${kind}.sideB`)
  },
  get placeholderA() {
    return i18n.t(`editor.kinds.${kind}.placeholderA`)
  },
  get placeholderB() {
    return i18n.t(`editor.kinds.${kind}.placeholderB`)
  },
  get hint() {
    return i18n.t(`editor.kinds.${kind}.hint`)
  },
})

const MATCHING_LABELS = pairLabels('matching')
const MEMORY_LABELS = pairLabels('memory')

/** Quiz questions; Rung chuông vàng and Đua thuyền are played with the same questions. */
const QUIZ_EDITOR = labelled('quiz', {
  newItem: () => emptyQuizQuestion(),
  extraAdds: [
    {
      get label() {
        return i18n.t('editor.addTrueFalse')
      },
      newItem: () => emptyQuizQuestion(true),
    },
  ],
  form: ({ item, ...props }) => <QuizForm question={item as QuizQuestion} {...props} />,
  parse: parseBulkQuiz,
})

/** Open questions (a clue and its answer): Lật ô and the word games. */
const OPEN_EDITOR = labelled('open', {
  newItem: () => ({ text: '', answer: '', points: 20 }),
  form: ({ item, ...props }) => <QuestionForm question={item as Question} {...props} />,
  parse: (text) => parseBulkQuestions(text, 20),
})

export const EDITOR_DEFINITIONS: Partial<Record<GameType, EditorDefinition>> = {
  GRID_BOARD: OPEN_EDITOR,
  WORD_SCRAMBLE: OPEN_EDITOR,
  HANGMAN: OPEN_EDITOR,
  QUIZ: QUIZ_EDITOR,
  GOLDEN_BELL: QUIZ_EDITOR,
  BOAT_RACE: QUIZ_EDITOR,
  MILLIONAIRE: QUIZ_EDITOR,
  TUG_OF_WAR: QUIZ_EDITOR,
  FLOWER_PICK: QUIZ_EDITOR,
  WHACK_MOLE: QUIZ_EDITOR,
  TRUE_FALSE: QUIZ_EDITOR,
  LUCKY_STAR: QUIZ_EDITOR,
  SECRET_PICTURE: QUIZ_EDITOR,
  MOUNTAIN_CLIMB: QUIZ_EDITOR,
  POINT_WHEEL: QUIZ_EDITOR,
  TIC_TAC_TOE: QUIZ_EDITOR,
  CONNECT_FOUR: QUIZ_EDITOR,
  TREASURE_CHEST: QUIZ_EDITOR,
  BUILD_TOWER: QUIZ_EDITOR,
  BEE_FLOWER: QUIZ_EDITOR,
  BINGO: QUIZ_EDITOR,
  MATCHING: labelled('matching', {
    newItem: emptyPairSet,
    form: ({ item, ...props }) => <PairSetForm set={item as PairSet} labels={MATCHING_LABELS} {...props} />,
    parse: parseBulkPairs,
  }),
  MEMORY: labelled('memory', {
    newItem: emptyPairSet,
    form: ({ item, ...props }) => <PairSetForm set={item as PairSet} labels={MEMORY_LABELS} {...props} />,
    parse: parseBulkPairs,
  }),
  CROSSWORD: labelled('crossword', {
    newItem: emptyCrosswordRow,
    form: ({ item, items, ...props }) => <CrosswordForm row={item as CrosswordRow} rows={items} {...props} />,
    parse: parseBulkCrossword,
  }),
  ORDERING: labelled('ordering', {
    newItem: emptyOrderSet,
    form: ({ item, ...props }) => <OrderSetForm set={item as OrderSet} {...props} />,
    parse: parseBulkOrder,
  }),
  SORTING: labelled('sorting', {
    newItem: emptySortSet,
    form: ({ item, ...props }) => <SortSetForm set={item as SortSet} {...props} />,
    parse: parseBulkSort,
  }),
}
