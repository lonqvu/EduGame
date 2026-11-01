import { createContext } from 'react'
import type { MusicMood, SoundName, SoundOptions } from '@/sound/soundEngine'

export interface SoundApi {
  play: (name: SoundName, options?: SoundOptions) => void
  /** Plays until the returned function is called. */
  loop: (name: SoundName) => () => void
  startMusic: (mood?: MusicMood) => void
  setMusicMood: (mood: MusicMood) => void
  stopMusic: () => void
}

const silent = () => undefined

/** Outside the projector stage (start page preview, editor) the same game screens are silent. */
export const SoundContext = createContext<SoundApi>({
  play: silent,
  loop: () => silent,
  startMusic: silent,
  setMusicMood: silent,
  stopMusic: silent,
})

/**
 * Lets the speaker button sit in the header of a screen: a `SoundToggle` there registers itself, and the stage drops
 * its own floating one, which would otherwise sit over the screen's buttons.
 */
export const SoundToggleSlot = createContext<(() => () => void) | null>(null)
