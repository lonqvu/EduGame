import i18n from 'i18next'
import { httpClient } from '@/api/httpClient'
import { listTemplates } from '@/api/templateApi'
import type {
  CreateGameItemRequest,
  CreateGameRequest,
  GameItemResponse,
  GameResponse,
  GameSummaryResponse,
  UpdateGameItemRequest,
  UpdateGameRequest,
} from '@/types/api'
import type { GameType } from '@/types/game'
import { applyGameDefaults, readGuestSettings } from '@/utils/settings'

/**
 * The games of a visitor who has not signed in: the same calls as gameApi, kept in this tab only (sessionStorage), so
 * nothing is saved for later. The sample content comes from the public GET /v1/games/samples/{type}; nothing else
 * reaches the server.
 */

interface SampleContentResponse {
  templateCode: string
  title: string
  subject?: string
  items: CreateGameItemRequest[]
}

const STORAGE_KEY = 'edugame.guestGames'
/** Codes of guest games start with this, so they never look like a teacher's game. */
const CODE_PREFIX = 'guest-'

interface Stored {
  games: GameResponse[]
  nextId: number
}

/** Kept in memory too: storage may be blocked (private windows), the games still last while the page is open. */
let memory: Stored | null = null

function read(): Stored {
  if (memory) return memory
  try {
    memory = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '') as Stored
  } catch {
    memory = { games: [], nextId: 1 }
  }
  return memory
}

function write(stored: Stored) {
  memory = stored
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage blocked or full: the games stay in memory until the page is left.
  }
}

/** Signed in: the guest games of this tab are dropped. */
export function forgetGuestGames() {
  memory = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing kept.
  }
}

/** Same shape as the backend's errors, so pages show "not found" as for any game. */
const notFound = (code: string) => ({ status: 404, code: 'GAME_NOT_FOUND', message: `Game ${code} not found` })

const copy = <T>(value: T): T => structuredClone(value)

function find(code: string): GameResponse {
  const game = read().games.find((g) => g.code === code)
  if (!game) throw notFound(code)
  return game
}

/** Applies a change to one game, stamps it, and resolves with a copy (callers may keep what they get). */
function change(code: string, apply: (game: GameResponse, stored: Stored) => void): Promise<GameResponse> {
  try {
    const stored = read()
    const game = find(code)
    apply(game, stored)
    game.updatedAt = new Date().toISOString()
    game.items.forEach((item, i) => (item.position = i + 1))
    write(stored)
    return Promise.resolve(copy(game))
  } catch (error) {
    return Promise.reject(error)
  }
}

let defaults: Promise<Record<string, Record<string, unknown>>> | null = null

/** Settings a new game of each type starts with (the templates' default config, as on the server). */
function defaultSettings(type: string): Promise<Record<string, unknown>> {
  defaults ??= listTemplates()
    .then((templates) => Object.fromEntries(templates.map((t) => [t.code, t.defaultConfig ?? {}])))
    .catch((error: unknown) => {
      defaults = null
      throw error
    })
  return defaults.then((all) => copy(all[type] ?? {}))
}

function toItem(request: CreateGameItemRequest, stored: Stored): GameItemResponse {
  return {
    id: stored.nextId++,
    itemType: request.itemType,
    position: 0,
    content: copy(request.content),
    solution: request.solution ?? undefined,
    explanation: request.explanation,
  }
}

async function newGame(type: string, title: string, sample: boolean, subject?: string, grade?: number): Promise<GameResponse> {
  // The visitor's defaults for new games (Cài đặt), as the server applies a teacher's.
  const settings = applyGameDefaults(await defaultSettings(type), readGuestSettings().games)
  const stored = read()
  const game: GameResponse = {
    code: `${CODE_PREFIX}${stored.nextId++}`,
    templateCode: type,
    title,
    subject,
    educationLevel: 'PRIMARY',
    grade,
    visibility: 'PRIVATE',
    status: 'DRAFT',
    version: 1,
    versionStatus: 'DRAFT',
    sample,
    settings,
    items: [],
    updatedAt: new Date().toISOString(),
  }
  stored.games.unshift(game)
  write(stored)
  return game
}

export function listGames(): Promise<GameSummaryResponse[]> {
  return Promise.resolve(
    read().games.map((g) => ({
      code: g.code,
      templateCode: g.templateCode,
      title: g.title,
      subject: g.subject,
      educationLevel: g.educationLevel,
      grade: g.grade,
      status: g.status,
      itemCount: g.items.length,
      sample: g.sample,
      updatedAt: g.updatedAt,
    })),
  )
}

export async function createGame(request: CreateGameRequest): Promise<GameResponse> {
  return copy(await newGame(request.templateCode, request.title?.trim() || i18n.t('common.newGame'), false, undefined, request.grade))
}

/** The sample game of this type in this tab, made from the built-in sample content the first time. */
export async function playSample(templateCode: GameType): Promise<GameResponse> {
  const existing = read().games.find((g) => g.sample && g.templateCode === templateCode)
  if (existing) return copy(existing)
  const { data } = await httpClient.get<SampleContentResponse>(`/v1/games/samples/${encodeURIComponent(templateCode)}`)
  const game = await newGame(templateCode, data.title, true, data.subject)
  return change(game.code, (g, stored) => g.items.push(...data.items.map((item) => toItem(item, stored))))
}

export async function getGame(code: string): Promise<GameResponse> {
  return copy(find(code))
}

export const openDraft = getGame

export function updateGame(code: string, request: UpdateGameRequest): Promise<GameResponse> {
  return change(code, (game) => {
    if (request.title !== undefined) game.title = request.title
    if (request.description !== undefined) game.description = request.description
    if (request.subject !== undefined) game.subject = request.subject
    if (request.grade !== undefined) game.grade = request.grade
    if (request.settings !== undefined) game.settings = copy(request.settings)
  })
}

export async function archiveGame(code: string): Promise<void> {
  const stored = read()
  find(code)
  write({ ...stored, games: stored.games.filter((g) => g.code !== code) })
}

export function addItems(code: string, items: CreateGameItemRequest[]): Promise<GameResponse> {
  return change(code, (game, stored) => game.items.push(...items.map((item) => toItem(item, stored))))
}

export function updateItem(code: string, itemId: number, request: UpdateGameItemRequest): Promise<GameResponse> {
  return change(code, (game) => {
    const item = game.items.find((i) => i.id === itemId)
    if (!item) throw notFound(`${code}/${itemId}`)
    if (request.content !== undefined) item.content = copy(request.content)
    if (request.solution !== undefined) item.solution = request.solution ?? undefined
    if (request.explanation !== undefined) item.explanation = request.explanation
  })
}

export function deleteItem(code: string, itemId: number): Promise<GameResponse> {
  return change(code, (game) => {
    game.items = game.items.filter((i) => i.id !== itemId)
  })
}

export function reorderItems(code: string, itemIds: number[]): Promise<GameResponse> {
  return change(code, (game) => {
    const byId = new Map(game.items.map((i) => [i.id, i]))
    game.items = itemIds.flatMap((id) => byId.get(id) ?? [])
  })
}
