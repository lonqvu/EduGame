import { App } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { editPath, gameRegistry, playPath, toolPath } from '@/game-engine/registry'
import { ActionCards } from '@/pages/home/ActionCards'
import { HomeHero } from '@/pages/home/HomeHero'
import { PraiseCorner, type StarPeriod } from '@/pages/home/PraiseCorner'
import { RecentActivity } from '@/pages/home/RecentActivity'
import { FeaturedGames, QuestionSets, TodayPanel, TopBar } from '@/pages/home/RightColumn'
import { useCatalogStore } from '@/store/catalogStore'
import { useClassStore } from '@/store/classStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { GameSummary, GameType } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { relativeTimeLabel } from '@/utils/dateLabels'
import { gradeLabel } from '@/utils/gameMapping'

const RECENT_LIMIT = 4
const TODAY_LIMIT = 2
const SETS_LIMIT = 3

/** Unit of a game's items in sentences like "10 câu hỏi". */
const ITEM_UNITS: Partial<Record<GameType, string>> = {
  GRID_BOARD: 'câu hỏi',
  QUIZ: 'câu hỏi',
  MATCHING: 'bộ nối cặp',
  MEMORY: 'bộ thẻ',
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
  const createGame = useGameLibraryStore((s) => s.createGame)
  const archiveGame = useGameLibraryStore((s) => s.archiveGame)
  const className = useClassStore((s) => s.className)
  const classGrade = useClassStore((s) => s.grade)
  const students = useClassStore((s) => s.students)
  const loadClass = useClassStore((s) => s.load)

  const [allRecent, setAllRecent] = useState(false)
  const [allSets, setAllSets] = useState(false)
  const [period, setPeriod] = useState<StarPeriod>('week')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void loadTeacher()
    void loadTemplates()
    void loadGames()
    void loadClass()
  }, [loadTeacher, loadTemplates, loadGames, loadClass])

  const recent = allRecent ? games : games.slice(0, RECENT_LIMIT)
  const questionGames = games.filter((g) => gameRegistry[g.type].usesQuestions)
  const sets = allSets ? questionGames : questionGames.slice(0, SETS_LIMIT)
  const startTarget = games[0] ? playPath(games[0]) : '/games/new'

  const templateName = (game: GameSummary) => templates.find((t) => t.type === game.type)?.name ?? ''
  /** "Lớp 3A" when the game is for the class being taught, else "Lớp 3". */
  const classLabel = (game: GameSummary) => (className && game.grade === classGrade ? className : gradeLabel(game.grade))
  const countLabel = (game: GameSummary) =>
    gameRegistry[game.type].usesQuestions ? `${game.itemCount} ${ITEM_UNITS[game.type] ?? 'mục'}` : `${students.length} học sinh`
  const meta = (game: GameSummary) =>
    [classLabel(game), countLabel(game), relativeTimeLabel(game.updatedAt)].filter(Boolean).join(' · ')

  const notReady = (page: string) => message.info(`Trang "${page}" đang được hoàn thiện.`)

  const startGame = async (type: GameType) => {
    if (!gameRegistry[type].usesQuestions) {
      navigate(toolPath(type))
      return
    }
    if (creating) return
    setCreating(true)
    try {
      navigate(editPath(await createGame(type, classGrade)))
    } catch (error) {
      message.error(apiErrorMessage(error))
      setCreating(false)
    }
  }

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

  const topBar = <TopBar teacherName={teacher?.name ?? ''} initial={teacher?.shortName.charAt(0).toUpperCase() ?? ''} />

  return (
    <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_306px]">
      <div className="xl:hidden">{topBar}</div>

      <div className="@container flex min-w-0 flex-col gap-[10px] xl:pt-[45px]">
        <HomeHero
          greetingName={teacher?.greetingName ?? 'cô'}
          className={className}
          studentCount={students.length}
          onPickClass={() => message.info('Cô đang dạy một lớp. Thêm lớp khác sẽ có ở trang "Lớp học".')}
        />
        <ActionCards startTarget={startTarget} onCreate={() => navigate('/games/new')} onOpenClass={() => notReady('Lớp học')} />
        <div className="mt-[7px] grid grid-cols-1 items-start gap-[18px] @min-[900px]:grid-cols-[minmax(0,1fr)_356px]">
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

      <div className="flex min-w-0 flex-col gap-[19px]">
        <div className="-mb-[5px] hidden xl:block">{topBar}</div>
        <TodayPanel games={games.slice(0, TODAY_LIMIT)} subtitle={(g) => `${classLabel(g)} - ${templateName(g)}`} />
        <FeaturedGames onStart={(type) => void startGame(type)} />
        <QuestionSets
          games={sets}
          expanded={allSets}
          onToggleExpanded={() => setAllSets((v) => !v)}
          title={(g) => (g.subject ? `${g.subject} - ${g.title}` : g.title)}
          count={countLabel}
        />
      </div>
    </div>
  )
}
