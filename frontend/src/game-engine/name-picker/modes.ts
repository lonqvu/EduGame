export type PickMode = 'horse' | 'balloon' | 'claw' | 'fishing' | 'rocket'

/** Where the start / result panel sits so it never covers the scene's action. */
export type PanelPlacement = 'bottom' | 'top' | 'left' | 'right'

export interface PickModeConfig {
  mode: PickMode
  title: string
  /** Number of students shown in the scene at once. */
  slots: number
  prompt: string
  startLabel: string
  againLabel: string
  resultLabel: string
  idleAt: PanelPlacement
  resultAt: PanelPlacement
}

export const PICK_MODES: Record<PickMode, PickModeConfig> = {
  horse: {
    mode: 'horse', title: 'Đua ngựa', slots: 5, prompt: 'Chú ngựa nào về nhất?',
    startLabel: 'Bắt đầu đua', againLabel: 'Đua lại', resultLabel: 'Về nhất', idleAt: 'bottom', resultAt: 'bottom',
  },
  balloon: {
    mode: 'balloon', title: 'Bóng bay', slots: 7, prompt: 'Quả bóng nào bay cao nhất?',
    startLabel: 'Thả bóng bay', againLabel: 'Thả bóng lại', resultLabel: 'Bay cao nhất', idleAt: 'top', resultAt: 'bottom',
  },
  claw: {
    mode: 'claw', title: 'Máy gắp thú', slots: 11, prompt: 'Gắp trúng ai, bạn đó trả lời!',
    startLabel: 'Gắp thú', againLabel: 'Gắp lại', resultLabel: 'Gắp trúng', idleAt: 'right', resultAt: 'right',
  },
  fishing: {
    mode: 'fishing', title: 'Câu cá', slots: 7, prompt: 'Chú cá nào sẽ cắn câu?',
    startLabel: 'Thả câu', againLabel: 'Thả câu lại', resultLabel: 'Câu được bạn', idleAt: 'right', resultAt: 'right',
  },
  rocket: {
    mode: 'rocket', title: 'Tên lửa', slots: 4, prompt: 'Tên lửa nào bay tới Mặt Trăng?',
    startLabel: 'Phóng tên lửa', againLabel: 'Phóng lại', resultLabel: 'Bay lên Mặt Trăng', idleAt: 'left', resultAt: 'left',
  },
}

/** Every name-picking tool, for the "Đổi trò" menu (the wheel lives on its own route). */
export const PICK_TOOL_LINKS: { key: string; label: string; path: string }[] = [
  { key: 'wheel', label: 'Vòng quay', path: '/tools/wheel' },
  ...Object.values(PICK_MODES).map((m) => ({ key: m.mode, label: m.title, path: `/tools/pick/${m.mode}` })),
]

export const isPickMode = (value: string | undefined): value is PickMode =>
  value !== undefined && value in PICK_MODES
