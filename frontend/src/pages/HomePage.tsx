import { App } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { gameRegistry, itemsLabel } from '@/game-engine/registry'
import { FeaturedGames } from '@/pages/home/FeaturedGames'
import { HomeHero } from '@/pages/home/HomeHero'
import { PraiseCorner, type StarPeriod } from '@/pages/home/PraiseCorner'
import { QuickTiles } from '@/pages/home/QuickTiles'
import { RecentActivity } from '@/pages/home/RecentActivity'
import { ClassTools, QuestionSets } from '@/pages/home/RightColumn'
import { UseSetModal } from '@/pages/question-sets/UseSetModal'
import { useAuthStore } from '@/store/authStore'
import { useCatalogStore } from '@/store/catalogStore'
import { useClassStore } from '@/store/classStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { needsLogin } from '@/store/loginPromptStore'
import { useQuestionSetStore } from '@/store/questionSetStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { QuestionSetSummaryResponse } from '@/types/api'
import type { GameSummary } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { classTitle } from '@/utils/classrooms'
import { relativeTimeLabel } from '@/utils/dateLabels'
import { gradeLabel } from '@/utils/gameMapping'
import { OPEN_CREATE_SET } from '@/utils/questionSets'

const RECENT_LIMIT = 4
const SETS_LIMIT = 3


export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const teacher = useTeacherStore((s) => s.teacher)
  const guest = useAuthStore((s) => s.status !== 'signedIn')
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
  /** The set "▶ Chơi" was pressed on: the dialog picking the game. */
  const [playing, setPlaying] = useState<QuestionSetSummaryResponse | null>(null)

  useEffect(() => {
    void loadTeacher()
    void loadTemplates()
    void loadGames()
    void loadClass()
    void loadQuestionSets()
  }, [loadTeacher, loadTemplates, loadGames, loadClass, loadQuestionSets])

  const recent = allRecent ? games : games.slice(0, RECENT_LIMIT)
  // Nothing played yet (a visitor, a new account): the featured games come first.
  const noGamesYet = gamesStatus === 'ready' && games.length === 0

  const templateName = (game: GameSummary) => templates.find((t) => t.type === game.type)?.name ?? ''
  /** "Lớp 3A" when the game is for the class being taught, else "Lớp 3". */
  const classLabel = (game: GameSummary) => (className && game.grade === classGrade ? className : gradeLabel(game.grade))
  const countLabel = (game: GameSummary) =>
    gameRegistry[game.type].usesQuestions ? itemsLabel(game.type, game.itemCount) : t('classes.studentCount', { count: students.length })
  const meta = (game: GameSummary) =>
    [classLabel(game), countLabel(game), relativeTimeLabel(game.updatedAt)].filter(Boolean).join(' · ')

  const pickClass = async (code: string) => {
    if (code === currentCode || needsLogin('/classes')) return
    try {
      await selectClass(code)
    } catch (error) {
      message.error(apiErrorMessage(error))
    }
  }

  const confirmArchive = (game: GameSummary) =>
    modal.confirm({
      title: t('home.deleteConfirm', { title: game.title }),
      content: t('home.deleteText'),
      okText: t('common.delete'),
      okButtonProps: { danger: true },
      cancelText: t('classes.keep'),
      onOk: async () => {
        try {
          await archiveGame(game.id)
          message.success(t('home.deleted'))
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  const classPage = currentCode ? `/classes/${encodeURIComponent(currentCode)}` : '/classes'

  // The main column (greeting with the one main action, the two other ones, the games played lately) and the side
  // column (tools for the lesson, praise, question sets); one column on small screens, in that order.
  return (
    <div className="flex flex-col gap-4">
      {/* On small screens the account is in the bar at the top of the screen (MainLayout). */}
      <div className="hidden justify-end lg:flex">
        <TopBar />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex min-w-0 flex-col gap-5">
          <HomeHero
            greeting={teacher?.greetingName ? t('home.greeting', { name: teacher.greetingName }) : guest ? t('home.greetingGuest') : t('home.greetingTeacher')}
            className={className}
            studentCount={students.length}
            classes={classrooms
              .filter((c) => c.status === 'ACTIVE')
              .map((c) => ({ code: c.code, label: classTitle(c.name), studentCount: c.studentCount }))}
            currentCode={currentCode}
            onPickClass={(code) => void pickClass(code)}
            onManageClasses={() => needsLogin('/classes') || navigate('/classes')}
          />
          <QuickTiles
            onCreate={() => needsLogin('/question-sets') || navigate('/question-sets', { state: OPEN_CREATE_SET })}
            onOpenClass={() => needsLogin(classPage) || navigate(classPage)}
          />
          {noGamesYet && <FeaturedGames />}
          {/* A visitor with nothing played yet has no "recent" list: the featured games are where to start. */}
          {!(guest && noGamesYet) && (
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
          )}
          {!noGamesYet && <FeaturedGames />}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <ClassTools />
          <PraiseCorner students={students} period={period} onPeriodChange={setPeriod} onPraise={() => needsLogin(classPage) || navigate(classPage)} />
          <QuestionSets sets={questionSets.slice(0, SETS_LIMIT)} onPlay={setPlaying} />
        </div>
      </div>

      <UseSetModal
        open={!!playing}
        sets={questionSets}
        presetCode={playing?.code}
        onClose={() => setPlaying(null)}
        onUsed={() => void loadQuestionSets()}
      />
    </div>
  )
}
