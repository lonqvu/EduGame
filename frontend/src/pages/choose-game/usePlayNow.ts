import { App } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { playSample } from '@/api/gameApi'
import { gameRegistry, playPath, toolPath } from '@/game-engine/registry'
import { useSettingsStore } from '@/store/settingsStore'
import type { GameType } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { enterFullscreen } from '@/utils/fullscreen'

/**
 * "Chơi ngay": one click from a game card to the projector. Tools open as they are; a question game plays the
 * teacher's sample game of that type (made from the built-in sample content the first time). `busy` is the game type
 * being opened, so its button can say so and a second click does nothing.
 */
export function usePlayNow() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const fullscreenOnStart = useSettingsStore((s) => s.settings.display.fullscreenOnStart)
  const [busy, setBusy] = useState<string | null>(null)

  const playNow = async (type: GameType, toolRoute?: string) => {
    if (busy) return
    // Asked inside the click: browsers only allow full screen right after a click.
    if (fullscreenOnStart) enterFullscreen()
    if (toolRoute || !gameRegistry[type].usesQuestions) {
      navigate(toolRoute ?? toolPath(type))
      return
    }
    setBusy(type)
    try {
      const game = await playSample(type)
      navigate(playPath({ id: game.code, type }))
    } catch (error) {
      message.error(`Chưa mở được trò chơi. ${apiErrorMessage(error)}`)
    } finally {
      setBusy(null)
    }
  }

  return { playNow, busy }
}
