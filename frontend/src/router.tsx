import { createBrowserRouter } from 'react-router'
import { MainLayout } from '@/components/layout/MainLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { ChooseGamePage } from '@/pages/ChooseGamePage'
import { ClassesPage } from '@/pages/ClassesPage'
import { ClassroomDetailPage } from '@/pages/ClassroomDetailPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { GameEditorPage } from '@/pages/GameEditorPage'
import { GameStartPage } from '@/pages/GameStartPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { QuestionSetPage } from '@/pages/QuestionSetPage'
import { QuestionSetsPage } from '@/pages/QuestionSetsPage'
import { DicePage, TeamMakerPage, TimerPage } from '@/pages/play/ClassToolPages'
import { GridBoardPage } from '@/pages/play/GridBoardPage'
import { NamePickerPage } from '@/pages/play/NamePickerPage'
import { PlayGamePage } from '@/pages/play/PlayGamePage'
import { SpinWheelPage } from '@/pages/play/SpinWheelPage'
import { RegisterPage } from '@/pages/RegisterPage'

export const router = createBrowserRouter([
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
  { path: 'forgot-password', element: <ForgotPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        // Teacher screens
        element: <MainLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'games/new', element: <ChooseGamePage /> },
          { path: 'games/:gameId/edit', element: <GameEditorPage /> },
          { path: 'games/:gameId/start', element: <GameStartPage /> },
          { path: 'question-sets', element: <QuestionSetsPage /> },
          { path: 'question-sets/:code', element: <QuestionSetPage /> },
          { path: 'classes', element: <ClassesPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'classes/:code', element: <ClassroomDetailPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      // Projector screens (full window, 16:9). /play/:gameId picks the screen by game type; tiles / results are Lật ô.
      { path: 'play/:gameId', element: <PlayGamePage /> },
      { path: 'play/:gameId/tiles/:tileNo', element: <GridBoardPage screen="question" /> },
      { path: 'play/:gameId/results', element: <GridBoardPage screen="results" /> },
      { path: 'tools/wheel', element: <SpinWheelPage /> },
      { path: 'tools/pick/:mode', element: <NamePickerPage /> },
      { path: 'tools/groups', element: <TeamMakerPage /> },
      { path: 'tools/timer', element: <TimerPage /> },
      { path: 'tools/dice', element: <DicePage /> },
    ],
  },
])
