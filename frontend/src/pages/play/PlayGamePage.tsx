import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router'
import { PROJECTOR_BOARD_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { countPlayable, gameGuide, isGuideGame } from '@/game-engine/gameGuide'
import { useBeginPlaySession } from '@/game-engine/shared/usePlaySession'
import { writePlaySettings } from '@/game-engine/shared/gameSettings'
import { playMode } from '@/game-engine/registry'
import { RulesShow } from '@/pages/game-start/RulesShow'
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
 * already showed it (`state.skipIntro`) or a Lật ô round of this game is running (back from a tile). While playing,
 * "?" shows the rules again.
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
  const [showRules, setShowRules] = useState(false)
  const start = useCallback(() => setStarted(true), [])
  const closeRules = useCallback(() => setShowRules(false), [])

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
  const rules = showRules && (
    <RulesShow mode={mode} title={game.title} guide={gameGuide(mode, settings)} onClose={closeRules} fullscreen={false} />
  )

  if (!started) {
    return (
      <ProjectorStage background={PROJECTOR_BOARD_BG}>
        <GameIntro
          mode={mode}
          game={game}
          kindName={templates.find((t) => t.type === mode)?.name ?? ''}
          settings={settings}
          playable={countPlayable(mode, items)}
          paused={showRules}
          onChange={(patch) => updateSettings(gameId, writePlaySettings(settings, patch))}
          onStart={start}
          onShowRules={() => setShowRules(true)}
        />
        {rules}
      </ProjectorStage>
    )
  }

  return (
    <>
      {/* Lật ô has its own routes for a tile and the results. */}
      {mode === 'GRID_BOARD' ? (
        <GridBoardPage screen="board" />
      ) : (
        <ProjectorStage background={PROJECTOR_BOARD_BG} music>
          <GameScreen mode={mode} game={game} items={items} settings={settings} />
        </ProjectorStage>
      )}
      <RulesButton onClick={() => setShowRules(true)} />
      {rules}
    </>
  )
}

/** "?" next to the speaker button: the rules again, for a class that forgot them. */
function RulesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Xem luật chơi"
      title="Xem luật chơi"
      className="fixed bottom-3 left-16 z-50 flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-white/80 font-[inherit] text-[22px] font-black text-ink shadow-md backdrop-blur hover:bg-white"
    >
      ?
    </button>
  )
}
