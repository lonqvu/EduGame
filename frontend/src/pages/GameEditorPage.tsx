import { App, Dropdown, Tooltip } from 'antd'
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { BulbIcon, ChevronDownIcon, ChevronLeftIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { BulkPasteModal } from '@/editor/BulkPasteModal'
import { EDITOR_DEFINITIONS } from '@/editor/editorDefinitions'
import { QuestionList } from '@/editor/QuestionList'
import { countPlayable, isGuideGame } from '@/game-engine/gameGuide'
import { alsoPlayableAs, gameRegistry, playPath, startPath } from '@/game-engine/registry'
import { useAuthStore } from '@/store/authStore'
import { useCatalogStore, useTemplateName } from '@/store/catalogStore'
import { useGameLibraryStore, type SaveState } from '@/store/gameLibraryStore'
import { useSettingsStore } from '@/store/settingsStore'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { GameType, ItemDraft } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { enterFullscreen } from '@/utils/fullscreen'
import { itemCodec } from '@/utils/gameItems'

const EMPTY: never[] = []

/** Keys of the save state in the header (editor.page.*). */
const SAVE_LABELS = { saved: 'saved', saving: 'saving', error: 'saveError' } as const satisfies Record<SaveState, string>

export function GameEditorPage() {
  const { t } = useTranslation()
  const { gameId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { modal, message } = App.useApp()

  const loadState = useGameLibraryStore((s) => s.gameStatus[gameId])
  const loadGame = useGameLibraryStore((s) => s.loadGame)
  const saveState = useGameLibraryStore((s) => s.saveState)
  const game = useGameLibraryStore((s) => s.games.find((g) => g.id === gameId))
  const items = useGameLibraryStore((s) => s.items[gameId] ?? EMPTY)
  const renameGame = useGameLibraryStore((s) => s.renameGame)
  const addItems = useGameLibraryStore((s) => s.addItems)
  const updateItem = useGameLibraryStore((s) => s.updateItem)
  const removeItem = useGameLibraryStore((s) => s.removeItem)
  const reorderItems = useGameLibraryStore((s) => s.reorderItems)
  const loadTemplates = useCatalogStore((s) => s.load)
  const templates = useCatalogStore((s) => s.templates)
  const templateName = useTemplateName(game?.type)
  const guest = useAuthStore((s) => s.status !== 'signedIn')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  // "Dán từ Word / Excel" from the game chooser opens the paste dialog at once.
  const [pasteOpen, setPasteOpen] = useState(() => (location.state as { paste?: boolean } | null)?.paste === true)
  const fullscreenOnStart = useSettingsStore((s) => s.settings.display.fullscreenOnStart)

  useEffect(() => {
    void loadGame(gameId, 'edit')
    void loadTemplates()
  }, [gameId, loadGame, loadTemplates])

  // The store reloads the game right after a failed save, so the header label alone is easy to miss.
  useEffect(() => {
    if (saveState === 'error') message.error(t('editor.page.saveFailed'))
  }, [saveState, message, t])

  // Edit only once the draft is open: before that, item ids may still change.
  if (loadState === 'missing') return <NotFoundPage />
  if (loadState === 'error') return <LoadError onRetry={() => void loadGame(gameId, 'edit')} />
  if (loadState !== 'edit' || !game) return <PageLoading />
  const definition = EDITOR_DEFINITIONS[game.type]
  const codec = itemCodec(game.type)
  if (!gameRegistry[game.type].hasEditor || !definition || !codec) {
    return <NotFoundPage message={t('editor.page.notReady')} />
  }

  const noun = definition.nounLower
  const selectedIndex = Math.max(
    0,
    items.findIndex((q) => q.id === selectedId),
  )
  const selected = items[selectedIndex]
  const playable = gameRegistry[game.type].playable
  const ready = isGuideGame(game.type) ? countPlayable(game.type, items) : items.length
  const unfinished = items.length - ready

  /** On the projector at once (its introduction shows the rules); unfinished items are left out, so say so first. */
  const play = (as?: GameType) => {
    const go = () => {
      if (fullscreenOnStart) enterFullscreen()
      navigate(as ? `${playPath(game)}?as=${as}` : playPath(game))
    }
    if (!unfinished) {
      go()
      return
    }
    modal.confirm({
      title: t('editor.page.unfinished', { items: definition.count(unfinished) }),
      content: t('editor.page.unfinishedText', { count: unfinished, ready: definition.count(ready) }),
      okText: t('editor.page.playReady', { ready: definition.count(ready) }),
      cancelText: t('editor.page.keepEditing'),
      onOk: go,
    })
  }

  const add = async (drafts: ItemDraft[]) => {
    try {
      const created = await addItems(gameId, drafts)
      if (created[0]) setSelectedId(created[0].id)
      return created
    } catch (error) {
      message.error(apiErrorMessage(error))
      return []
    }
  }

  const addItem = () => void add([definition.newItem()])

  const goNext = () => {
    const next = items[selectedIndex + 1]
    if (next) setSelectedId(next.id)
    // A new quiz question is of the same kind (choice / true-false) as the current one.
    else {
      const trueFalse = selected && 'trueFalse' in selected && selected.trueFalse
      void add([(trueFalse && definition.extraAdds?.[0]?.newItem()) || definition.newItem()])
    }
  }

  const confirmDelete = () => {
    if (!selected) return
    modal.confirm({
      title: t('editor.page.deleteConfirm', { noun, number: selectedIndex + 1 }),
      content: codec.summary(selected) || definition.blankLabel,
      okText: t('common.delete'),
      okButtonProps: { danger: true },
      cancelText: t('classes.keep'),
      onOk: () => {
        const neighbour = items[selectedIndex + 1] ?? items[selectedIndex - 1]
        removeItem(gameId, selected.id)
        setSelectedId(neighbour?.id ?? null)
      },
    })
  }

  // Go back where the teacher came from; on a direct visit fall back to the home page.
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <button
            type="button"
            onClick={goBack}
            aria-label={t('editor.page.back')}
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-ink hover:text-primary-ink"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <input
              aria-label={t('editor.page.name')}
              value={game.title}
              onChange={(e) => renameGame(gameId, e.target.value)}
              className="w-full min-w-0 rounded-lg border-0 bg-transparent font-display text-[28px] leading-[1.15] font-extrabold text-ink outline-none focus:bg-white"
            />
            <span className={`text-base ${saveState === 'error' ? 'text-danger' : 'text-ink-soft'}`}>
              {[templateName, guest ? t('editor.page.guestUnsaved') : t(`editor.page.${SAVE_LABELS[saveState]}`)].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {alsoPlayableAs(game.type).length > 0 && (
            // The same questions can be played as another game of their kind.
            <Dropdown
              trigger={['click']}
              menu={{
                items: alsoPlayableAs(game.type).map((t) => ({
                  key: t,
                  onClick: () => play(t),
                  label: (
                    <span className="text-base font-bold">{templates.find((tpl) => tpl.type === t)?.name ?? t}</span>
                  ),
                })),
              }}
            >
              <button
                type="button"
                className="flex min-h-[52px] cursor-pointer items-center gap-2 rounded-full border-0 bg-white px-6 font-[inherit] font-extrabold text-ink hover:text-primary-ink"
              >
                {t('editor.page.playAs')}
                <ChevronDownIcon size={18} />
              </button>
            </Dropdown>
          )}
          <Link to={startPath(game)} className="px-2 text-[15px] font-bold text-ink-soft hover:text-primary-ink">
            {t('editor.page.rulesSettings')}
          </Link>
          <Tooltip
            title={
              !playable ? t('editor.page.projectorSoon') : ready === 0 ? t('editor.page.noneReady', { noun }) : undefined
            }
          >
            <button
              type="button"
              onClick={() => play()}
              disabled={!playable || ready === 0}
              className="flex min-h-[52px] cursor-pointer items-center gap-2 rounded-full border-0 bg-primary px-7 py-3.5 font-[inherit] font-extrabold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft disabled:hover:brightness-100"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
              </svg>
              {t('editor.page.play', { items: definition.count(ready) })}
            </button>
          </Tooltip>
        </div>
      </header>
      {guest && (
        // Not signed in: what is typed here plays at once, but is not kept.
        <p role="note" className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[16px] bg-[#FFF4D6] px-5 py-3.5 text-[15px] text-[#6B4A00]">
          <span>
            <Trans i18nKey="editor.page.guestNotice" components={{ b: <strong /> }} />
          </span>
          <Link to="/login" className="font-extrabold text-primary-ink underline">
            {t('editor.page.guestSignIn')}
          </Link>
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <QuestionList
          items={items}
          noun={definition.noun}
          summary={codec.summary}
          blankLabel={definition.blankLabel}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          addActions={[
            { label: definition.addLabel, onClick: addItem },
            ...(definition.extraAdds ?? []).map((extra) => ({
              label: extra.label,
              onClick: () => void add([extra.newItem()]),
            })),
          ]}
          onReorder={(ids) => reorderItems(gameId, ids)}
        />

        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          {selected ? (
            <div key={selected.id} className="contents">
              {definition.form({
                gameId,
                item: selected,
                items,
                number: selectedIndex + 1,
                isLast: selectedIndex === items.length - 1,
                onChange: (patch) => updateItem(gameId, selected.id, patch),
                onDelete: confirmDelete,
                onNext: goNext,
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white p-10 text-center">
              <span className="font-display text-[26px] font-extrabold">{t('editor.page.empty', { noun })}</span>
              <button
                type="button"
                onClick={addItem}
                className="min-h-[52px] cursor-pointer rounded-full border-0 bg-sun px-7 font-[inherit] font-extrabold text-ink"
              >
                {definition.addLabel}
              </button>
            </div>
          )}

          <div className="flex items-start gap-3.5 rounded-[22px] bg-sun-pale px-[22px] py-[18px]">
            <BulbIcon size={26} className="mt-0.5 shrink-0 text-[#8A6400]" />
            <span className="text-[17px]">
              <Trans
                i18nKey="editor.page.tip"
                components={{
                  paste: (
                    <button
                      type="button"
                      onClick={() => setPasteOpen(true)}
                      className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-extrabold text-primary-ink underline"
                    />
                  ),
                }}
              />
              . {definition.paste.hint}
            </span>
          </div>
        </main>
      </div>

      <BulkPasteModal
        open={pasteOpen}
        paste={definition.paste}
        count={definition.count}
        onClose={() => setPasteOpen(false)}
        onAdd={async (drafts) => {
          const created = await add(drafts)
          if (created.length) message.success(t('editor.page.added', { items: definition.count(created.length) }))
        }}
      />
    </div>
  )
}
