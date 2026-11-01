import { useContext, useEffect } from 'react'
import { SpeakerIcon, SpeakerOffIcon } from '@/components/ui/icons'
import { SoundToggleSlot } from '@/sound/soundContext'
import { playSound } from '@/sound/soundEngine'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * The speaker button of a projector screen: mutes and unmutes (also the M key), saved in "Cài đặt". Put in the header
 * next to "‹"; `className` gives its colors, e.g. "bg-white text-ink". Outside a projector stage it shows nothing.
 */
export function SoundToggle({ className = 'bg-white text-ink hover:text-primary-ink', floating = false }: { className?: string; floating?: boolean }) {
  const register = useContext(SoundToggleSlot)
  const enabled = useSettingsStore((s) => s.settings.sound.enabled)
  const update = useSettingsStore((s) => s.update)

  useEffect(() => (floating || !register ? undefined : register()), [floating, register])

  if (!register) return null
  const toggle = () => {
    void update({ sound: { enabled: !enabled } }).catch(() => undefined)
    if (!enabled) playSound('pop')
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!enabled}
      aria-label={enabled ? 'Tắt âm thanh (phím M)' : 'Bật âm thanh (phím M)'}
      title={enabled ? 'Tắt âm thanh (M)' : 'Bật âm thanh (M)'}
      className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 ${
        floating ? 'absolute bottom-3 left-3 z-50 bg-white/80 text-ink shadow-md backdrop-blur hover:bg-white' : className
      }`}
    >
      {enabled ? <SpeakerIcon size={22} /> : <SpeakerOffIcon size={22} />}
    </button>
  )
}
