import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { ArrowLeftIcon, ArrowRightIcon, ChevronLeftIcon, GamepadFilledIcon, PencilIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { countPlayable, gameGuide, isGuideGame } from '@/game-engine/gameGuide'
import { editPath, gameRegistry, playMode, playPath } from '@/game-engine/registry'
import { PLAY_DEFAULTS, readPlaySettings, writePlaySettings, type PlaySettings } from '@/game-engine/shared/gameSettings'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { QUICK_SETTINGS } from '@/pages/game-start/quickSettings'
import { RulesShow } from '@/pages/game-start/RulesShow'
import { GameInfoCard, PreviewCard, QuickSettingsCard, RulesCard, StepsCard, TeacherTipsCard } from '@/pages/game-start/StartParts'
import { useCatalogStore } from '@/store/catalogStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { GameItem } from '@/types/game'
import { enterFullscreen } from '@/utils/fullscreen'

const EMPTY: GameItem[] = []
const NO_SETTINGS: Record<string, unknown> = {}

/**
 * /games/:gameId/start — before a question game goes on the projector: what the game is, its rules and how a round
 * goes (written from the settings it is played with), a preview of the real screen and the settings worth a last
 * look. "Trình chiếu luật chơi" shows the rules to the class; "Bắt đầu" opens the projector. `?as=` plays quiz
 * questions the way of another quiz game, as on /play.
 */
export function GameStartPage() {
  const { gameId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const fullscreenOnStart = useSettingsStore((s) => s.settings.display.fullscreenOnStart)
  const location = useLocation()
  const loadState = useGameLibraryStore((s) => s.gameStatus[gameId])
  const loadGame = useGameLibraryStore((s) => s.loadGame)
  const game = useGameLibraryStore((s) => s.games.find((g) => g.id === gameId))
  const items = useGameLibraryStore((s) => s.items[gameId] ?? EMPTY)
  const settings = useGameLibraryStore((s) => s.settings[gameId] ?? NO_SETTINGS)
  const saving = useGameLibraryStore((s) => s.saveState === 'saving')
  const updateSettings = useGameLibraryStore((s) => s.updateSettings)
  const templates = useCatalogStore((s) => s.templates)
  const loadTemplates = useCatalogStore((s) => s.load)
  const teacher = useTeacherStore((s) => s.teacher)
  const loadTeacher = useTeacherStore((s) => s.load)
  const [showing, setShowing] = useState(false)
  const closeShow = useCallback(() => setShowing(false), [])

  // Always the server's latest version: the teacher may have edited it elsewhere.
  useEffect(() => {
    void loadGame(gameId, 'play')
    void loadTemplates()
    void loadTeacher()
  }, [gameId, loadGame, loadTemplates, loadTeacher])

  if (loadState === 'missing') return <NotFoundPage />
  if (loadState === 'error') return <LoadError onRetry={() => void loadGame(gameId, 'play')} />
  if (!game || (loadState !== 'play' && loadState !== 'edit')) return <PageLoading />

  const mode = playMode(game.type, params.get('as'))
  // Tools have no rules to explain: they open as before.
  if (!isGuideGame(mode)) return <Navigate to={playPath(game)} replace />

  const guide = gameGuide(mode, settings)
  const current: PlaySettings = readPlaySettings(settings, mode === 'GRID_BOARD' ? {} : PLAY_DEFAULTS[mode])
  const playable = countPlayable(mode, items)
  const unit = gameRegistry[mode].itemUnit
  const template = templates.find((t) => t.type === mode)
  const playUrl = mode === game.type ? playPath(game) : `${playPath(game)}?as=${mode}`
  const changeSettings = (patch: Partial<PlaySettings>) => updateSettings(gameId, writePlaySettings(settings, patch))
  // Go back where the teacher came from; on a direct visit fall back to the game library.
  const goBack = () => (location.key === 'default' ? navigate('/games/new') : navigate(-1))

  const itemsLabel =
    playable === items.length ? `${playable} ${unit}` : `${playable}/${items.length} ${unit} dùng được`

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[20px] bg-[linear-gradient(120deg,#E6F0FF_0%,#F3F8FF_60%,#FFF6DA_100%)] px-5 py-5 sm:px-7">
        <div className="flex min-w-[min(100%,300px)] flex-1 items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="Quay lại"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-ink hover:text-primary-ink"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <span className="hidden size-[52px] shrink-0 items-center justify-center rounded-[16px] bg-primary text-white sm:flex">
            <GamepadFilledIcon size={30} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 text-[28px] leading-tight font-black text-[#1A2440] sm:text-[32px]">Bắt đầu trò chơi</h1>
            <p className="m-0 text-[14.5px] text-ink-soft">
              Xem lại luật chơi, cách chơi và thông tin để truyền đạt cho học sinh trước khi bắt đầu.
            </p>
          </div>
        </div>
        {/* Above the title on phones, so the title keeps the full width. */}
        <div className="order-first ml-auto sm:order-none">
          <TopBar teacherName={teacher?.name ?? ''} initial={teacher?.shortName.charAt(0).toUpperCase() ?? ''} />
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="flex min-w-0 flex-col gap-5">
          <GameInfoCard mode={mode} game={game} kind={template?.name ?? ''} description={template?.description ?? ''} items={itemsLabel} />
          <RulesCard guide={guide} onProject={() => setShowing(true)} />
          <StepsCard guide={guide} />
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <PreviewCard mode={mode} game={game} items={items} settings={settings} />
          <QuickSettingsCard settings={QUICK_SETTINGS[mode]} current={current} saving={saving} onChange={changeSettings} />
          <TeacherTipsCard notes={guide.teacherNotes} />
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-white/90 px-4 py-3 shadow-[0_-4px_18px_rgba(31,42,68,0.06)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="flex h-[46px] cursor-pointer items-center gap-2 rounded-[12px] border border-primary bg-white px-5 font-[inherit] text-[15px] font-bold text-primary hover:bg-primary-soft"
          >
            <ArrowLeftIcon size={18} />
            Quay lại
          </button>
          <Link
            to={editPath(game.id)}
            className="hidden h-[46px] items-center gap-2 rounded-[12px] px-4 text-[15px] font-bold text-ink-soft hover:text-primary sm:flex"
          >
            <PencilIcon size={18} />
            Sửa nội dung
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {playable === 0 && <span className="text-[14px] font-semibold text-danger">Chưa có {unit} nào đủ nội dung để chơi.</span>}
          {/* Phones have the one in the rules card. */}
          <button
            type="button"
            onClick={() => setShowing(true)}
            className="hidden h-[46px] cursor-pointer items-center rounded-[12px] border-0 bg-primary-soft px-5 font-[inherit] text-[15px] font-bold text-primary-ink hover:brightness-95 sm:flex"
          >
            Trình chiếu luật chơi
          </button>
          {playable > 0 ? (
            <Link
              to={playUrl}
              onClick={() => {
                if (fullscreenOnStart) enterFullscreen()
              }}
              className="flex h-[46px] items-center gap-2 rounded-[12px] bg-primary px-6 text-[15px] font-bold text-white hover:text-white hover:brightness-110"
            >
              Bắt đầu trò chơi
              <ArrowRightIcon size={18} />
            </Link>
          ) : (
            <span aria-disabled="true" className="flex h-[46px] cursor-not-allowed items-center gap-2 rounded-[12px] bg-line px-6 text-[15px] font-bold text-ink-soft">
              Bắt đầu trò chơi
              <ArrowRightIcon size={18} />
            </span>
          )}
        </div>
      </div>

      {showing && <RulesShow mode={mode} title={game.title} guide={guide} onClose={closeShow} />}
    </div>
  )
}
