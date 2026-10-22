import { createBrowserRouter } from 'react-router'
import { MainLayout } from '@/components/layout/MainLayout'
import { RequireAdmin } from '@/components/layout/RequireAdmin'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { AdminAuditLogPage } from '@/pages/admin/AdminAuditLogPage'
import { AdminFeedbackPage } from '@/pages/admin/AdminFeedbackPage'
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage'
import { AdminTeacherPage } from '@/pages/admin/AdminTeacherPage'
import { AdminTeachersPage } from '@/pages/admin/AdminTeachersPage'
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
import {
  CardDrawPage,
  CoinFlipPage,
  DicePage,
  NoiseMeterPage,
  RandomNumberPage,
  ScoreboardPage,
  SeatingPage,
  StopwatchPage,
  TeamMakerPage,
  TimerPage,
  TrafficLightPage,
} from '@/pages/play/ClassToolPages'
import { GridBoardPage } from '@/pages/play/GridBoardPage'
import { NamePickerPage } from '@/pages/play/NamePickerPage'
import { PlayGamePage } from '@/pages/play/PlayGamePage'
import { SpinWheelPage } from '@/pages/play/SpinWheelPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'

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
          { path: 'settings', element: <SettingsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'classes/:code', element: <ClassroomDetailPage /> },
          {
            // "Quản trị": accounts with the role ADMIN only.
            path: 'admin',
            element: <RequireAdmin />,
            children: [
              { index: true, element: <AdminOverviewPage /> },
              { path: 'teachers', element: <AdminTeachersPage /> },
              { path: 'teachers/:code', element: <AdminTeacherPage /> },
              { path: 'feedback', element: <AdminFeedbackPage /> },
              { path: 'audit-log', element: <AdminAuditLogPage /> },
            ],
          },
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
      { path: 'tools/coin', element: <CoinFlipPage /> },
      { path: 'tools/number', element: <RandomNumberPage /> },
      { path: 'tools/scoreboard', element: <ScoreboardPage /> },
      { path: 'tools/noise', element: <NoiseMeterPage /> },
      { path: 'tools/light', element: <TrafficLightPage /> },
      { path: 'tools/stopwatch', element: <StopwatchPage /> },
      { path: 'tools/draw', element: <CardDrawPage /> },
      { path: 'tools/seating', element: <SeatingPage /> },
    ],
  },
])
