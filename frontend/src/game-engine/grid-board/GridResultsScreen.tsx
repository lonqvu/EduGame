import { useNavigate } from 'react-router'
import { useGridBoardRound } from '@/game-engine/grid-board/useGridBoardRound'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { useGridBoardStore } from '@/store/gridBoardStore'

/** Projector: podium, awards and what to do next. */
export function GridResultsScreen({ gameId }: { gameId: string }) {
  const navigate = useNavigate()
  useGridBoardRound(gameId)
  const teams = useGridBoardStore((s) => s.teams)
  const restart = useGridBoardStore((s) => s.restart)

  const playAgain = () => {
    restart()
    navigate(`/play/${gameId}`)
  }

  return <TeamResults teams={teams} onPlayAgain={playAgain} />
}
