import { App, Tooltip } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { BulbIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { BulkPasteModal } from '@/editor/BulkPasteModal'
import { EDITOR_DEFINITIONS } from '@/editor/editorDefinitions'
import { QuestionList } from '@/editor/QuestionList'
import { gameRegistry, playPath } from '@/game-engine/registry'
import { useCatalogStore, useTemplateName } from '@/store/catalogStore'
import { useGameLibraryStore, type SaveState } from '@/store/gameLibraryStore'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { ItemDraft } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
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
  const templateName = useTemplateName(game?.type)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)

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
        <Tooltip title={playable ? undefined : 'Màn chiếu cho trò này đang được hoàn thiện'}>
          {playable ? (
            <Link
              to={playPath(game)}
              className="flex min-h-[52px] items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-extrabold text-white hover:text-white hover:brightness-110"
            >
              Xong, chơi thử
              <ChevronRightIcon size={20} />
            </Link>
          ) : (
            <span className="flex min-h-[52px] cursor-not-allowed items-center gap-2 rounded-full bg-line px-7 py-3.5 font-extrabold text-ink-soft">
              Xong, chơi thử
              <ChevronRightIcon size={20} />
            </span>
          )}
        </Tooltip>
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
                item: selected,
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
