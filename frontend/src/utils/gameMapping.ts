import { gameRegistry, isGameType } from '@/game-engine/registry'
import type {
  CreateGameItemRequest,
  GameItemResponse,
  GameResponse,
  GameSummaryResponse,
  GameTemplateResponse,
  StudentResponse,
} from '@/types/api'
import type { GameCategory, GameSummary, GameTemplate, Question, Student } from '@/types/game'

/** Item type of a GRID_BOARD question: content `{text, image?, points}`, solution `{answer}`. */
const QUESTION_ITEM_TYPE = 'OPEN_QUESTION'

export function toGameTemplate(t: GameTemplateResponse): GameTemplate | null {
  if (!isGameType(t.code)) return null
  return {
    type: t.code,
    category: t.categoryCode as GameCategory,
    name: t.name,
    description: t.description ?? '',
    tags: gameRegistry[t.code].tags,
    isNew: t.isNew,
  }
}

export function toGameSummary(g: GameSummaryResponse): GameSummary | null {
  if (!isGameType(g.templateCode)) return null
  return { id: g.code, type: g.templateCode, title: g.title, grade: g.grade, itemCount: g.itemCount }
}

/** Summary of a game from its detail response (opened directly, e.g. /games/:id/edit). */
export function detailToSummary(g: GameResponse): GameSummary | null {
  if (!isGameType(g.templateCode)) return null
  return { id: g.code, type: g.templateCode, title: g.title, grade: g.grade, itemCount: g.items.length }
}

export function toQuestion(item: GameItemResponse): Question {
  const { text, image, points } = item.content
  return {
    id: String(item.id),
    text: typeof text === 'string' ? text : '',
    answer: typeof item.solution?.answer === 'string' ? item.solution.answer : '',
    imageUrl: typeof image === 'string' ? image : undefined,
    points: typeof points === 'number' ? points : 0,
  }
}

/** Content + solution of a question, as stored on the backend. An empty answer is stored as "no solution". */
export function toItemFields(q: Omit<Question, 'id'>): Pick<CreateGameItemRequest, 'content' | 'solution'> {
  // Images are only previewed locally (object URLs) until the asset upload API exists: never persist those.
  const image = q.imageUrl && !q.imageUrl.startsWith('blob:') ? q.imageUrl : undefined
  return {
    content: { text: q.text, points: q.points, ...(image ? { image } : {}) },
    solution: q.answer.trim() ? { answer: q.answer.trim() } : null,
  }
}

export function toCreateItemRequest(q: Omit<Question, 'id'>): CreateGameItemRequest {
  return { itemType: QUESTION_ITEM_TYPE, ...toItemFields(q) }
}

/** `stars` is the weekly count: it drives "Ngôi sao tuần này". */
export function toStudent(s: StudentResponse): Student {
  return { id: String(s.id), name: s.displayName, stars: s.weeklyStars }
}

/** "24 câu", "1 bộ thẻ"... */
export const itemCountLabel = (game: GameSummary) => `${game.itemCount} ${gameRegistry[game.type].itemUnit}`

export const gradeLabel = (grade?: number) => (grade ? `Lớp ${grade}` : 'Chưa chọn lớp')
