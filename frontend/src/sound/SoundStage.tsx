import { useEffect, useMemo, type ReactNode } from 'react'
import { SpeakerIcon, SpeakerOffIcon } from '@/components/ui/icons'
import { SoundContext, type SoundApi } from '@/sound/soundContext'
import { loopSound, playSound, preloadSounds, releaseMusic, setMusicMood, startMusic, stopMusic, type SoundName } from '@/sound/soundEngine'
import { useSettingsStore } from '@/store/settingsStore'

/** Loaded with every projector screen: the sounds most games use, so the first one is not late. */
const COMMON: SoundName[] = ['correct', 'wrong', 'pop', 'tick', 'tickHigh', 'timeUp', 'fanfare', 'applause', 'star', 'whoosh']

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * Turns the sounds on for a projector screen: its games can play them (`useSound`), the speaker button and the M key
 * mute and unmute (saved in "Cài đặt"), and with `music` a background music plays while the screen is open.
 */
export function SoundStage({ music = false, children }: { music?: boolean; children: ReactNode }) {
  const enabled = useSettingsStore((s) => s.settings.sound.enabled)
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

  const toggle = () => {
    void update({ sound: { enabled: !enabled } }).catch(() => undefined)
    if (!enabled) playSound('pop')
  }

  return (
    <SoundContext.Provider value={api}>
      {children}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={!enabled}
        aria-label={enabled ? 'Tắt âm thanh (phím M)' : 'Bật âm thanh (phím M)'}
        title={enabled ? 'Tắt âm thanh (M)' : 'Bật âm thanh (M)'}
        className="fixed bottom-3 left-3 z-50 flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-white/80 text-ink shadow-md backdrop-blur hover:bg-white"
      >
        {enabled ? <SpeakerIcon size={22} /> : <SpeakerOffIcon size={22} />}
      </button>
    </SoundContext.Provider>
  )
}
