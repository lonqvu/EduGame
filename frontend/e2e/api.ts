import { request, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test'

export const TEACHER = { username: 'colan@edugame.local', password: '123456' }
/** The seeded admin ("Quản trị"). */
export const ADMIN = { username: 'quantri@edugame.local', password: '123456' }
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1/'

/** Signs the browser in like the login page does: the backend sets the refresh token cookie, the app restores from it. */
export async function signInBrowser(context: BrowserContext, account: { username: string; password: string } = TEACHER) {
  const res = await context.request.post(`${API_URL}auth/login`, { data: { ...account, remember: true } })
  if (!res.ok()) throw new Error(`Sign-in failed: ${res.status()} ${await res.text()}`)
}

/** Opens a question game on the projector and starts it from its introduction (rules, teams, "Bắt đầu"). */
export async function openGame(page: Page, path: string) {
  await page.goto(path)
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
}

export interface Item {
  id: number
  itemType: string
  content: Record<string, any>
  solution?: Record<string, any>
}

export interface Game {
  code: string
  title: string
  items: Item[]
  settings: Record<string, any>
}

export interface Classroom {
  code: string
  name: string
  status: 'ACTIVE' | 'PAUSED'
  studentCount: number
  activityCount: number
  completedCount: number
  completionRate: number
  weeklyStars: number
  schoolName?: string
  avatar?: string
}

export interface Settings {
  display: { reduceMotion: boolean; fullscreenOnStart: boolean }
  games: { teams?: number | null; timeLimitSec?: number | null; allowSteal?: boolean | null; shuffleItems?: boolean | null }
  notifications: { newSignInEmail: boolean; passwordChangedEmail: boolean }
  sound?: { enabled: boolean; volume: number; music: boolean }
}

export type QuestionInput =
  | { type: 'MULTIPLE_CHOICE'; text: string; options: string[]; correctOption: number }
  | { type: 'SHORT_ANSWER'; text: string; answer: string }

export interface QuestionSet {
  summary: { code: string; title: string; questionCount: number; useCount: number; subject: string; description?: string; grade?: number }
  questions: ({ id: number } & Record<string, any>)[]
  games: { code: string; templateCode: string }[]
}

export const choice = (text: string, options: string[], correctOption = 0): QuestionInput => ({
  type: 'MULTIPLE_CHOICE',
  text,
  options,
  correctOption,
})
export const shortAnswer = (text: string, answer: string): QuestionInput => ({ type: 'SHORT_ANSWER', text, answer })

/** The backend, signed in as the same teacher as the browser (to set up games and check what was saved). */
export class Backend {
  private readonly http: APIRequestContext
  private readonly created: string[] = []
  private readonly classrooms: string[] = []
  private readonly questionSets: string[] = []
  private keptSettings?: Settings

  private constructor(http: APIRequestContext) {
    this.http = http
  }

  static async signIn(): Promise<Backend> {
    const anonymous = await request.newContext({ baseURL: API_URL })
    const login = await anonymous.post('auth/login', { data: TEACHER })
    if (!login.ok()) throw new Error(`Sign-in failed: ${login.status()} ${await login.text()}`)
    const { accessToken } = await login.json()
    await anonymous.dispose()
    return new Backend(await request.newContext({ baseURL: API_URL, extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` } }))
  }

  private async call<T>(method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, data?: unknown): Promise<T> {
    const res = await this.http[method](path, data === undefined ? {} : { data })
    if (!res.ok()) throw new Error(`${method.toUpperCase()} ${path}: ${res.status()} ${await res.text()}`)
    return res.status() === 204 ? (undefined as T) : res.json()
  }

  /** A new game with these items; archived again by `cleanUp`. */
  async createGame(templateCode: string, title: string, items: Omit<Item, 'id'>[] = []): Promise<Game> {
    const game = await this.call<Game>('post', 'games', { templateCode, title, grade: 3 })
    this.created.push(game.code)
    return items.length ? this.call<Game>('post', `games/${game.code}/items`, { items }) : game
  }

  game(code: string) {
    return this.call<Game>('get', `games/${code}`)
  }

  library() {
    return this.call<{ code: string; title: string }[]>('get', 'games')
  }

  students() {
    return this.call<{ id: number; displayName: string; weeklyStars: number; totalStars: number }[]>('get', 'classrooms/c-3a/students')
  }

  /** Undoes stars a test gave, so the class keeps its real stars. */
  takeBackStar(studentId: number, stars = 1) {
    return this.call('post', `classrooms/c-3a/students/${studentId}/points`, { points: -stars, reason: 'E2E' })
  }

  /** Replaces the settings of the version being edited. */
  setSettings(code: string, settings: Record<string, unknown>) {
    return this.call<Game>('patch', `games/${code}`, { settings })
  }

  adopt(code: string) {
    this.created.push(code)
  }

  classroom(code: string) {
    return this.call<Classroom>('get', `classrooms/${code}`)
  }

  classroomList() {
    return this.call<Classroom[]>('get', 'classrooms')
  }

  classStudents(code: string) {
    return this.call<{ id: number; displayName: string; rollNumber: number; weeklyStars: number; totalStars: number }[]>(
      'get',
      `classrooms/${code}/students`,
    )
  }

  /** A class made by the test (archived by `cleanUp`), with these students. */
  async createClassroom(name: string, students: string[] = []): Promise<Classroom> {
    const classroom = await this.call<Classroom>('post', 'classrooms', { name, grade: 2, schoolName: 'Trường E2E' })
    this.classrooms.push(classroom.code)
    if (students.length) {
      await this.call('post', `classrooms/${classroom.code}/students`, { students: students.map((displayName) => ({ displayName })) })
    }
    return this.classroom(classroom.code)
  }

  /** A game played with a class, ended with these results unless `ended` is false; returns the session id. */
  async playSession(classroomCode: string, gameCode: string, { ended = true, results }: { ended?: boolean; results?: unknown } = {}) {
    const session = await this.call<{ id: number }>('post', `classrooms/${classroomCode}/sessions`, { gameCode })
    if (ended) await this.call('post', `classrooms/${classroomCode}/sessions/${session.id}/end`, results ? { results } : undefined)
    return session.id
  }

  awardStars(classroomCode: string, studentId: number, points: number) {
    return this.call('post', `classrooms/${classroomCode}/students/${studentId}/points`, { points, reason: 'E2E' })
  }

  /** A class the test made in the browser, archived by `cleanUp`. */
  adoptClassroom(code: string) {
    this.classrooms.push(code)
  }

  /** A question set made by the test (archived by `cleanUp`), with these questions. */
  async createQuestionSet(title: string, questions: QuestionInput[] = [], subject = 'TOAN'): Promise<QuestionSet> {
    const created = await this.call<QuestionSet>('post', 'question-sets', { title, subject, grade: 2 })
    this.questionSets.push(created.summary.code)
    return questions.length ? this.call<QuestionSet>('post', `question-sets/${created.summary.code}/questions`, { questions }) : created
  }

  questionSet(code: string) {
    return this.call<QuestionSet>('get', `question-sets/${code}`)
  }

  questionSetList() {
    return this.call<QuestionSet['summary'][]>('get', 'question-sets')
  }

  /** A set the test made in the browser, archived by `cleanUp`. */
  adoptQuestionSet(code: string) {
    this.questionSets.push(code)
  }

  profile() {
    return this.call<{ displayName: string; phone?: string; avatar?: string }>('get', 'me/profile')
  }

  saveProfile(profile: { displayName: string; phone: string; avatar: string }) {
    return this.call('patch', 'me/profile', profile)
  }

  settings() {
    return this.call<Settings>('get', 'me/settings')
  }

  saveSettings(settings: Settings) {
    return this.call<Settings>('put', 'me/settings', settings)
  }

  /** The teacher's settings now, put back by `cleanUp` whatever the test changes (in the browser or here). */
  async keepSettings(): Promise<Settings> {
    this.keptSettings = await this.settings()
    return this.keptSettings
  }

  async cleanUp() {
    if (this.keptSettings) await this.saveSettings(this.keptSettings)
    for (const code of this.questionSets.splice(0)) {
      await this.http.delete(`question-sets/${code}`)
    }
    for (const code of this.classrooms.splice(0)) {
      await this.http.delete(`classrooms/${code}`)
    }
    for (const code of this.created.splice(0)) {
      await this.http.delete(`games/${code}`)
    }
    await this.http.dispose()
  }
}

export const quizItem = (text: string, options: string[], correct: number) => ({
  itemType: 'SINGLE_CHOICE',
  content: { text, options: options.map((t, i) => ({ id: 'abcdef'[i], text: t })) },
  solution: { correct: ['abcdef'[correct]] },
})

export const pairSet = (itemType: 'PAIR_SET' | 'CARD_SET', pairs: [string, string][]) =>
  itemType === 'PAIR_SET'
    ? {
        itemType,
        content: {
          left: pairs.map(([a], i) => ({ id: `l${i}`, text: a })),
          right: pairs.map(([, b], i) => ({ id: `r${i}`, text: b })),
        },
        solution: { pairs: pairs.map((_, i) => [`l${i}`, `r${i}`]) },
      }
    : {
        itemType,
        content: { cards: pairs.flatMap(([a, b], i) => [{ id: `a${i}`, text: a }, { id: `b${i}`, text: b }]) },
        solution: { pairs: pairs.map((_, i) => [`a${i}`, `b${i}`]) },
      }

export const gridQuestion = (text: string, answer: string, points = 10) => ({
  itemType: 'OPEN_QUESTION',
  content: { text, points },
  solution: { answer },
})

export const crosswordRow = (clue: string, answer: string, keyIndex: number) => ({
  itemType: 'CROSSWORD_ROW',
  content: { clue },
  solution: { answer, keyIndex },
})

/** Cards in the right order. */
export const orderSet = (text: string, cards: string[]) => ({
  itemType: 'ORDER_SET',
  content: { text, items: cards.map((t, i) => ({ id: `e${i + 1}`, text: t })) },
  solution: { order: cards.map((_, i) => `e${i + 1}`) },
})

/** Groups as {name: cards}. */
export const sortSet = (text: string, groups: Record<string, string[]>) => {
  const names = Object.keys(groups)
  const cards = names.flatMap((name, g) => groups[name].map((t) => ({ text: t, group: `g${g + 1}` })))
  return {
    itemType: 'SORT_SET',
    content: {
      text,
      groups: names.map((name, g) => ({ id: `g${g + 1}`, text: name })),
      cards: cards.map((c, i) => ({ id: `c${i + 1}`, text: c.text })),
    },
    solution: { assign: cards.map((c, i) => [`c${i + 1}`, c.group]) },
  }
}
