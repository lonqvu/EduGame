import { useEffect } from 'react'
import { useParams } from 'react-router'
import { PROJECTOR_BOARD_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { MatchingScreen } from '@/game-engine/matching/MatchingScreen'
import { MemoryScreen } from '@/game-engine/memory/MemoryScreen'
import { QuizScreen } from '@/game-engine/quiz/QuizScreen'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { GridBoardPage } from '@/pages/play/GridBoardPage'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import type { GameItem, PairSet, QuizQuestion } from '@/types/game'

const EMPTY: GameItem[] = []
const NO_SETTINGS: Record<string, unknown> = {}

/** /play/:gameId — the projector screen of a question game, by game type. */
export function PlayGamePage() {
  const { gameId = '' } = useParams()
  const loadState = useGameLibraryStore((s) => s.gameStatus[gameId])
  const loadGame = useGameLibraryStore((s) => s.loadGame)
  const game = useGameLibraryStore((s) => s.games.find((g) => g.id === gameId))
  const items = useGameLibraryStore((s) => s.items[gameId] ?? EMPTY)
  const settings = useGameLibraryStore((s) => s.settings[gameId] ?? NO_SETTINGS)

  // Coming from the editor, the store already holds the latest content: load only if it does not.
  useEffect(() => {
    const state = useGameLibraryStore.getState().gameStatus[gameId]
    if (state !== 'play' && state !== 'edit') void loadGame(gameId, 'play')
  }, [gameId, loadGame])

  if (loadState === 'missing') return <NotFoundPage />
  if (loadState === 'error') return <LoadError onRetry={() => void loadGame(gameId, 'play')} />
  if (!game || (loadState !== 'play' && loadState !== 'edit')) return <PageLoading />

  switch (game.type) {
    case 'GRID_BOARD':
      return <GridBoardPage screen="board" />
    case 'QUIZ':
      return (
        <ProjectorStage background={PROJECTOR_BOARD_BG}>
          <QuizScreen key={game.id} game={game} questions={items as QuizQuestion[]} settings={settings} />
        </ProjectorStage>
      )
    case 'MATCHING':
      return (
        <ProjectorStage background={PROJECTOR_BOARD_BG}>
          <MatchingScreen key={game.id} game={game} sets={items as PairSet[]} settings={settings} />
        </ProjectorStage>
      )
    case 'MEMORY':
      return (
        <ProjectorStage background={PROJECTOR_BOARD_BG}>
          <MemoryScreen key={game.id} game={game} sets={items as PairSet[]} settings={settings} />
        </ProjectorStage>
      )
    default:
      return <NotFoundPage message="Trò này không có màn chiếu câu hỏi." />
  }
}
