import { App, Button, Dropdown } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
import { CalendarIcon, MoreVerticalIcon, PencilIcon, PlayIcon, UserIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { editPath, isGameType } from '@/game-engine/registry'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { gameThumb } from '@/pages/home/homeAssets'
import { PasteQuestionsModal } from '@/pages/question-sets/PasteQuestionsModal'
import { QuestionModal } from '@/pages/question-sets/QuestionModal'
import { SetChips, SubjectThumb } from '@/pages/question-sets/qsUi'
import { SetQuestions } from '@/pages/question-sets/SetQuestions'
import { useQuestionSetDetail } from '@/pages/question-sets/useQuestionSetDetail'
import { useSetActions } from '@/pages/question-sets/useSetActions'
import { useQuestionSetStore } from '@/store/questionSetStore'
import type { QuestionResponse, QuestionSetGameResponse, QuestionType } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { relativeTimeLabel } from '@/utils/dateLabels'
import { compactNumber, dayLabel, USE_GAMES } from '@/utils/questionSets'

/** /question-sets/:code — a set: its details and numbers, its questions, and the games made from it. */
export function QuestionSetPage() {
  const { code = '' } = useParams()
  const { message, modal } = App.useApp()
  const detail = useQuestionSetDetail(code)
  const storeStatus = useQuestionSetStore((s) => s.status)
  const loadSets = useQuestionSetStore((s) => s.load)
  const actions = useSetActions({ onEdited: detail.setData, afterArchive: '/question-sets' })

  /** The question in the form: an existing one, or a new one (number = where it goes). */
  const [writing, setWriting] = useState<{ question?: QuestionResponse; number: number }>()
  const [pasting, setPasting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [lastType, setLastType] = useState<QuestionType>('MULTIPLE_CHOICE')

  // The bank list (to pick another set in "Sử dụng"), when the page is opened directly.
  useEffect(() => {
    if (storeStatus === 'idle') void loadSets()
  }, [storeStatus, loadSets])

  if (detail.status === 'missing') return <NotFoundPage message="Không tìm thấy bộ câu hỏi này (có thể đã bị xóa)." />
  if (detail.status === 'error') return <LoadError onRetry={detail.reload} />
  if (detail.status === 'loading' || !detail.data) return <PageLoading />

  const { summary: set, questions, games } = detail.data
  const empty = questions.length === 0

  const move = async (question: QuestionResponse, step: -1 | 1) => {
    setMoving(true)
    try {
      await detail.moveQuestion(question.id, step)
    } catch (error) {
      message.error(apiErrorMessage(error))
    } finally {
      setMoving(false)
    }
  }

  const confirmDelete = (question: QuestionResponse, number: number) =>
    modal.confirm({
      title: `Xóa câu ${number}?`,
      content: `“${question.text.length > 80 ? `${question.text.slice(0, 80)}…` : question.text}”. Các câu sau sẽ dồn lên.`,
      okText: 'Xóa câu hỏi',
      okButtonProps: { danger: true },
      cancelText: 'Giữ lại',
      onOk: async () => {
        try {
          await detail.deleteQuestion(question.id)
          message.success(`Đã xóa câu ${number}`)
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/question-sets" label="Bộ câu hỏi" />

      <section className="@container rounded-[22px] bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 @min-[760px]:flex-row @min-[760px]:items-start">
          <div className="flex min-w-0 flex-1 gap-4">
            <SubjectThumb subject={set.subject} className="w-[72px] self-start @min-[560px]:w-[120px]" />
            <div className="flex min-w-0 flex-col gap-2">
              <h1 className="m-0 text-[24px] leading-tight font-black break-words @min-[560px]:text-[28px]">{set.title}</h1>
              <SetChips set={set} />
              {set.description && <p className="m-0 text-[14.5px] leading-relaxed text-ink-muted">{set.description}</p>}
              <p className="m-0 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <UserIcon size={14} /> Tạo bởi: {set.ownerName}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarIcon size={14} /> Cập nhật: {dayLabel(set.updatedAt)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              type="primary"
              icon={<PlayIcon size={16} />}
              disabled={empty}
              title={empty ? 'Bộ chưa có câu hỏi' : undefined}
              onClick={() => actions.use(set)}
              className="h-11 flex-1 rounded-[12px] px-5 font-extrabold @min-[760px]:flex-none"
            >
              Sử dụng
            </Button>
            <Button icon={<PencilIcon size={17} />} onClick={() => actions.edit(set)} className="h-11 rounded-[12px] font-bold">
              Sửa<span className="hidden @min-[560px]:inline"> thông tin</span>
            </Button>
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  { key: 'copy', label: 'Nhân bản bộ câu hỏi', onClick: () => actions.copy(set) },
                  { type: 'divider' },
                  { key: 'archive', label: 'Xóa bộ câu hỏi', danger: true, onClick: () => actions.archive(set) },
                ],
              }}
            >
              <Button aria-label="Thêm thao tác" icon={<MoreVerticalIcon size={19} />} className="size-11 shrink-0 rounded-[12px]" />
            </Dropdown>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label="Câu hỏi" value={String(set.questionCount)} hint="trong bộ" accent="#3563E9" />
        <Tile label="Trắc nghiệm" value={String(set.multipleChoiceCount)} hint="cho mọi trò hỏi đáp" accent="#8A2BA8" />
        <Tile label="Tự luận" value={String(set.shortAnswerCount)} hint="cho Lật ô thi đua" accent="#F08A24" />
        <Tile
          label="Lượt sử dụng"
          value={compactNumber(set.useCount)}
          hint={set.useCount ? `chơi ${set.playCount} lần với lớp` : 'chưa tạo trò chơi nào'}
          accent="#1E9E62"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SetQuestions
          questions={questions}
          busy={moving}
          onAdd={() => setWriting({ number: questions.length + 1 })}
          onPaste={() => setPasting(true)}
          onEdit={(question, number) => setWriting({ question, number })}
          onDelete={confirmDelete}
          onMove={(question, step) => void move(question, step)}
        />
        <MadeGames games={games} canUse={!empty} onUse={() => actions.use(set)} />
      </div>

      <QuestionModal
        open={!!writing}
        question={writing?.question}
        number={writing?.number ?? 1}
        defaultType={lastType}
        onClose={() => setWriting(undefined)}
        onSave={async (request) => {
          setLastType(request.type)
          if (writing?.question) await detail.updateQuestion(writing.question.id, request)
          else await detail.addQuestions([request])
        }}
      />
      <PasteQuestionsModal
        open={pasting}
        questionCount={questions.length}
        onClose={() => setPasting(false)}
        onAdd={detail.addQuestions}
      />
      {actions.dialogs}
    </div>
  )
}

function Tile({ label, value, hint, accent }: { label: string; value: string; hint: ReactNode; accent: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[18px] bg-white p-4 sm:p-5">
      <span className="flex items-center gap-2 text-[14px] font-bold text-ink-soft">
        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: accent }} />
        {label}
      </span>
      <span className="text-[24px] leading-tight font-black tabular-nums sm:text-[26px]">{value}</span>
      <span className="truncate text-[13px] text-ink-muted">{hint}</span>
    </div>
  )
}

