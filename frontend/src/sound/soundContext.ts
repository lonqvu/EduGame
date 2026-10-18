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
