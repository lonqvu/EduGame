import { beforeEach, describe, expect, it, vi } from 'vitest'
import { drawPick, pickCandidates } from '@/game-engine/name-picker/usePickRound'
import { isPickMode, PICK_MODES, PICK_TOOL_LINKS } from '@/game-engine/name-picker/modes'
import { rotationFor } from '@/game-engine/spin-wheel/wheelMath'
import { usePickerStore } from '@/store/pickerStore'
import type { Student } from '@/types/game'

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

const classOf = (n: number): Student[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, name: `Học sinh ${i + 1}`, stars: 0, totalStars: 0 }))

/** Wheel angle (clockwise from the top, 0-360) under the top pointer after turning the wheel by `rotation`. */
const angleUnderPointer = (rotation: number) => (((-rotation % 360) + 360) % 360)

describe('spin wheel', () => {
  it('stops with the chosen segment under the pointer, for any wheel size and start angle', () => {
    const random = seeded(7)
    vi.spyOn(Math, 'random').mockImplementation(random)
    for (const count of [2, 3, 5, 8, 12, 28, 40]) {
      const seg = 360 / count
      let rotation = 0
      for (let spin = 0; spin < 60; spin++) {
        const index = Math.floor(random() * count)
        const next = rotationFor(index, count, rotation)
        const angle = angleUnderPointer(next)
        // Inside the segment, and away from its edges so the pointer never sits on a line.
        expect(angle).toBeGreaterThan(index * seg + seg * 0.19)
        expect(angle).toBeLessThan((index + 1) * seg - seg * 0.19)
        rotation = next
      }
    }
    vi.restoreAllMocks()
  })

  it('always turns forward, by the extra turns plus less than one more', () => {
    for (const current of [0, 17, 359.5, 7200, -90]) {
      const next = rotationFor(3, 8, current, 6)
      expect(next - current).toBeGreaterThanOrEqual(6 * 360)
      expect(next - current).toBeLessThan(7 * 360)
    }
  })

  it('lands on the middle of the segment without jitter', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(angleUnderPointer(rotationFor(0, 4, 0))).toBeCloseTo(45)
    expect(angleUnderPointer(rotationFor(3, 4, 1234))).toBeCloseTo(315)
    vi.restoreAllMocks()
  })
})

describe('name picker draw', () => {
  it('puts the winner exactly once among distinct classmates', () => {
    const students = classOf(28)
    const random = seeded(3)
    for (let run = 0; run < 200; run++) {
      const round = drawPick(students, students, 7, random)!
      expect(round.slots).toHaveLength(7)
      expect(new Set(round.slots.map((s) => s.id)).size).toBe(7)
      expect(round.slots[round.winnerSlot]).toBeDefined()
    }
  })

  it('uses fewer slots when the class is small', () => {
    const round = drawPick(classOf(3), classOf(3), 11, seeded())!
    expect(round.slots).toHaveLength(3)
  })

  it('never picks a student already called when "no repeat" is on', () => {
    const students = classOf(10)
    const called = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']
    const candidates = pickCandidates(students, called, true)
    expect(candidates.map((s) => s.id)).toEqual(['s9', 's10'])
    const random = seeded(11)
    for (let run = 0; run < 100; run++) {
      const round = drawPick(students, candidates, 5, random)!
      expect(['s9', 's10']).toContain(round.slots[round.winnerSlot].id)
      // Called classmates still fill the scene.
      expect(round.slots).toHaveLength(5)
    }
    expect(pickCandidates(students, called, false)).toBe(students)
  })

  it('has nobody to pick once everyone was called', () => {
    const students = classOf(2)
    expect(drawPick(students, pickCandidates(students, ['s1', 's2'], true), 5)).toBeNull()
    expect(drawPick([], [], 5)).toBeNull()
  })

  it('calls every student once before anyone twice', () => {
    const students = classOf(28)
    const random = seeded(5)
    const called: string[] = []
    for (let run = 0; run < 28; run++) {
      const round = drawPick(students, pickCandidates(students, called, true), 7, random)!
      called.push(round.slots[round.winnerSlot].id)
    }
    expect(new Set(called).size).toBe(28)
  })
})

describe('picker store', () => {
  beforeEach(() => usePickerStore.setState({ calledIds: [], noRepeat: true }))

  it('remembers each called student once and forgets on reset', () => {
    const { markCalled, resetCalled } = usePickerStore.getState()
    markCalled('s1')
    markCalled('s2')
    markCalled('s1')
    expect(usePickerStore.getState().calledIds).toEqual(['s1', 's2'])
    resetCalled()
    expect(usePickerStore.getState().calledIds).toEqual([])
  })

  it('toggles "no repeat"', () => {
    usePickerStore.getState().setNoRepeat(false)
    expect(usePickerStore.getState().noRepeat).toBe(false)
  })
})

describe('pick modes', () => {
  it('recognises only the known modes', () => {
    expect(isPickMode('horse')).toBe(true)
    expect(isPickMode('rocket')).toBe(true)
    expect(isPickMode(undefined)).toBe(false)
    expect(isPickMode('wheel')).toBe(false)
    expect(isPickMode('toString')).toBe(false)
  })

  it('links every tool once, the wheel first', () => {
    expect(PICK_TOOL_LINKS[0].path).toBe('/tools/wheel')
    expect(PICK_TOOL_LINKS).toHaveLength(Object.keys(PICK_MODES).length + 1)
    expect(new Set(PICK_TOOL_LINKS.map((l) => l.path)).size).toBe(PICK_TOOL_LINKS.length)
    for (const [key, mode] of Object.entries(PICK_MODES)) {
      expect(mode.mode).toBe(key)
      expect(mode.slots).toBeGreaterThanOrEqual(2)
    }
  })
})
