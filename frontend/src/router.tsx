import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppLoading, AppShell } from '@/components/layout/AppShell'
import { MainLayout } from '@/components/layout/MainLayout'
import { RequireAdmin } from '@/components/layout/RequireAdmin'
import { RequireAuth } from '@/components/layout/RequireAuth'

/**
 * A page loaded when it is first opened (its code is a chunk of its own): the first screen comes up sooner, and the
 * top loading bar shows while a page's code arrives.
 */
const page =
  <M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) =>
  async () => ({ Component: (await load())[name] as ComponentType })

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    HydrateFallback: AppLoading,
    children: [
      { path: 'login', lazy: page(() => import('@/pages/LoginPage'), 'LoginPage') },
      { path: 'register', lazy: page(() => import('@/pages/RegisterPage'), 'RegisterPage') },
      { path: 'forgot-password', lazy: page(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage') },
      {
        element: <RequireAuth />,
        children: [
          {
            // Teacher screens
            element: <MainLayout />,
            children: [
              { index: true, lazy: page(() => import('@/pages/HomePage'), 'HomePage') },
              { path: 'games/new', lazy: page(() => import('@/pages/ChooseGamePage'), 'ChooseGamePage') },
              { path: 'games/:gameId/edit', lazy: page(() => import('@/pages/GameEditorPage'), 'GameEditorPage') },
              { path: 'games/:gameId/start', lazy: page(() => import('@/pages/GameStartPage'), 'GameStartPage') },
              { path: 'question-sets', lazy: page(() => import('@/pages/QuestionSetsPage'), 'QuestionSetsPage') },
              { path: 'question-sets/:code', lazy: page(() => import('@/pages/QuestionSetPage'), 'QuestionSetPage') },
              { path: 'classes', lazy: page(() => import('@/pages/ClassesPage'), 'ClassesPage') },
              { path: 'profile', lazy: page(() => import('@/pages/ProfilePage'), 'ProfilePage') },
              { path: 'settings', lazy: page(() => import('@/pages/SettingsPage'), 'SettingsPage') },
              { path: 'reports', lazy: page(() => import('@/pages/ReportsPage'), 'ReportsPage') },
              { path: 'classes/:code', lazy: page(() => import('@/pages/ClassroomDetailPage'), 'ClassroomDetailPage') },
              {
                // "Quản trị": accounts with the role ADMIN only.
                path: 'admin',
                element: <RequireAdmin />,
                children: [
                  { index: true, lazy: page(() => import('@/pages/admin/AdminOverviewPage'), 'AdminOverviewPage') },
                  { path: 'teachers', lazy: page(() => import('@/pages/admin/AdminTeachersPage'), 'AdminTeachersPage') },
                  { path: 'teachers/:code', lazy: page(() => import('@/pages/admin/AdminTeacherPage'), 'AdminTeacherPage') },
                  { path: 'feedback', lazy: page(() => import('@/pages/admin/AdminFeedbackPage'), 'AdminFeedbackPage') },
                  { path: 'audit-log', lazy: page(() => import('@/pages/admin/AdminAuditLogPage'), 'AdminAuditLogPage') },
                ],
              },
              { path: '*', lazy: page(() => import('@/pages/NotFoundPage'), 'NotFoundPage') },
            ],
          },
          // Projector screens (full window, 16:9). /play/:gameId picks the screen by game type; tiles / results are Lật ô.
          { path: 'play/:gameId', lazy: page(() => import('@/pages/play/PlayGamePage'), 'PlayGamePage') },
          { path: 'play/:gameId/tiles/:tileNo', lazy: async () => {
            const { GridBoardPage } = await import('@/pages/play/GridBoardPage')
            return { element: <GridBoardPage screen="question" /> }
          } },
          { path: 'play/:gameId/results', lazy: async () => {
            const { GridBoardPage } = await import('@/pages/play/GridBoardPage')
            return { element: <GridBoardPage screen="results" /> }
          } },
          { path: 'tools/wheel', lazy: page(() => import('@/pages/play/SpinWheelPage'), 'SpinWheelPage') },
          { path: 'tools/pick/:mode', lazy: page(() => import('@/pages/play/NamePickerPage'), 'NamePickerPage') },
          { path: 'tools/groups', lazy: page(() => import('@/pages/play/ClassToolPages'), 'TeamMakerPage') },
          { path: 'tools/timer', lazy: page(() => import('@/pages/play/ClassToolPages'), 'TimerPage') },
          { path: 'tools/dice', lazy: page(() => import('@/pages/play/ClassToolPages'), 'DicePage') },
          { path: 'tools/coin', lazy: page(() => import('@/pages/play/ClassToolPages'), 'CoinFlipPage') },
          { path: 'tools/number', lazy: page(() => import('@/pages/play/ClassToolPages'), 'RandomNumberPage') },
          { path: 'tools/scoreboard', lazy: page(() => import('@/pages/play/ClassToolPages'), 'ScoreboardPage') },
          { path: 'tools/noise', lazy: page(() => import('@/pages/play/ClassToolPages'), 'NoiseMeterPage') },
          { path: 'tools/light', lazy: page(() => import('@/pages/play/ClassToolPages'), 'TrafficLightPage') },
          { path: 'tools/stopwatch', lazy: page(() => import('@/pages/play/ClassToolPages'), 'StopwatchPage') },
          { path: 'tools/draw', lazy: page(() => import('@/pages/play/ClassToolPages'), 'CardDrawPage') },
          { path: 'tools/seating', lazy: page(() => import('@/pages/play/ClassToolPages'), 'SeatingPage') },
        ],
      },
    ],
  },
])
