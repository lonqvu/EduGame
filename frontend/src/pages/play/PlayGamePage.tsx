import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router'
import { PROJECTOR_BOARD_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { countPlayable, isGuideGame } from '@/game-engine/gameGuide'
import { LeaveGameContext } from '@/game-engine/shared/leaveGame'
import { useBeginPlaySession } from '@/game-engine/shared/usePlaySession'
import { writePlaySettings } from '@/game-engine/shared/gameSettings'
import { playMode } from '@/game-engine/registry'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { GameIntro } from '@/pages/play/GameIntro'
import { GameScreen } from '@/pages/play/GameScreen'
import { GridBoardPage } from '@/pages/play/GridBoardPage'
import { useCatalogStore } from '@/store/catalogStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useGridBoardStore } from '@/store/gridBoardStore'
import type { GameItem } from '@/types/game'

const EMPTY: GameItem[] = []
const NO_SETTINGS: Record<string, unknown> = {}

/**
 * /play/:gameId — the projector screen of a question game, by game type. Quiz questions can be played the way of
 * another quiz game: /play/:gameId?as=GOLDEN_BELL.
 *
 * It opens on the game's introduction for the class (rules, teams, time, "Bắt đầu"), except when the start page
 * already showed it (`state.skipIntro`) or a Lật ô round of this game is running (back from a tile).
 */
export function PlayGamePage() {
  const { gameId = '' } = useParams()
  const [params] = useSearchParams()
  const loadState = useGameLibraryStore((s) => s.gameStatus[gameId])
  const loadGame = useGameLibraryStore((s) => s.loadGame)
  const game = useGameLibraryStore((s) => s.games.find((g) => g.id === gameId))
  const items = useGameLibraryStore((s) => s.items[gameId] ?? EMPTY)
  const settings = useGameLibraryStore((s) => s.settings[gameId] ?? NO_SETTINGS)
  const updateSettings = useGameLibraryStore((s) => s.updateSettings)
  const templates = useCatalogStore((s) => s.templates)
  const loadTemplates = useCatalogStore((s) => s.load)
  const location = useLocation()
  const [started, setStarted] = useState(
    () => (location.state as { skipIntro?: boolean } | null)?.skipIntro === true || useGridBoardStore.getState().gameId === gameId,
  )
  const start = useCallback(() => setStarted(true), [])
  const leave = useCallback(() => setStarted(false), [])

  // Coming from the editor, the store already holds the latest content: load only if it does not.
  useEffect(() => {
    const state = useGameLibraryStore.getState().gameStatus[gameId]
    if (state !== 'play' && state !== 'edit') void loadGame(gameId, 'play')
    void loadTemplates()
  }, [gameId, loadGame, loadTemplates])
  // A play is counted (reports, the set's plays) once the class starts, not when the introduction is only looked at.
  useBeginPlaySession(started && !!game && (loadState === 'play' || loadState === 'edit'))

  if (loadState === 'missing') return <NotFoundPage />
  if (loadState === 'error') return <LoadError onRetry={() => void loadGame(gameId, 'play')} />
  if (!game || (loadState !== 'play' && loadState !== 'edit')) return <PageLoading />

  const mode = playMode(game.type, params.get('as'))
  if (!isGuideGame(mode)) return <NotFoundPage message="Trò này không có màn chiếu câu hỏi." />

  if (!started) {
    return (
      <ProjectorStage background={PROJECTOR_BOARD_BG}>
        <GameIntro
          mode={mode}
          game={game}
          kindName={templates.find((t) => t.type === mode)?.name ?? ''}
          settings={settings}
          playable={countPlayable(mode, items)}
          onChange={(patch) => updateSettings(gameId, writePlaySettings(settings, patch))}
          onStart={start}
        />
      </ProjectorStage>
    )
  }

  // Lật ô has its own routes for a tile and the results.
  return mode === 'GRID_BOARD' ? (
    <GridBoardPage screen="board" />
  ) : (
    <ProjectorStage background={PROJECTOR_BOARD_BG} music>
      <LeaveGameContext value={leave}>
        <GameScreen mode={mode} game={game} items={items} settings={settings} />
      </LeaveGameContext>
    </ProjectorStage>
  )
}
