import { useEffect } from 'react'
import { useParams } from 'react-router'
import { PROJECTOR_BOARD_BG, PROJECTOR_RESULTS_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { GridBoardScreen } from '@/game-engine/grid-board/GridBoardScreen'
import { GridQuestionScreen } from '@/game-engine/grid-board/GridQuestionScreen'
import { GridResultsScreen } from '@/game-engine/grid-board/GridResultsScreen'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useGameLibraryStore } from '@/store/gameLibraryStore'

type Screen = 'board' | 'question' | 'results'

/** Projector routes of a game: /play/:gameId, /play/:gameId/tiles/:tileNo, /play/:gameId/results */
export function GridBoardPage({ screen }: { screen: Screen }) {
  const { gameId = '', tileNo } = useParams()
  const loadState = useGameLibraryStore((s) => s.gameStatus[gameId])
  const loadGame = useGameLibraryStore((s) => s.loadGame)
  const game = useGameLibraryStore((s) => s.games.find((g) => g.id === gameId))

  // Board / tile / results are separate routes: load only if the game is not in the store yet (coming from the
  // editor, the store already holds the latest content).
  useEffect(() => {
    const state = useGameLibraryStore.getState().gameStatus[gameId]
    if (state !== 'play' && state !== 'edit') void loadGame(gameId, 'play')
  }, [gameId, loadGame])

  if (loadState === 'missing') return <NotFoundPage />
  if (loadState === 'error') return <LoadError onRetry={() => void loadGame(gameId, 'play')} />
  if (!game || (loadState !== 'play' && loadState !== 'edit')) return <PageLoading />
  if (game.type !== 'GRID_BOARD') {
    return <NotFoundPage message="Màn chiếu cho trò chơi này đang được hoàn thiện." />
  }

  return (
    <ProjectorStage background={screen === 'results' ? PROJECTOR_RESULTS_BG : PROJECTOR_BOARD_BG}>
      {screen === 'board' && <GridBoardScreen gameId={gameId} />}
      {screen === 'question' && <GridQuestionScreen gameId={gameId} tileNo={Number(tileNo)} />}
      {screen === 'results' && <GridResultsScreen gameId={gameId} />}
    </ProjectorStage>
  )
}
