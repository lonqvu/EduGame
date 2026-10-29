import { createContext, useContext } from 'react'

/**
 * What the back button of a running game does, given by the projector page: back to the game's introduction (or the
 * start page it came from). Without it (the start page's preview) the button leads to the editor.
 */
export const PlayBackContext = createContext<(() => void) | null>(null)

export const usePlayBack = () => useContext(PlayBackContext)
