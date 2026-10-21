import type { ReactNode } from 'react'
import { CrosswordForm } from '@/editor/CrosswordForm'
import { OrderSetForm } from '@/editor/OrderSetForm'
import { PairSetForm, type PairSetLabels } from '@/editor/PairSetForm'
import { parseBulkCrossword, parseBulkOrder, parseBulkPairs, parseBulkQuiz, parseBulkSort } from '@/editor/parseBulkItems'
import { parseBulkQuestions } from '@/editor/parseBulkQuestions'
import { QuestionForm } from '@/editor/QuestionForm'
import { QuizForm } from '@/editor/QuizForm'
import { SortSetForm } from '@/editor/SortSetForm'
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
  /** "Câu hỏi", "Bộ nối cặp"... */
  noun: string
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
    /** "câu", "bộ" for the "Thêm 3 câu" button. */
    unit: string
  }
}

const MATCHING_LABELS: PairSetLabels = {
  noun: 'Bộ nối cặp',
  sideA: 'Cột trái',
  sideB: 'Cột phải',
  placeholderA: 'Ví dụ: Hà Nội',
  placeholderB: 'Ví dụ: Hồ Gươm',
  hint: 'Mỗi dòng là một cặp. Màn chiếu sẽ xáo trộn cột phải, học sinh nối lại cho đúng.',
}

const MEMORY_LABELS: PairSetLabels = {
  noun: 'Bộ thẻ',
  sideA: 'Thẻ thứ nhất',
  sideB: 'Thẻ ghép đôi',
  placeholderA: 'Ví dụ: Con mèo',
  placeholderB: 'Ví dụ: Meo meo',
  hint: 'Mỗi dòng là hai thẻ ghép đôi với nhau. Màn chiếu úp tất cả thẻ và xáo trộn, các đội lật hai thẻ mỗi lượt.',
}

const PAIRS_PASTE = {
  hint: 'Mỗi dòng một cặp, hai vế cách nhau bởi dấu “=”. Cứ 12 cặp thành một bộ.',
  unit: 'bộ',
  parse: parseBulkPairs,
}

/** Quiz questions; Rung chuông vàng and Đua thuyền are played with the same questions. */
const QUIZ_EDITOR: EditorDefinition = {
  noun: 'Câu hỏi',
  addLabel: 'Thêm câu trắc nghiệm',
  newItem: () => emptyQuizQuestion(),
  extraAdds: [{ label: 'Thêm câu Đúng / Sai', newItem: () => emptyQuizQuestion(true) }],
  blankLabel: 'Câu hỏi chưa có nội dung',
  form: ({ item, ...props }) => <QuizForm question={item as QuizQuestion} {...props} />,
  paste: {
    title: 'Dán nhiều câu trắc nghiệm',
    hint: 'Mỗi dòng một câu. Sau dấu “=” ghi đáp án đúng trước, các đáp án sai sau, cách nhau bởi “|”. Ghi “= Đúng” hoặc “= Sai” để tạo câu Đúng / Sai.',
    placeholder: 'Thủ đô của Việt Nam? = Hà Nội | Huế | Đà Nẵng\n5 + 3 = ? = 8 | 7 | 9\nMặt trời mọc ở đằng Đông = Đúng',
    parse: parseBulkQuiz,
    unit: 'câu',
  },
}

