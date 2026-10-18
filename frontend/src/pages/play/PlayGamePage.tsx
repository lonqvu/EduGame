import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { PROJECTOR_BOARD_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { isGuideGame } from '@/game-engine/gameGuide'
import { useBeginPlaySession } from '@/game-engine/shared/usePlaySession'
import { playMode } from '@/game-engine/registry'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { GameScreen } from '@/pages/play/GameScreen'
import { GridBoardPage } from '@/pages/play/GridBoardPage'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import type { GameItem } from '@/types/game'

const EMPTY: GameItem[] = []
const NO_SETTINGS: Record<string, unknown> = {}

/**
 * /play/:gameId — the projector screen of a question game, by game type. Quiz questions can be played the way of
 * another quiz game: /play/:gameId?as=GOLDEN_BELL.
 */
export function PlayGamePage() {
  const { gameId = '' } = useParams()
  const [params] = useSearchParams()
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
  useBeginPlaySession(!!game && (loadState === 'play' || loadState === 'edit'))

  if (loadState === 'missing') return <NotFoundPage />
  if (loadState === 'error') return <LoadError onRetry={() => void loadGame(gameId, 'play')} />
  if (!game || (loadState !== 'play' && loadState !== 'edit')) return <PageLoading />

  const mode = playMode(game.type, params.get('as'))
  if (!isGuideGame(mode)) return <NotFoundPage message="Trò này không có màn chiếu câu hỏi." />
  // Lật ô has its own routes for a tile and the results.
  if (mode === 'GRID_BOARD') return <GridBoardPage screen="board" />

  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG} music>
      <GameScreen mode={mode} game={game} items={items} settings={settings} />
    </ProjectorStage>
  )
}
