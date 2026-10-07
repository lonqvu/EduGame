import { create } from 'zustand'
import { DEMO_CLASS_NAME, DEMO_GAMES, DEMO_QUESTIONS, GAME_TEMPLATES } from '@/mocks/demoData'
import type { GameSummary, GameType, Question } from '@/types/game'

/** Teacher's games + their questions. In-memory until the game/question APIs exist. */
interface GameLibraryState {
  games: GameSummary[]
  questions: Record<string, Question[]>
  createGame: (type: GameType) => string
  renameGame: (gameId: string, title: string) => void
  addQuestions: (gameId: string, drafts: Omit<Question, 'id'>[]) => Question[]
  updateQuestion: (gameId: string, questionId: string, patch: Partial<Omit<Question, 'id'>>) => void
  removeQuestion: (gameId: string, questionId: string) => void
  reorderQuestions: (gameId: string, orderedIds: string[]) => void
}

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

export const emptyQuestion = (): Omit<Question, 'id'> => ({ text: '', answer: '', points: 20 })

export const useGameLibraryStore = create<GameLibraryState>()((set) => ({
  games: DEMO_GAMES,
  questions: DEMO_QUESTIONS,

  createGame: (type) => {
    const id = newId('g')
    const template = GAME_TEMPLATES.find((t) => t.type === type)
    const game: GameSummary = {
      id,
      type,
      title: `${template?.name ?? 'Trò chơi'} mới`,
      className: DEMO_CLASS_NAME,
      sizeLabel: '1 câu',
    }
    set((s) => ({
      games: [game, ...s.games],
      questions: { ...s.questions, [id]: [{ id: newId('q'), ...emptyQuestion() }] },
    }))
    return id
  },

  renameGame: (gameId, title) =>
    set((s) => ({ games: s.games.map((g) => (g.id === gameId ? { ...g, title } : g)) })),

  addQuestions: (gameId, drafts) => {
    const created = drafts.map((d) => ({ id: newId('q'), ...d }))
    set((s) => withQuestions(s, gameId, [...(s.questions[gameId] ?? []), ...created]))
    return created
  },

  updateQuestion: (gameId, questionId, patch) =>
    set((s) =>
      withQuestions(
        s,
        gameId,
        (s.questions[gameId] ?? []).map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
      ),
    ),

  removeQuestion: (gameId, questionId) =>
    set((s) =>
      withQuestions(
        s,
        gameId,
        (s.questions[gameId] ?? []).filter((q) => q.id !== questionId),
      ),
    ),

  reorderQuestions: (gameId, orderedIds) =>
    set((s) => {
      const byId = new Map((s.questions[gameId] ?? []).map((q) => [q.id, q]))
      const reordered = orderedIds.flatMap((id) => byId.get(id) ?? [])
      return withQuestions(s, gameId, reordered)
    }),
}))

function withQuestions(s: GameLibraryState, gameId: string, list: Question[]) {
  return {
    questions: { ...s.questions, [gameId]: list },
    games: s.games.map((g) => (g.id === gameId ? { ...g, sizeLabel: `${list.length} câu` } : g)),
  }
}
