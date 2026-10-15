import { BoatRaceScreen } from '@/game-engine/boat-race/BoatRaceScreen'
import { CrosswordScreen } from '@/game-engine/crossword/CrosswordScreen'
import { GoldenBellScreen } from '@/game-engine/golden-bell/GoldenBellScreen'
import { GridBoardScreen } from '@/game-engine/grid-board/GridBoardScreen'
import { MatchingScreen } from '@/game-engine/matching/MatchingScreen'
import { MemoryScreen } from '@/game-engine/memory/MemoryScreen'
import { OrderingScreen } from '@/game-engine/ordering/OrderingScreen'
import { QuizScreen } from '@/game-engine/quiz/QuizScreen'
import { SortingScreen } from '@/game-engine/sorting/SortingScreen'
import type { GuideGameType } from '@/game-engine/gameGuide'
import type { CrosswordRow, GameItem, GameSummary, OrderSet, PairSet, QuizQuestion, SortSet } from '@/types/game'

interface GameScreenProps {
  /** The game played: the game's type, or another quiz game (see playMode). */
  mode: GuideGameType
  game: GameSummary
  items: GameItem[]
  settings: Record<string, unknown>
}

/**
 * The 1280×720 projector screen of a question game (drawn on PROJECTOR_BOARD_BG), by the game it is played as. Used by
 * the projector (/play/:gameId) and, shrunk and inert, by the start page's preview.
 */
export function GameScreen({ mode, game, items, settings }: GameScreenProps) {
  switch (mode) {
    case 'GRID_BOARD':
      return <GridBoardScreen gameId={game.id} />
    case 'QUIZ':
      return <QuizScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'GOLDEN_BELL':
      return <GoldenBellScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'BOAT_RACE':
      return <BoatRaceScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'MATCHING':
      return <MatchingScreen key={game.id} game={game} sets={items as PairSet[]} settings={settings} />
    case 'MEMORY':
      return <MemoryScreen key={game.id} game={game} sets={items as PairSet[]} settings={settings} />
    case 'CROSSWORD':
      return <CrosswordScreen key={game.id} game={game} rows={items as CrosswordRow[]} settings={settings} />
    case 'ORDERING':
      return <OrderingScreen key={game.id} game={game} sets={items as OrderSet[]} settings={settings} />
    case 'SORTING':
      return <SortingScreen key={game.id} game={game} sets={items as SortSet[]} settings={settings} />
  }
}
