import { App, Tooltip } from 'antd'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { BulbIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'
import { BulkPasteModal } from '@/editor/BulkPasteModal'
import { QuestionForm } from '@/editor/QuestionForm'
import { QuestionList } from '@/editor/QuestionList'
import { gameRegistry } from '@/game-engine/registry'
import { GAME_TEMPLATES } from '@/mocks/demoData'
import { emptyQuestion, useGameLibraryStore } from '@/store/gameLibraryStore'
import { NotFoundPage } from '@/pages/NotFoundPage'

const EMPTY: never[] = []

export function GameEditorPage() {
  const { gameId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { modal, message } = App.useApp()

  const game = useGameLibraryStore((s) => s.games.find((g) => g.id === gameId))
  const questions = useGameLibraryStore((s) => s.questions[gameId] ?? EMPTY)
  const renameGame = useGameLibraryStore((s) => s.renameGame)
  const addQuestions = useGameLibraryStore((s) => s.addQuestions)
  const updateQuestion = useGameLibraryStore((s) => s.updateQuestion)
  const removeQuestion = useGameLibraryStore((s) => s.removeQuestion)
  const reorderQuestions = useGameLibraryStore((s) => s.reorderQuestions)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)

  if (!game) return <NotFoundPage />

  const selectedIndex = Math.max(
    0,
    questions.findIndex((q) => q.id === selectedId),
  )
  const selected = questions[selectedIndex]
  const playable = gameRegistry[game.type].playable
  const templateName = GAME_TEMPLATES.find((t) => t.type === game.type)?.name

  const addQuestion = () => {
    const [created] = addQuestions(gameId, [emptyQuestion()])
    setSelectedId(created.id)
  }

  const goNext = () => {
    const next = questions[selectedIndex + 1]
    if (next) setSelectedId(next.id)
    else addQuestion()
  }

  const confirmDelete = () => {
    if (!selected) return
    modal.confirm({
      title: `Xóa câu hỏi ${selectedIndex + 1}?`,
      content: selected.text || 'Câu hỏi chưa có nội dung',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Giữ lại',
      onOk: () => {
        const neighbour = questions[selectedIndex + 1] ?? questions[selectedIndex - 1]
        removeQuestion(gameId, selected.id)
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
            <span className="text-base text-ink-soft">{templateName} · Đã tự động lưu</span>
          </div>
        </div>
        <Tooltip title={playable ? undefined : 'Màn chiếu cho trò này đang được hoàn thiện'}>
          {playable ? (
            <Link
              to={`/play/${gameId}`}
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
          questions={questions}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onAdd={addQuestion}
          onReorder={(ids) => reorderQuestions(gameId, ids)}
        />

        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          {selected ? (
            <QuestionForm
              key={selected.id}
              question={selected}
              number={selectedIndex + 1}
              isLast={selectedIndex === questions.length - 1}
              onChange={(patch) => updateQuestion(gameId, selected.id, patch)}
              onDelete={confirmDelete}
              onNext={goNext}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white p-10 text-center">
              <span className="font-display text-[26px] font-extrabold">Chưa có câu hỏi nào</span>
              <button
                type="button"
                onClick={addQuestion}
                className="min-h-[52px] cursor-pointer rounded-full border-0 bg-sun px-7 font-[inherit] font-extrabold text-ink"
              >
                Thêm câu hỏi đầu tiên
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
                dán nhiều câu hỏi cùng lúc
              </button>
              , mỗi dòng một câu. Đáp án đặt sau dấu “=”.
            </span>
          </div>
        </main>
      </div>

      <BulkPasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onAdd={(drafts) => {
          const created = addQuestions(gameId, drafts)
          if (created[0]) setSelectedId(created[0].id)
          message.success(`Đã thêm ${created.length} câu hỏi`)
        }}
      />
    </div>
  )
}
