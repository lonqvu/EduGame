import { useState } from 'react'
import { shuffle } from '@/game-engine/shared/shuffle'
import { useClassStore } from '@/store/classStore'
import { usePickerStore } from '@/store/pickerStore'
import type { Student } from '@/types/game'

export type PickPhase = 'idle' | 'run' | 'done'

/** Students who may still be picked: everyone, or only those not called yet when "no repeat" is on. */
export const pickCandidates = (students: Student[], calledIds: string[], noRepeat: boolean) =>
  noRepeat ? students.filter((s) => !calledIds.includes(s.id)) : students

/**
 * Draws a winner among `candidates` and fills the other scene slots with classmates, the winner in a random slot.
 * Null when there is nobody to pick.
 */
export function drawPick(students: Student[], candidates: Student[], slotCount: number, random: () => number = Math.random) {
  if (candidates.length === 0) return null
  const winner = candidates[Math.floor(random() * candidates.length)]
  const others = shuffle(students.filter((s) => s.id !== winner.id), random).slice(0, slotCount - 1)
  const slots = shuffle([winner, ...others], random)
  return { slots, winnerSlot: slots.indexOf(winner) }
}

/**
 * One name-picking round: draws the winner from students not called yet (when "no repeat" is on),
 * fills the remaining scene slots with other classmates and places the winner in a random slot.
 */
export function usePickRound(slotCount: number) {
  const students = useClassStore((s) => s.students)
  const calledIds = usePickerStore((s) => s.calledIds)
  const noRepeat = usePickerStore((s) => s.noRepeat)
  const markCalled = usePickerStore((s) => s.markCalled)

  const [phase, setPhase] = useState<PickPhase>('idle')
  const [runId, setRunId] = useState(0)
  const [slots, setSlots] = useState<Student[]>(() => students.slice(0, slotCount))
  const [winnerSlot, setWinnerSlot] = useState(0)

  const candidates = pickCandidates(students, calledIds, noRepeat)
  const allCalled = candidates.length === 0

  const start = () => {
    const round = phase === 'run' ? null : drawPick(students, candidates, slotCount)
    if (!round) return
    setSlots(round.slots)
    setWinnerSlot(round.winnerSlot)
    setPhase('run')
    setRunId((id) => id + 1)
  }

  const finish = () => {
    const winner = slots[winnerSlot]
    if (winner) markCalled(winner.id)
    setPhase('done')
  }

  return {
    phase,
    runId,
    slots,
    winnerSlot,
    winner: phase === 'done' ? slots[winnerSlot] : null,
    calledCount: calledIds.length,
    total: students.length,
    allCalled,
    start,
    finish,
  }
}
