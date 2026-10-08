import { createBrowserRouter } from 'react-router'
import { MainLayout } from '@/components/layout/MainLayout'
import { ChooseGamePage } from '@/pages/ChooseGamePage'
import { GameEditorPage } from '@/pages/GameEditorPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { GridBoardPage } from '@/pages/play/GridBoardPage'
import { NamePickerPage } from '@/pages/play/NamePickerPage'
import { PlayGamePage } from '@/pages/play/PlayGamePage'
import { SpinWheelPage } from '@/pages/play/SpinWheelPage'

export const router = createBrowserRouter([
  {
    // Teacher screens
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'games/new', element: <ChooseGamePage /> },
      { path: 'games/:gameId/edit', element: <GameEditorPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Projector screens (full window, 16:9). /play/:gameId picks the screen by game type; tiles / results are Lật ô.
  { path: 'play/:gameId', element: <PlayGamePage /> },
  { path: 'play/:gameId/tiles/:tileNo', element: <GridBoardPage screen="question" /> },
  { path: 'play/:gameId/results', element: <GridBoardPage screen="results" /> },
  { path: 'tools/wheel', element: <SpinWheelPage /> },
  { path: 'tools/pick/:mode', element: <NamePickerPage /> },
])
