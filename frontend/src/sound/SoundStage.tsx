import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SoundContext, SoundToggleSlot, type SoundApi } from '@/sound/soundContext'
import { SoundToggle } from '@/sound/SoundToggle'
import { loopSound, playSound, preloadSounds, releaseMusic, setMusicMood, startMusic, stopMusic, type SoundName } from '@/sound/soundEngine'
import { useSettingsStore } from '@/store/settingsStore'

/** Loaded with every projector screen: the sounds most games use, so the first one is not late. */
const COMMON: SoundName[] = ['correct', 'wrong', 'pop', 'tick', 'tickHigh', 'timeUp', 'fanfare', 'applause', 'star', 'whoosh']

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * Turns the sounds on for a projector screen: its games can play them (`useSound`), the speaker button and the M key
 * mute and unmute (saved in "Cài đặt"), and with `music` a background music plays while the screen is open. The
 * speaker button sits in the screen's header (`SoundToggle`); a screen without one gets it floating in a corner.
 */
export function SoundStage({ music = false, children }: { music?: boolean; children: ReactNode }) {
  const update = useSettingsStore((s) => s.update)
  const api = useMemo<SoundApi>(() => ({ play: playSound, loop: loopSound, startMusic, setMusicMood, stopMusic }), [])

  useEffect(() => preloadSounds(COMMON), [])

  useEffect(() => {
    if (!music) return
    startMusic()
    return () => releaseMusic()
  }, [music])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      void update({ sound: { enabled: !useSettingsStore.getState().settings.sound.enabled } }).catch(() => undefined)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [update])

  // Speaker buttons in the screen's header.
  const [inHeader, setInHeader] = useState(0)
  const register = useCallback(() => {
    setInHeader((n) => n + 1)
    return () => setInHeader((n) => n - 1)
  }, [])

  return (
    <SoundContext.Provider value={api}>
      <SoundToggleSlot value={register}>
        {children}
        {inHeader === 0 && <SoundToggle floating />}
      </SoundToggleSlot>
    </SoundContext.Provider>
  )
}
