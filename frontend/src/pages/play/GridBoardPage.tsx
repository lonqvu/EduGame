import { useParams } from 'react-router'
import { PROJECTOR_BOARD_BG, PROJECTOR_RESULTS_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { GridBoardScreen } from '@/game-engine/grid-board/GridBoardScreen'
import { GridQuestionScreen } from '@/game-engine/grid-board/GridQuestionScreen'
import { GridResultsScreen } from '@/game-engine/grid-board/GridResultsScreen'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useGameLibraryStore } from '@/store/gameLibraryStore'

type Screen = 'board' | 'question' | 'results'

/** Projector routes of a game: /play/:gameId, /play/:gameId/tiles/:tileNo, /play/:gameId/results */
export function GridBoardPage({ screen }: { screen: Screen }) {
  const { gameId = '', tileNo } = useParams()
  const game = useGameLibraryStore((s) => s.games.find((g) => g.id === gameId))

  if (!game) return <NotFoundPage />
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
