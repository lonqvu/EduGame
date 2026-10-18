import { useContext } from 'react'
import { SoundContext } from '@/sound/soundContext'

/** Sounds of the screen: heard on the projector stage, silent anywhere else. */
export const useSound = () => useContext(SoundContext)
