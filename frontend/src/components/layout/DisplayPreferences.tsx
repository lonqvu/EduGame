import { ConfigProvider } from 'antd'
import { MotionConfig } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useSettingsStore } from '@/store/settingsStore'
import { isProjectorPath, leaveAppFullscreen } from '@/utils/fullscreen'

/**
 * Applies the display settings to every signed-in screen: with "Giảm hiệu ứng chuyển động" Motion, antd and CSS
 * animations stop (see `html[data-reduce-motion]` in index.css). Loads the settings once signed in.
 */
export function DisplayPreferences({ children }: { children: ReactNode }) {
  const reduceMotion = useSettingsStore((s) => s.settings.display.reduceMotion)
  const load = useSettingsStore((s) => s.load)
  const { pathname } = useLocation()

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const root = document.documentElement
    if (reduceMotion) root.dataset.reduceMotion = ''
    else delete root.dataset.reduceMotion
  }, [reduceMotion])

  // Back on a teacher screen: leave the full screen "Bắt đầu trò chơi" opened.
  useEffect(() => {
    if (!isProjectorPath(pathname)) leaveAppFullscreen()
  }, [pathname])

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <ConfigProvider theme={{ token: { motion: !reduceMotion } }}>{children}</ConfigProvider>
    </MotionConfig>
  )
}
