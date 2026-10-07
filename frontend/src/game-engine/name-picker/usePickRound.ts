import { useState } from 'react'
import { useClassStore } from '@/store/classStore'
import { usePickerStore } from '@/store/pickerStore'
import type { Student } from '@/types/game'

export type PickPhase = 'idle' | 'run' | 'done'

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
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

  const candidates = noRepeat ? students.filter((s) => !calledIds.includes(s.id)) : students
  const allCalled = candidates.length === 0

  const start = () => {
    if (phase === 'run' || allCalled) return
    const winner = candidates[Math.floor(Math.random() * candidates.length)]
    const others = shuffle(students.filter((s) => s.id !== winner.id)).slice(0, slotCount - 1)
    const round = shuffle([winner, ...others])
    setSlots(round)
    setWinnerSlot(round.indexOf(winner))
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
