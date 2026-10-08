import type { ReactNode } from 'react'
import { PairSetForm, type PairSetLabels } from '@/editor/PairSetForm'
import { parseBulkPairs, parseBulkQuiz } from '@/editor/parseBulkItems'
import { parseBulkQuestions } from '@/editor/parseBulkQuestions'
import { QuestionForm } from '@/editor/QuestionForm'
import { QuizForm } from '@/editor/QuizForm'
import type { GameItem, GameType, ItemDraft, PairSet, Question, QuizQuestion } from '@/types/game'
import { emptyPairSet, emptyQuizQuestion } from '@/utils/gameItems'

export interface ItemFormProps {
  item: GameItem
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
  QUIZ: {
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
  },
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
}
