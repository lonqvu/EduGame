import type { GuideGameType } from '@/game-engine/gameGuide'
import type { PlaySettings } from '@/game-engine/shared/gameSettings'

type NumberKey = 'teams' | 'timeLimitSec' | 'points' | 'rescues' | 'raceSteps' | 'keywordPoints' | 'luckyStars'
type ToggleKey = 'allowSteal' | 'shuffleItems'

export type QuickSetting =
  | { kind: 'select'; key: NumberKey; label: string; options: { value: number; label: string }[] }
  | { kind: 'toggle'; key: ToggleKey; label: string; hint?: string }

const values = (list: number[], label: (n: number) => string) => list.map((value) => ({ value, label: label(value) }))

const TEAMS: QuickSetting = { kind: 'select', key: 'teams', label: 'Số đội', options: values([2, 3, 4], (n) => `${n} đội`) }
const TIME: QuickSetting = {
  kind: 'select',
  key: 'timeLimitSec',
  label: 'Thời gian mỗi câu',
  options: [{ value: 0, label: 'Không giới hạn' }, ...values([10, 15, 20, 30, 45, 60, 90], (n) => `${n} giây`)],
}
const points = (label: string): QuickSetting => ({
  kind: 'select',
  key: 'points',
  label,
  options: values([5, 10, 20, 50, 100], (n) => `${n} điểm`),
})
const STEAL: QuickSetting = {
  kind: 'toggle',
  key: 'allowSteal',
  label: 'Cho đội khác giành quyền',
  hint: 'Khi một đội trả lời sai',
}
const SHUFFLE: QuickSetting = { kind: 'toggle', key: 'shuffleItems', label: 'Xáo trộn thứ tự câu hỏi' }

/**
 * Settings the start page offers for each game: only rules its projector reads (see PLAY_DEFAULTS), so every change
 * shows on screen. Lật ô has none: its teams are fixed and each tile has its own points.
 */
export const QUICK_SETTINGS: Record<GuideGameType, QuickSetting[]> = {
  GRID_BOARD: [],
  QUIZ: [TEAMS, TIME, points('Điểm mỗi câu đúng'), STEAL, SHUFFLE],
  BOAT_RACE: [
    TEAMS,
    TIME,
    { kind: 'select', key: 'raceSteps', label: 'Số chặng về đích', options: values([3, 5, 7, 10], (n) => `${n} chặng`) },
    STEAL,
    SHUFFLE,
  ],
  GOLDEN_BELL: [
    TIME,
    { kind: 'select', key: 'rescues', label: 'Lượt cứu trợ', options: values([0, 1, 2, 3], (n) => (n ? `${n} lượt` : 'Không có')) },
    SHUFFLE,
  ],
  MILLIONAIRE: [TIME, SHUFFLE],
  TUG_OF_WAR: [
    TIME,
    { kind: 'select', key: 'raceSteps', label: 'Số bước kéo để thắng', options: values([3, 4, 5, 6], (n) => `${n} bước`) },
    STEAL,
    SHUFFLE,
  ],
  FLOWER_PICK: [TEAMS, TIME, points('Điểm mỗi câu đúng'), STEAL, SHUFFLE],
  WHACK_MOLE: [TEAMS, TIME, points('Điểm mỗi lần đập đúng'), STEAL, SHUFFLE],
  TRUE_FALSE: [
    TEAMS,
    { kind: 'select', key: 'timeLimitSec', label: 'Thời gian mỗi câu', options: [{ value: 0, label: 'Không giới hạn' }, ...values([5, 10, 15, 20], (n) => `${n} giây`)] },
    points('Điểm mỗi câu đúng'),
    SHUFFLE,
  ],
  LUCKY_STAR: [
    TEAMS,
    TIME,
    points('Điểm mỗi câu đúng'),
    { kind: 'select', key: 'luckyStars', label: 'Số ngôi sao may mắn', options: values([0, 1, 2, 3, 4, 5], (n) => (n ? `${n} ngôi sao` : 'Không có')) },
    SHUFFLE,
  ],
  SECRET_PICTURE: [
    TEAMS,
    TIME,
    points('Điểm mỗi ô cửa mở được'),
    { kind: 'select', key: 'keywordPoints', label: 'Điểm đoán đúng bức tranh', options: values([20, 40, 60, 100], (n) => `${n} điểm`) },
    STEAL,
  ],
  MOUNTAIN_CLIMB: [
    TEAMS,
    TIME,
    { kind: 'select', key: 'raceSteps', label: 'Số chặng lên đỉnh', options: values([3, 5, 7, 10], (n) => `${n} chặng`) },
    STEAL,
    SHUFFLE,
  ],
  POINT_WHEEL: [TEAMS, TIME, SHUFFLE],
  TIC_TAC_TOE: [TIME, SHUFFLE],
  CONNECT_FOUR: [TIME, SHUFFLE],
  TREASURE_CHEST: [TEAMS, TIME, SHUFFLE],
  BUILD_TOWER: [TEAMS, TIME, STEAL, SHUFFLE],
  BEE_FLOWER: [TEAMS, TIME, points('Điểm mỗi câu đúng'), STEAL, SHUFFLE],
  BINGO: [TEAMS, TIME, points('Điểm mỗi ô đánh dấu'), SHUFFLE],
  MATCHING: [TEAMS, points('Điểm mỗi cặp đúng')],
  MEMORY: [TEAMS, points('Điểm mỗi cặp tìm được')],
  CROSSWORD: [
    TEAMS,
    points('Điểm mỗi hàng đúng'),
    { kind: 'select', key: 'keywordPoints', label: 'Điểm đoán từ khóa', options: values([20, 40, 60, 100], (n) => `${n} điểm`) },
    STEAL,
  ],
  ORDERING: [TEAMS, points('Điểm mỗi bài xếp đúng'), STEAL],
  SORTING: [TEAMS, points('Điểm mỗi thẻ đúng giỏ')],
}

/** The options of a select, with the current value added when it is not one of them (set elsewhere). */
export function optionsWith(setting: Extract<QuickSetting, { kind: 'select' }>, current: PlaySettings) {
  const value = current[setting.key]
  if (setting.options.some((o) => o.value === value)) return setting.options
  return [...setting.options, { value, label: String(value) }].sort((a, b) => a.value - b.value)
}
