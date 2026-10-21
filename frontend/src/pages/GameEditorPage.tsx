import { App, Dropdown, Tooltip } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { BulbIcon, ChevronDownIcon, ChevronLeftIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { BulkPasteModal } from '@/editor/BulkPasteModal'
import { EDITOR_DEFINITIONS } from '@/editor/editorDefinitions'
import { QuestionList } from '@/editor/QuestionList'
import { countPlayable, isGuideGame } from '@/game-engine/gameGuide'
import { gameRegistry, isQuizFamily, playPath, QUIZ_FAMILY, startPath } from '@/game-engine/registry'
import { useCatalogStore, useTemplateName } from '@/store/catalogStore'
import { useGameLibraryStore, type SaveState } from '@/store/gameLibraryStore'
import { useSettingsStore } from '@/store/settingsStore'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { GameType, ItemDraft } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { enterFullscreen } from '@/utils/fullscreen'
import { itemCodec } from '@/utils/gameItems'

const EMPTY: never[] = []

const SAVE_LABELS: Record<SaveState, string> = {
  saved: 'Đã tự động lưu',
  saving: 'Đang lưu…',
  error: 'Chưa lưu được',
}

export function GameEditorPage() {
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
    if (saveState === 'error') message.error('Chưa lưu được thay đổi vừa rồi, đã tải lại bản trên máy chủ.')
  }, [saveState, message])

  // Edit only once the draft is open: before that, item ids may still change.
  if (loadState === 'missing') return <NotFoundPage />
  if (loadState === 'error') return <LoadError onRetry={() => void loadGame(gameId, 'edit')} />
  if (loadState !== 'edit' || !game) return <PageLoading />
  const definition = EDITOR_DEFINITIONS[game.type]
  const codec = itemCodec(game.type)
  if (!gameRegistry[game.type].hasEditor || !definition || !codec) {
    return <NotFoundPage message="Trình soạn câu hỏi cho trò này đang được hoàn thiện." />
  }

  const noun = definition.noun.toLowerCase()
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
      title: `${unfinished} ${noun} chưa đủ nội dung`,
      content: `${unfinished === 1 ? 'Mục' : 'Các mục'} đó sẽ được bỏ qua khi chơi. Chơi ${ready} ${noun} đã xong, hay sửa tiếp?`,
      okText: `Chơi ${ready} ${noun}`,
      cancelText: 'Sửa tiếp',
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
      title: `Xóa ${noun} ${selectedIndex + 1}?`,
      content: codec.summary(selected) || definition.blankLabel,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Giữ lại',
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
            aria-label="Quay lại"
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-ink hover:text-primary-ink"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <input
              aria-label="Tên trò chơi"
              value={game.title}
              onChange={(e) => renameGame(gameId, e.target.value)}
              className="w-full min-w-0 rounded-lg border-0 bg-transparent font-display text-[28px] leading-[1.15] font-extrabold text-ink outline-none focus:bg-white"
            />
            <span className={`text-base ${saveState === 'error' ? 'text-danger' : 'text-ink-soft'}`}>
              {[templateName, SAVE_LABELS[saveState]].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isQuizFamily(game.type) && (
            // The same questions can be played as any quiz game.
            <Dropdown
              trigger={['click']}
              menu={{
                items: QUIZ_FAMILY.filter((t) => t !== game.type).map((t) => ({
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
                Chơi kiểu khác
                <ChevronDownIcon size={18} />
              </button>
            </Dropdown>
          )}
          <Link to={startPath(game)} className="px-2 text-[15px] font-bold text-ink-soft hover:text-primary-ink">
            Luật chơi & cài đặt
          </Link>
          <Tooltip
            title={
              !playable ? 'Màn chiếu cho trò này đang được hoàn thiện' : ready === 0 ? `Chưa có ${noun} nào đủ nội dung để chơi` : undefined
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
              Chơi · {ready} {noun}
            </button>
          </Tooltip>
        </div>
      </header>

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
              <span className="font-display text-[26px] font-extrabold">Chưa có {noun} nào</span>
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
              Mẹo: cô có thể{' '}
              <button
                type="button"
                onClick={() => setPasteOpen(true)}
                className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-extrabold text-primary-ink underline"
              >
                dán nhiều dòng cùng lúc
              </button>
              . {definition.paste.hint}
            </span>
          </div>
        </main>
      </div>

      <BulkPasteModal
        open={pasteOpen}
        paste={definition.paste}
        onClose={() => setPasteOpen(false)}
        onAdd={async (drafts) => {
          const created = await add(drafts)
          if (created.length) message.success(`Đã thêm ${created.length} ${definition.paste.unit}`)
        }}
      />
    </div>
  )
}
