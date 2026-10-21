import { App } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { gameRegistry } from '@/game-engine/registry'
import { usePlayNow } from '@/pages/choose-game/usePlayNow'
import { WelcomeTry } from '@/pages/home/WelcomeTry'
import { ActionCards } from '@/pages/home/ActionCards'
import { HomeHero } from '@/pages/home/HomeHero'
import { PraiseCorner, type StarPeriod } from '@/pages/home/PraiseCorner'
import { RecentActivity } from '@/pages/home/RecentActivity'
import { FeaturedGames, QuestionSets, TodayPanel } from '@/pages/home/RightColumn'
import { useCatalogStore } from '@/store/catalogStore'
import { useClassStore } from '@/store/classStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useQuestionSetStore } from '@/store/questionSetStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { GameSummary, GameType } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { classTitle } from '@/utils/classrooms'
import { relativeTimeLabel } from '@/utils/dateLabels'
import { gradeLabel } from '@/utils/gameMapping'
import { OPEN_CREATE_SET } from '@/utils/questionSets'

const RECENT_LIMIT = 4
const TODAY_LIMIT = 2
const SETS_LIMIT = 3

/** Unit of a game's items in sentences like "10 câu hỏi". */
const ITEM_UNITS: Partial<Record<GameType, string>> = {
  GRID_BOARD: 'câu hỏi',
  QUIZ: 'câu hỏi',
  GOLDEN_BELL: 'câu hỏi',
  BOAT_RACE: 'câu hỏi',
  MATCHING: 'bộ nối cặp',
  MEMORY: 'bộ thẻ',
  CROSSWORD: 'hàng ngang',
  ORDERING: 'bài sắp xếp',
  SORTING: 'bộ phân loại',
}

export function HomePage() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const teacher = useTeacherStore((s) => s.teacher)
  const loadTeacher = useTeacherStore((s) => s.load)
  const templates = useCatalogStore((s) => s.templates)
  const loadTemplates = useCatalogStore((s) => s.load)
  const games = useGameLibraryStore((s) => s.games)
  const gamesStatus = useGameLibraryStore((s) => s.gamesStatus)
  const loadGames = useGameLibraryStore((s) => s.loadGames)
  const archiveGame = useGameLibraryStore((s) => s.archiveGame)
  const className = useClassStore((s) => s.className)
  const classGrade = useClassStore((s) => s.grade)
  const students = useClassStore((s) => s.students)
  const loadClass = useClassStore((s) => s.load)
  const questionSets = useQuestionSetStore((s) => s.sets)
  const loadQuestionSets = useQuestionSetStore((s) => s.load)
  const classrooms = useClassStore((s) => s.classrooms)
  const currentCode = useClassStore((s) => s.classroomCode)
  const selectClass = useClassStore((s) => s.select)

  const [allRecent, setAllRecent] = useState(false)
  const [period, setPeriod] = useState<StarPeriod>('week')
  const { playNow, busy } = usePlayNow()

  useEffect(() => {
    void loadTeacher()
    void loadTemplates()
    void loadGames()
    void loadClass()
    void loadQuestionSets()
  }, [loadTeacher, loadTemplates, loadGames, loadClass, loadQuestionSets])

  const recent = allRecent ? games : games.slice(0, RECENT_LIMIT)

  const templateName = (game: GameSummary) => templates.find((t) => t.type === game.type)?.name ?? ''
  /** "Lớp 3A" when the game is for the class being taught, else "Lớp 3". */
  const classLabel = (game: GameSummary) => (className && game.grade === classGrade ? className : gradeLabel(game.grade))
  const countLabel = (game: GameSummary) =>
    gameRegistry[game.type].usesQuestions ? `${game.itemCount} ${ITEM_UNITS[game.type] ?? 'mục'}` : `${students.length} học sinh`
  const meta = (game: GameSummary) =>
    [classLabel(game), countLabel(game), relativeTimeLabel(game.updatedAt)].filter(Boolean).join(' · ')

  const pickClass = async (code: string) => {
    if (code === currentCode) return
    try {
      await selectClass(code)
    } catch (error) {
      message.error(apiErrorMessage(error))
    }
  }

  /** "Chơi ngay", as on the game chooser: the sample game, or the tool, on the projector at once. */
  const startGame = (type: GameType) => void playNow(type)

  const confirmArchive = (game: GameSummary) =>
    modal.confirm({
      title: `Xóa "${game.title}" khỏi thư viện?`,
      content: 'Trò chơi được lưu trữ, không mất kết quả cũ.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Giữ lại',
      onOk: async () => {
        try {
          await archiveGame(game.id)
          message.success('Đã xóa khỏi thư viện')
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  // One spacing everywhere (GAP), and two rows that share the columns: the banner and "Hôm nay" are one row, so
  // their tops and bottoms line up; the rest starts on one line below.
  const columns = 'grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_306px]'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <TopBar teacherName={teacher?.name ?? ''} initial={teacher?.shortName.charAt(0).toUpperCase() ?? ''} />
      </div>

      {gamesStatus === 'ready' && games.length === 0 && <WelcomeTry busy={busy} onPlay={startGame} />}

      <div className={columns}>
        <HomeHero
          greetingName={teacher?.greetingName ?? 'cô'}
          className={className}
          studentCount={students.length}
          classes={classrooms
            .filter((c) => c.status === 'ACTIVE')
            .map((c) => ({ code: c.code, label: classTitle(c.name), studentCount: c.studentCount }))}
          currentCode={currentCode}
          onPickClass={(code) => void pickClass(code)}
          onManageClasses={() => navigate('/classes')}
        />
        <TodayPanel games={games.slice(0, TODAY_LIMIT)} subtitle={(g) => `${classLabel(g)} - ${templateName(g)}`} />
      </div>

      <div className={`${columns} items-start`}>
        <div className="@container flex min-w-0 flex-col gap-5">
          <ActionCards startTarget="/games/new" onCreate={() => navigate('/question-sets', { state: OPEN_CREATE_SET })}onOpenClass={() => navigate(currentCode ? `/classes/${encodeURIComponent(currentCode)}` : '/classes')} />
          <div className="grid grid-cols-1 items-start gap-5 @min-[900px]:grid-cols-[minmax(0,1fr)_356px]">
            <RecentActivity
              games={recent}
              status={gamesStatus}
              expanded={allRecent}
              onToggleExpanded={() => setAllRecent((v) => !v)}
              templateName={templateName}
              meta={meta}
              onRetry={() => void loadGames()}
              onArchive={confirmArchive}
            />
            <PraiseCorner students={students} period={period} onPeriodChange={setPeriod} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <FeaturedGames onStart={startGame} />
          <QuestionSets sets={questionSets.slice(0, SETS_LIMIT)} />
        </div>
      </div>

    </div>
  )
}
