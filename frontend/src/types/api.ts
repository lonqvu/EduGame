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

export interface LoginRequest {
  /** Username or email */
  username: string
  password: string
  /** "Ghi nhớ đăng nhập": keep the session after the browser closes */
  remember: boolean
}

export interface RegisterRequest {
  email: string
  /** "Cô Hoa" */
  displayName: string
  /** At least 8 characters */
  password: string
}

export interface VerifyEmailRequest {
  email: string
  /** 6 digits from the mail */
  code: string
}

export interface ResetPasswordRequest {
  email: string
  /** 6 digits from the mail */
  code: string
  /** At least 8 characters */
  newPassword: string
}

/** Answer to sign-up / resend / forgotten password (the same whether or not the address has an account). */
export interface CodeSentResponse {
  /** Normalized (lower-case) */
  email: string
  /** Seconds the code works */
  expiresIn: number
  /** Seconds before another code can be asked for */
  resendAfter: number
}

export interface TokenResponse {
  accessToken: string
  tokenType: 'Bearer'
  /** Seconds until the token expires */
  expiresIn: number
}

export interface UserResponse {
  code: string
  username: string
  displayName: string
  email?: string
  role: 'ADMIN' | 'TEACHER'
}

/** GET /me/profile: "Hồ sơ của tôi". */
export interface ProfileResponse extends UserResponse {
  /** Digits only, e.g. "0987654321". */
  phone?: string
  /** One of AVATARS (utils/profile), or 'upload'; none: the default teacher picture. */
  avatar?: string
  /** Address of the uploaded picture, '/api/v1/avatars/...' (with avatar 'upload'). */
  avatarUrl?: string
  emailVerified: boolean
  /** ISO time the account was made. */
  memberSince: string
  stats: { classrooms: number; students: number; questionSets: number; activities: number }
}

/** PATCH /me/profile: every field is sent; blank phone / avatar removes it. */
export interface UpdateProfileRequest {
  displayName: string
  phone: string
  avatar: string
}

/** POST /me/password and /me/sessions/sign-out-others. */
export interface SignedOutResponse {
  otherSessions: number
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

/** ACTIVE: played with; PAUSED: kept, not played with (archived classes are never returned). */
export type ClassroomStatus = 'ACTIVE' | 'PAUSED'

export interface ClassroomResponse {
  code: string
  name: string
  grade: number
  schoolYear?: string
  schoolName?: string
  avatar?: string
  status: ClassroomStatus
  studentCount: number
  /** Games played with the class */
  activityCount: number
  /** Of those, games played to the results */
  completedCount: number
  /** completedCount / activityCount, in % (0 when nothing was played) */
  completionRate: number
  lastPlayedAt?: string
  createdAt: string
}

export interface CreateClassroomRequest {
  name: string
  grade: number
  schoolYear?: string
  schoolName?: string
  avatar?: string
}

/** Partial update: absent fields stay; an empty school year / school name clears it. */
export interface UpdateClassroomRequest {
  name?: string
  grade?: number
  schoolYear?: string
  schoolName?: string
  avatar?: string
  status?: ClassroomStatus
}

export interface NewStudentRequest {
  displayName: string
  avatar?: string
}

export interface PlaySessionResponse {
  id: number
  gameCode: string
  status: 'IN_PROGRESS' | 'ENDED'
  startedAt: string
  endedAt?: string
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

// --- Question sets ---------------------------------------------------------------------------------------------

export type SubjectCode = 'TOAN' | 'TIENG_VIET' | 'TIENG_ANH' | 'TU_NHIEN_XA_HOI' | 'KHOA_HOC' | 'KHAC'

/** MULTIPLE_CHOICE: "Trắc nghiệm"; SHORT_ANSWER: "Tự luận" (one answer, checked by the teacher). */
export type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER'

export interface QuestionSetSummaryResponse {
  code: string
  title: string
  description?: string
  subject: SubjectCode
  /** 1-12; absent: any grade */
  grade?: number
  questionCount: number
  multipleChoiceCount: number
  shortAnswerCount: number
  /** Games made from the set */
  useCount: number
  /** Times those games were played with a class */
  playCount: number
  ownerName: string
  createdAt: string
  updatedAt: string
}

export interface QuestionResponse {
  id: number
  type: QuestionType
  text: string
  options?: string[]
  correctOption?: number
  answer?: string
  explanation?: string
}

export interface QuestionSetGameResponse {
  code: string
  title: string
  templateCode: string
  createdAt: string
}

export interface QuestionSetResponse {
  summary: QuestionSetSummaryResponse
  questions: QuestionResponse[]
  games: QuestionSetGameResponse[]
}

export interface QuestionSetRequest {
  title: string
  description?: string
  subject: SubjectCode
  /** Create: absent for any grade. Update: 0 clears it. */
  grade?: number
}

export interface QuestionRequest {
  type: QuestionType
  text: string
  options?: string[]
  correctOption?: number
  answer?: string
  explanation?: string
}

/** Games a set can be used in. */
export type QuestionGameCode = 'QUIZ' | 'GOLDEN_BELL' | 'BOAT_RACE' | 'GRID_BOARD'

export interface UsedQuestionSetResponse {
  gameCode: string
  templateCode: QuestionGameCode
  questionCount: number
  skippedCount: number
}

/** An uploaded file. `url` is relative to the API host (`/api/v1/assets/…`): show it with `assetSrc()`. */
export interface AssetResponse {
  id: number
  url: string
  name: string
  type: 'IMAGE'
  mimeType: string
  sizeBytes: number
}
