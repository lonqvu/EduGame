import { PICK_MODES, type PickMode } from '@/game-engine/name-picker/modes'
import { gameRegistry } from '@/game-engine/registry'
import type { GameCategory, GameTemplate, GameType } from '@/types/game'
import { fold } from '@/utils/classrooms'
import { isSetGame } from '@/utils/questionSets'

const ASSETS = '/assets/games'

/** Card picture of each game: vector art (scripts/make_card_art.py), sharp at any size and pixel density. */
export const cardArt = (type: GameType) => `${ASSETS}/card-${type.toLowerCase().replace(/_/g, '-')}.svg`

/** One card of the chooser: a template, or one name picker of NAME_RACE (each is its own game). */
export interface ChooserEntry {
  key: string
  template: GameTemplate
  name: string
  description: string
  art: string
  pickMode?: PickMode
  /** Lower comes first. */
  popularity: number
}

/** The cards of a template: NAME_RACE is shown as its name pickers, every other template as itself. */
export function entriesOf(template: GameTemplate): ChooserEntry[] {
  const popularity = gameRegistry[template.type].popularity
  if (template.type !== 'NAME_RACE') {
    return [{ key: template.type, template, name: template.name, description: template.description, art: cardArt(template.type), popularity }]
  }
  return Object.values(PICK_MODES).map((m, i) => ({
    key: `pick-${m.mode}`,
    template,
    name: m.title,
    description: m.description,
    art: `${ASSETS}/card-pick-${m.mode}.svg`,
    pickMode: m.mode,
    popularity: popularity + i / 10,
  }))
}

export interface ChooserGroup {
  key: GameCategory
  title: string
  icon: string
  /** What the teacher prepares for the games of the group. */
  hint: string
}

/**
 * The groups of the chooser, by what the teacher has to prepare: every game a question set plays is "Hỏi đáp" (the
 * word games too), whatever its catalog category.
 */
export const GROUPS: ChooserGroup[] = [
  { key: 'QUESTION', title: 'Hỏi đáp', icon: '❓', hint: 'Chơi với câu hỏi mẫu hoặc bộ câu hỏi của cô' },
  { key: 'PUZZLE', title: 'Giải đố', icon: '🧩', hint: 'Soạn cặp, thẻ, ô chữ trong trình soạn' },
  { key: 'RANDOM_TOOL', title: 'Gọi tên', icon: '🎯', hint: 'Dùng danh sách lớp đang dạy' },
  { key: 'CLASS_TOOL', title: 'Công cụ lớp học', icon: '🧰', hint: 'Bấm là dùng ngay' },
]

export const groupOf = (entry: ChooserEntry): GameCategory => (isSetGame(entry.template.type) ? 'QUESTION' : entry.template.category)

/** The entries of each group, most played first. */
export function groupEntries(templates: GameTemplate[]): Record<GameCategory, ChooserEntry[]> {
  const groups: Record<GameCategory, ChooserEntry[]> = { QUESTION: [], PUZZLE: [], RANDOM_TOOL: [], CLASS_TOOL: [] }
  for (const entry of templates.flatMap(entriesOf).sort((a, b) => a.popularity - b.popularity)) groups[groupOf(entry)].push(entry)
  return groups
}

/** The entries whose name or description has every word searched, accents ignored ("lat o" finds "Lật ô"). */
export function searchEntries(templates: GameTemplate[], query: string): ChooserEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  return templates
    .flatMap(entriesOf)
    .filter((e) => words.every((w) => fold(`${e.name} ${e.description}`).includes(w)))
    .sort((a, b) => a.popularity - b.popularity)
}

/** "Phổ biến" on the first three of a long group, the first one of a short one. */
export const popularCount = (size: number) => (size >= 10 ? 3 : 1)
