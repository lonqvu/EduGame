import type { PickPhase } from '@/game-engine/name-picker/usePickRound'
import type { Student } from '@/types/game'

/**
 * A scene is remounted for every round (`key={runId}`), starts its animation when
 * `phase` is "run" and calls `onFinish` once the winner is revealed.
 */
export interface PickSceneProps {
  slots: Student[]
  winnerSlot: number
  phase: PickPhase
  onFinish: () => void
}

/** Shared ease curves (cubic-bezier control points). */
export const EASE_IN_OUT: [number, number, number, number] = [0.45, 0.05, 0.35, 1]
export const EASE_OUT: [number, number, number, number] = [0.2, 0.7, 0.4, 1]
export const EASE_IN: [number, number, number, number] = [0.5, 0, 0.8, 0.6]

export const LOOP = { repeat: Infinity, repeatType: 'reverse' as const, ease: 'easeInOut' as const }

export const fontFor = (name: string, short: number, long: number) => (name.length > 5 ? long : short)
