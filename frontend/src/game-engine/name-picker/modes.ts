import i18n from 'i18next'
import { MAX_ROCKETS } from '@/game-engine/name-picker/launchLayout'
import { MAX_HORSES } from '@/game-engine/name-picker/raceLayout'
import { MAX_FISH } from '@/game-engine/name-picker/pondLayout'
export type PickMode = 'horse' | 'balloon' | 'claw' | 'fishing' | 'rocket'

/** Where the start / result panel sits so it never covers the scene's action. */
export type PanelPlacement = 'bottom' | 'top' | 'left' | 'right'

export interface PickModeConfig {
  mode: PickMode
  title: string
  /** One or two sentences for the game list. */
  description: string
  /** Number of students shown in the scene at once. */
  slots: number
  prompt: string
  startLabel: string
  againLabel: string
  resultLabel: string
  idleAt: PanelPlacement
  resultAt: PanelPlacement
}

/** A name picker; its texts are read in the current language (play.picker.modes.*). */
function picker(mode: PickMode, slots: number, idleAt: PanelPlacement, resultAt: PanelPlacement): PickModeConfig {
  const text = (key: 'title' | 'description' | 'prompt' | 'start' | 'again' | 'result') => i18n.t(`play.picker.modes.${mode}.${key}`)
  return {
    mode,
    slots,
    idleAt,
    resultAt,
    get title() {
      return text('title')
    },
    get description() {
      return text('description')
    },
    get prompt() {
      return text('prompt')
    },
    get startLabel() {
      return text('start')
    },
    get againLabel() {
      return text('again')
    },
    get resultLabel() {
      return text('result')
    },
  }
}

export const PICK_MODES: Record<PickMode, PickModeConfig> = {
  // One horse per student, up to a big class.
  horse: picker('horse', MAX_HORSES, 'bottom', 'bottom'),
  balloon: picker('balloon', 7, 'top', 'bottom'),
  claw: picker('claw', 11, 'right', 'right'),
  // One fish per student, up to a big class.
  fishing: picker('fishing', MAX_FISH, 'right', 'right'),
  // One rocket per student, up to a big class.
  rocket: picker('rocket', MAX_ROCKETS, 'left', 'left'),
}

/** Every name-picking tool, for the "Đổi trò" menu (the wheel lives on its own route). */
export const PICK_TOOL_LINKS: { key: string; label: string; path: string }[] = [
  {
    key: 'wheel',
    path: '/tools/wheel',
    get label() {
      return i18n.t('play.picker.wheel')
    },
  },
  ...Object.values(PICK_MODES).map((m) => ({
    key: m.mode,
    path: `/tools/pick/${m.mode}`,
    get label() {
      return m.title
    },
  })),
]

export const isPickMode = (value: string | undefined): value is PickMode =>
  value !== undefined && Object.hasOwn(PICK_MODES, value)
