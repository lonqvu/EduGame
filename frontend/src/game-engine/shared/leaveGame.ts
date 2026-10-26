import { createContext, useContext } from 'react'

/**
 * Leaves the round for the game's introduction (rules, teams, "Bắt đầu"), where the teacher changes the questions or
 * goes back to where she came from. Given by /play/:gameId; elsewhere "back" leads to the editor.
 */
export const LeaveGameContext = createContext<(() => void) | null>(null)

export function useLeaveGame(): (() => void) | null {
  return useContext(LeaveGameContext)
}
