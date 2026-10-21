import { BoatRaceScreen } from '@/game-engine/boat-race/BoatRaceScreen'
import { CrosswordScreen } from '@/game-engine/crossword/CrosswordScreen'
import { FlowerPickScreen } from '@/game-engine/flower-pick/FlowerPickScreen'
import { GoldenBellScreen } from '@/game-engine/golden-bell/GoldenBellScreen'
import { GridBoardScreen } from '@/game-engine/grid-board/GridBoardScreen'
import { LuckyStarScreen } from '@/game-engine/lucky-star/LuckyStarScreen'
import { MatchingScreen } from '@/game-engine/matching/MatchingScreen'
import { MemoryScreen } from '@/game-engine/memory/MemoryScreen'
import { MillionaireScreen } from '@/game-engine/millionaire/MillionaireScreen'
import { MountainClimbScreen } from '@/game-engine/mountain-climb/MountainClimbScreen'
import { OrderingScreen } from '@/game-engine/ordering/OrderingScreen'
import { PointWheelScreen } from '@/game-engine/point-wheel/PointWheelScreen'
import { QuizScreen } from '@/game-engine/quiz/QuizScreen'
import { SecretPictureScreen } from '@/game-engine/secret-picture/SecretPictureScreen'
import { SortingScreen } from '@/game-engine/sorting/SortingScreen'
import { TrueFalseScreen } from '@/game-engine/true-false/TrueFalseScreen'
import { TugOfWarScreen } from '@/game-engine/tug-of-war/TugOfWarScreen'
import { WhackMoleScreen } from '@/game-engine/whack-mole/WhackMoleScreen'
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
    case 'MILLIONAIRE':
      return <MillionaireScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'TUG_OF_WAR':
      return <TugOfWarScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'FLOWER_PICK':
      return <FlowerPickScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'WHACK_MOLE':
      return <WhackMoleScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'TRUE_FALSE':
      return <TrueFalseScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'LUCKY_STAR':
      return <LuckyStarScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'SECRET_PICTURE':
      return <SecretPictureScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'MOUNTAIN_CLIMB':
      return <MountainClimbScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
    case 'POINT_WHEEL':
      return <PointWheelScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
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
