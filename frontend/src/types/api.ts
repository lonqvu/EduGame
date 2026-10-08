/** Mirrors com.edugame.common.exception.ApiError on the backend. */
export interface ApiError {
  timestamp?: string
  status: number
  code: string
  message: string
  path?: string
  violations?: FieldViolation[]
}

export interface FieldViolation {
  field: string
  message: string
}

// ---------------------------------------------------------------------------
// DTOs of /api/v1 (see docs/API.md). Names mirror the backend records.
// ---------------------------------------------------------------------------

export interface UserResponse {
  code: string
  username: string
  displayName: string
  email?: string
  role: 'ADMIN' | 'TEACHER'
}

export interface GameTemplateResponse {
  code: string
  categoryCode: string
  categoryName: string
  engine: string
  name: string
  description?: string
  icon?: string
  thumbnailUrl?: string
  isNew: boolean
  status: 'DRAFT' | 'BETA' | 'ACTIVE' | 'INACTIVE'
  configSchema: Record<string, unknown>
  defaultConfig: Record<string, unknown>
}

export type GameStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface GameSummaryResponse {
  code: string
  templateCode: string
  title: string
  subject?: string
  educationLevel: string
  grade?: number
  status: GameStatus
  itemCount: number
  updatedAt: string
}

/** Item content / solution are template specific; GRID_BOARD shapes are below. */
export interface GameItemResponse {
  id: number
  itemType: string
  position: number
  content: Record<string, unknown>
  solution?: Record<string, unknown>
  explanation?: string
}

export interface GameResponse {
  code: string
  templateCode: string
  title: string
  description?: string
  subject?: string
  educationLevel: string
  grade?: number
  visibility: string
  status: GameStatus
  version: number
  versionStatus: 'DRAFT' | 'PUBLISHED'
  settings: Record<string, unknown>
  items: GameItemResponse[]
  updatedAt: string
}

export interface CreateGameRequest {
  templateCode: string
  title?: string
  grade?: number
}

export interface UpdateGameRequest {
  title?: string
  description?: string
  subject?: string
  grade?: number
  settings?: Record<string, unknown>
}

export interface CreateGameItemRequest {
  itemType: string
  content: Record<string, unknown>
  solution?: Record<string, unknown> | null
  explanation?: string
}

/** Omitted = unchanged; `solution: null` removes the solution. */
export interface UpdateGameItemRequest {
  content?: Record<string, unknown>
  solution?: Record<string, unknown> | null
  explanation?: string
}

export interface ClassroomResponse {
  code: string
  name: string
  grade: number
  schoolYear?: string
  studentCount: number
}

export interface StudentResponse {
  id: number
  displayName: string
  avatar?: string
  rollNumber?: number
  weeklyStars: number
  totalStars: number
}

/** Loading state of server data kept in a store. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
