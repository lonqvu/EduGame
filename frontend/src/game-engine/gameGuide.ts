import i18n from 'i18next'
import { bingoQuestions } from '@/game-engine/bingo/bingo'
import { playableRows } from '@/game-engine/crossword/crosswordRound'
import { DEFAULT_TEAMS, teamColor } from '@/game-engine/grid-board/teams'
import { playableMatchingSets } from '@/game-engine/matching/matchingRound'
import { playableMemorySets } from '@/game-engine/memory/memoryRound'
import { playableOrderSets } from '@/game-engine/ordering/orderingRound'
import { playableQuizQuestions } from '@/game-engine/quiz/quizRound'
import { PLAY_DEFAULTS, readPlaySettings, type RulesGameType } from '@/game-engine/shared/gameSettings'
import { playableSortSets } from '@/game-engine/sorting/sortingRound'
import { wordQuestions } from '@/game-engine/words/words'
import { enGuide } from '@/i18n/guides/en'
import { viGuide } from '@/i18n/guides/vi'
import type { CrosswordRow, GameItem, GameType, OrderSet, PairSet, Question, QuizQuestion, SortSet } from '@/types/game'

/** Games played on the projector with questions or cards (the tools have no rules to explain). */
export type GuideGameType = RulesGameType | 'GRID_BOARD'

export const isGuideGame = (type: GameType): type is GuideGameType => type === 'GRID_BOARD' || type in PLAY_DEFAULTS

/** Items the projector will actually play: half-written questions and sets are left out. */
export function countPlayable(type: GuideGameType, items: GameItem[]): number {
  switch (type) {
    case 'GRID_BOARD':
      return (items as Question[]).filter((q) => q.text.trim()).length
    case 'QUIZ':
    case 'GOLDEN_BELL':
    case 'BOAT_RACE':
    case 'MILLIONAIRE':
    case 'TUG_OF_WAR':
    case 'FLOWER_PICK':
    case 'WHACK_MOLE':
    case 'TRUE_FALSE':
    case 'LUCKY_STAR':
    case 'SECRET_PICTURE':
    case 'MOUNTAIN_CLIMB':
    case 'POINT_WHEEL':
    case 'TIC_TAC_TOE':
    case 'CONNECT_FOUR':
    case 'TREASURE_CHEST':
    case 'BUILD_TOWER':
    case 'BEE_FLOWER':
      return playableQuizQuestions(items as QuizQuestion[], { shuffleOptions: false }).length
    case 'WORD_SCRAMBLE':
    case 'HANGMAN':
      return wordQuestions(items as Question[]).length
    case 'BINGO':
      return bingoQuestions(playableQuizQuestions(items as QuizQuestion[], { shuffleOptions: false })).asked.length
    case 'MATCHING':
      return playableMatchingSets(items as PairSet[]).length
    case 'MEMORY':
      return playableMemorySets(items as PairSet[]).length
    case 'CROSSWORD':
      return playableRows(items as CrosswordRow[]).length
    case 'ORDERING':
      return playableOrderSets(items as OrderSet[]).length
    case 'SORTING':
      return playableSortSets(items as SortSet[]).length
  }
}

export interface GuideStep {
  title: string
  text: string
}

/**
 * What the start page tells the teacher and the class about one game, written from the rules it is actually played
 * with: the numbers come from its settings, so the guide never says something the projector does not do.
 */
export interface GameGuide {
  /** One sentence for the class: what they try to do. */
  goal: string
  /** Short rules, said to the class. */
  rules: string[]
  /** The flow of a round, from the class's point of view. */
  steps: GuideStep[]
  /** Who wins. */
  winner: string
  /** How to drive the projector screen: for the teacher only, never projected. */
  teacherNotes: string[]
}

export function gameGuide(type: GuideGameType, settings: Record<string, unknown> | undefined): GameGuide {
  const s = readPlaySettings(settings, type === 'GRID_BOARD' ? {} : PLAY_DEFAULTS[type])
  const colors = DEFAULT_TEAMS.map((t) => teamColor(t.id))
  return i18n.language === 'en' ? enGuide(type, s, colors) : viGuide(type, s, colors)
}