/** "Trò chơi đã tạo": games made from the set, to open in the editor or play. */
function MadeGames({ games, canUse, onUse }: { games: QuestionSetGameResponse[]; canUse: boolean; onUse: () => void }) {
  const gameName = (code: string) => USE_GAMES.find((g) => g.code === code)?.name ?? code
  return (
    <section aria-labelledby="made-games" className="rounded-[20px] bg-white p-4 sm:p-5">
      <h2 id="made-games" className="m-0 text-[17px] font-black">
        Trò chơi đã tạo
      </h2>
      {games.length === 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="m-0 text-[14px] leading-relaxed text-ink-muted">
            Chưa có trò chơi nào từ bộ này. Bấm “Sử dụng” để chơi các câu hỏi với Trắc nghiệm, Rung chuông vàng, Đua thuyền hay Lật ô.
          </p>
          <Button type="primary" ghost icon={<PlayIcon size={15} />} onClick={onUse} disabled={!canUse} className="w-fit rounded-full font-bold">
            Sử dụng
          </Button>
        </div>
      ) : (
        <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
          {games.map((g) => (
            <li key={g.code}>
              <Link
                to={editPath(g.code)}
                className="flex items-center gap-3 rounded-[14px] border border-line-soft p-2 pr-3 text-ink transition hover:border-[#C9D9F5] hover:text-ink"
              >
                {isGameType(g.templateCode) && <img src={gameThumb(g.templateCode)} alt="" className="aspect-[2/1] w-[88px] shrink-0 rounded-[10px]" />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14.5px] font-bold">{gameName(g.templateCode)}</span>
                  <span className="truncate text-[12.5px] text-ink-muted">Tạo {relativeTimeLabel(g.createdAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