export const EDITOR_DEFINITIONS: Partial<Record<GameType, EditorDefinition>> = {
  GRID_BOARD: {
    noun: 'Câu hỏi',
    addLabel: 'Thêm câu hỏi',
    newItem: () => ({ text: '', answer: '', points: 20 }),
    blankLabel: 'Câu hỏi chưa có nội dung',
    form: ({ item, ...props }) => <QuestionForm question={item as Question} {...props} />,
    paste: {
      title: 'Dán nhiều câu hỏi',
      hint: 'Mỗi dòng một câu. Đáp án đặt sau dấu “=”.',
      placeholder: 'Con gì kêu meo meo? = Con mèo\n25 + 13 = ? = 38\nThủ đô của Việt Nam? = Hà Nội',
      parse: (text) => parseBulkQuestions(text, 20),
      unit: 'câu',
    },
  },
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
  MATCHING: {
    noun: MATCHING_LABELS.noun,
    addLabel: 'Thêm bộ nối cặp',
    newItem: emptyPairSet,
    blankLabel: 'Bộ chưa có cặp nào',
    form: ({ item, ...props }) => <PairSetForm set={item as PairSet} labels={MATCHING_LABELS} {...props} />,
    paste: { ...PAIRS_PASTE, title: 'Dán nhiều cặp', placeholder: 'Hà Nội = Hồ Gươm\nHuế = Sông Hương\n3 x 4 = 12' },
  },
  MEMORY: {
    noun: MEMORY_LABELS.noun,
    addLabel: 'Thêm bộ thẻ',
    newItem: emptyPairSet,
    blankLabel: 'Bộ chưa có thẻ nào',
    form: ({ item, ...props }) => <PairSetForm set={item as PairSet} labels={MEMORY_LABELS} {...props} />,
    paste: { ...PAIRS_PASTE, title: 'Dán nhiều cặp thẻ', placeholder: 'Con mèo = Meo meo\nCon chó = Gâu gâu\n5 x 5 = 25' },
  },
  CROSSWORD: {
    noun: 'Hàng ngang',
    addLabel: 'Thêm hàng ngang',
    newItem: emptyCrosswordRow,
    blankLabel: 'Hàng chưa có gợi ý',
    form: ({ item, items, ...props }) => <CrosswordForm row={item as CrosswordRow} rows={items} {...props} />,
    paste: {
      title: 'Dán nhiều hàng ngang',
      hint: 'Mỗi dòng một hàng: câu gợi ý, dấu “=”, rồi đáp án. Đặt chữ nằm ở cột từ khóa trong ngoặc vuông.',
      placeholder: 'Thứ gì mọc ở đằng Đông? = MẶT T[R]ỜI\nĐồ dùng để kẻ đường thẳng? = CÁI TH[Ư]ỚC',
      parse: parseBulkCrossword,
      unit: 'hàng',
    },
  },
  ORDERING: {
    noun: 'Bài sắp xếp',
    addLabel: 'Thêm bài sắp xếp',
    newItem: emptyOrderSet,
    blankLabel: 'Bài chưa có thẻ nào',
    form: ({ item, ...props }) => <OrderSetForm set={item as OrderSet} {...props} />,
    paste: {
      title: 'Dán nhiều bài sắp xếp',
      hint: 'Mỗi dòng một bài: đề bài, dấu “=”, rồi các thẻ theo đúng thứ tự, cách nhau bởi “|”.',
      placeholder: 'Xếp từ bé đến lớn = 12 | 25 | 38 | 47\nGhép thành câu = Em | rất | yêu | trường',
      parse: parseBulkOrder,
      unit: 'bài',
    },
  },
  SORTING: {
    noun: 'Bộ phân loại',
    addLabel: 'Thêm bộ phân loại',
    newItem: emptySortSet,
    blankLabel: 'Bộ chưa có giỏ nào',
    form: ({ item, ...props }) => <SortSetForm set={item as SortSet} {...props} />,
    paste: {
      title: 'Dán bộ phân loại',
      hint: 'Mỗi dòng một giỏ: tên giỏ, dấu “=”, rồi các thẻ cách nhau bởi dấu phẩy. Để một dòng trống giữa hai bộ.',
      placeholder: 'Con vật này ăn gì?\nĂn cỏ = Bò, Dê, Ngựa\nĂn thịt = Hổ, Sư tử, Sói',
      parse: parseBulkSort,
      unit: 'bộ',
    },
  },
}
