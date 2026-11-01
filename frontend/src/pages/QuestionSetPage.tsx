import { App, Button, Dropdown } from 'antd'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import * as questionSetApi from '@/api/questionSetApi'
import { BackLink } from '@/components/ui/BackLink'
import { MoreVerticalIcon, PencilIcon, PlayIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { isGameType, playPath } from '@/game-engine/registry'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { gameThumb } from '@/pages/home/homeAssets'
import { PasteQuestionsModal } from '@/pages/question-sets/PasteQuestionsModal'
import { SubjectThumb } from '@/pages/question-sets/qsUi'
import { SetQuestions } from '@/pages/question-sets/SetQuestions'
import { useQuestionSetDetail } from '@/pages/question-sets/useQuestionSetDetail'
import { useSetActions } from '@/pages/question-sets/useSetActions'
import { useQuestionSetStore } from '@/store/questionSetStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { QuestionGameCode, QuestionResponse, QuestionSetGameResponse, QuestionSetSummaryResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { relativeTimeLabel } from '@/utils/dateLabels'
import { enterFullscreen } from '@/utils/fullscreen'
import { gradeText, subjectInfo, usableCount, USE_GAMES } from '@/utils/questionSets'

/** Games offered at once beside the questions: the most played ones. */
const QUICK_GAMES: QuestionGameCode[] = ['QUIZ', 'GOLDEN_BELL', 'BOAT_RACE', 'GRID_BOARD']

/** /question-sets/:code — a set: its details and numbers, its questions, and the games made from it. */
export function QuestionSetPage() {
  const { code = '' } = useParams()
  const { message, modal } = App.useApp()
  const detail = useQuestionSetDetail(code)
  const storeStatus = useQuestionSetStore((s) => s.status)
  const loadSets = useQuestionSetStore((s) => s.load)
  const actions = useSetActions({ onEdited: detail.setData, afterArchive: '/question-sets' })

  const [pasting, setPasting] = useState(false)
  const [moving, setMoving] = useState(false)

  // The bank list (to pick another set in "Chơi"), when the page is opened directly.
  useEffect(() => {
    if (storeStatus === 'idle') void loadSets()
  }, [storeStatus, loadSets])

  if (detail.status === 'missing') return <NotFoundPage message="Không tìm thấy bộ câu hỏi này (có thể đã bị xóa)." />
  if (detail.status === 'error') return <LoadError onRetry={detail.reload} />
  if (detail.status === 'loading' || !detail.data) return <PageLoading />

  const { summary: set, questions, games } = detail.data
  const empty = questions.length === 0

  const reorder = async (ids: number[]) => {
    setMoving(true)
    try {
      await detail.reorderQuestions(ids)
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

      <section className="@container rounded-[22px] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 @min-[760px]:flex-row @min-[760px]:items-center">
          <div className="flex min-w-0 flex-1 gap-4">
            <SubjectThumb subject={set.subject} className="w-[72px] self-start @min-[560px]:w-[92px]" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="m-0 text-[24px] leading-tight font-black break-words @min-[560px]:text-[27px]">{set.title}</h1>
              {set.description && <p className="m-0 text-[14px] leading-relaxed text-ink-muted">{set.description}</p>}
              <SetFacts set={set} />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              type="primary"
              icon={<PlayIcon size={16} />}
              disabled={empty}
              title={empty ? 'Bộ chưa có câu hỏi' : undefined}
              onClick={() => actions.use(set)}
              className="h-11 flex-1 rounded-full px-5 font-extrabold @min-[760px]:flex-none"
            >
              Chơi
            </Button>
            <Button icon={<PencilIcon size={17} />} onClick={() => actions.edit(set)} className="h-11 rounded-full font-bold">
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
              <Button aria-label="Thêm thao tác" icon={<MoreVerticalIcon size={19} />} className="size-11 shrink-0 rounded-full" />
            </Dropdown>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SetQuestions
          questions={questions}
          busy={moving}
          onPaste={() => setPasting(true)}
          onSave={async (request, question) => {
            if (question) await detail.updateQuestion(question.id, request)
            else await detail.addQuestions([request])
          }}
          onDelete={confirmDelete}
          onReorder={(ids) => void reorder(ids)}
        />
        <div className="flex flex-col gap-5">
          {!empty && <PlayWith set={set} onMore={() => actions.use(set)} />}
          <MadeGames games={games} />
        </div>
      </div>

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

/** Subject, grade, how many questions of each kind, how often played: one line of chips. */
function SetFacts({ set }: { set: QuestionSetSummaryResponse }) {
  const subject = subjectInfo(set.subject)
  const kinds = [set.multipleChoiceCount && `${set.multipleChoiceCount} trắc nghiệm`, set.shortAnswerCount && `${set.shortAnswerCount} tự luận`]
    .filter(Boolean)
    .join(' · ')
  return (
    <span className="flex flex-wrap gap-1.5">
      <Fact style={{ background: subject.tint, color: subject.ink }}>{subject.label}</Fact>
      <Fact>{gradeText(set.grade)}</Fact>
      <Fact>{set.questionCount ? `${set.questionCount} câu: ${kinds}` : 'Chưa có câu hỏi'}</Fact>
      <Fact>{set.useCount ? `Đã tạo ${set.useCount} trò, chơi ${set.playCount} lần với lớp` : 'Chưa chơi lần nào'}</Fact>
    </span>
  )
}

function Fact({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={style} className="rounded-full bg-chip px-2.5 py-0.5 text-[12.5px] font-extrabold text-[#3D4766]">
      {children}
    </span>
  )
}

/** "Chơi bộ này với": the most played games, each made from the set and opened on the projector in one tap. */
function PlayWith({ set, onMore }: { set: QuestionSetSummaryResponse; onMore: () => void }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const fullscreenOnStart = useSettingsStore((s) => s.settings.display.fullscreenOnStart)
  const upsert = useQuestionSetStore((s) => s.upsert)
  const [making, setMaking] = useState<QuestionGameCode | null>(null)

  const play = async (game: QuestionGameCode) => {
    if (making) return
    // Asked inside the click: browsers only allow full screen right after a click.
    if (fullscreenOnStart) enterFullscreen()
    setMaking(game)
    try {
      const used = await questionSetApi.useQuestionSet(set.code, game)
      if (used.skippedCount) message.info(`Trò chơi dùng ${used.questionCount} câu (bỏ qua ${used.skippedCount} câu tự luận).`)
      void questionSetApi.getQuestionSet(set.code).then((s) => upsert(s.summary), () => undefined)
      navigate(playPath({ id: used.gameCode, type: game }))
    } catch (error) {
      message.error(apiErrorMessage(error))
      setMaking(null)
    }
  }

  const games = QUICK_GAMES.map((code) => USE_GAMES.find((g) => g.code === code)!).filter((g) => usableCount(set, g.code) > 0)
  return (
    <section aria-labelledby="play-with" className="rounded-[20px] bg-white p-4 sm:p-5">
      <h2 id="play-with" className="m-0 text-[17px] font-black">
        ▶ Chơi bộ này với
      </h2>
      <p className="m-0 mt-1 mb-3 text-[13px] text-ink-muted">Một chạm: tạo trò chơi từ các câu hỏi và mở màn chiếu.</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {games.map((g) => (
          <li key={g.code}>
            <button
              type="button"
              disabled={!!making}
              aria-busy={making === g.code}
              onClick={() => void play(g.code)}
              aria-label={`Chơi bộ này với ${g.name}`}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border-2 border-transparent bg-surface-soft p-1.5 pr-3 text-left font-[inherit] text-[14.5px] font-extrabold text-ink transition hover:border-[#C9D9F5] disabled:cursor-wait"
            >
              <img src={gameThumb(g.code)} alt="" className="aspect-[2/1] w-[68px] shrink-0 rounded-[9px] object-cover" />
              <span className="min-w-0 flex-1 truncate">{g.name}</span>
              <span className="text-[12px] text-primary">{making === g.code ? 'Đang mở…' : '▶'}</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onMore}
        className="mt-3 cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[14px] font-extrabold text-primary hover:text-primary-ink"
      >
        Xem cả {USE_GAMES.length} trò →
      </button>
    </section>
  )
}

/** "Trò chơi đã tạo": games made from the set, to play again. */
function MadeGames({ games }: { games: QuestionSetGameResponse[] }) {
  if (games.length === 0) return null
  const gameName = (code: string) => USE_GAMES.find((g) => g.code === code)?.name ?? code
  return (
    <section aria-labelledby="made-games" className="rounded-[20px] bg-white p-4 sm:p-5">
      <h2 id="made-games" className="m-0 text-[17px] font-black">
        Trò chơi đã tạo từ bộ này
      </h2>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {games.map((g) => (
          <li key={g.code}>
            <Link
              to={isGameType(g.templateCode) ? playPath({ id: g.code, type: g.templateCode }) : `/play/${g.code}`}
              className="flex items-center gap-3 rounded-[14px] border border-line-soft p-1.5 pr-3 text-ink transition hover:border-[#C9D9F5] hover:text-ink"
            >
              {isGameType(g.templateCode) && <img src={gameThumb(g.templateCode)} alt="" className="aspect-[2/1] w-[68px] shrink-0 rounded-[9px]" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-bold">{gameName(g.templateCode)}</span>
                <span className="truncate text-[12.5px] text-ink-muted">Tạo {relativeTimeLabel(g.createdAt).toLowerCase()}</span>
              </span>
              <span className="text-[12px] text-primary">▶</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
