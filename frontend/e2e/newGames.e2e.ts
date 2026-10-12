import { test as base, expect } from '@playwright/test'
import { Backend, quizItem, signInBrowser } from './api'

const test = base.extend<{ backend: Backend }>({
  // Playwright needs the destructuring pattern here, even with no fixtures to take.
  // oxlint-disable-next-line no-empty-pattern
  backend: async ({}, provide) => {
    const backend = await Backend.signIn()
    await provide(backend)
    await backend.cleanUp()
  },
})

test.beforeEach(async ({ page, context }) => {
  await signInBrowser(context)
  page.on('pageerror', (error) => {
    throw error
  })
})

const QUESTIONS = [
  quizItem('2 + 3 = ?', ['4', '5', '6'], 1),
  quizItem('10 - 4 = ?', ['6', '7', '5'], 0),
  quizItem('3 x 3 = ?', ['6', '8', '9'], 2),
]

test('Rung chuông vàng: wrong answers leave, a rescue brings them back, the last one rings the bell', async ({ page, backend }) => {
  const game = await backend.createGame('GOLDEN_BELL', 'E2E Rung chuông', QUESTIONS)
  await page.goto(`/play/${game.code}`)
  await expect(page.getByText('Còn 28 / 28 bạn')).toBeVisible()
  const board = page.getByLabel('Học sinh trong lớp')

  // Names cannot be marked before the answer is shown.
  await expect(board.getByRole('button', { name: 'Bảo', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Hiện đáp án' }).click()
  await board.getByRole('button', { name: 'Bảo', exact: true }).click()
  await board.getByRole('button', { name: 'Hà', exact: true }).click()
  await expect(page.getByText('2 bạn trả lời sai sẽ ra ngoài.')).toBeVisible()
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()
  await expect(page.getByText('Còn 26 / 28 bạn')).toBeVisible()
  await expect(board.getByRole('button', { name: 'Bảo, ra ngoài ở câu 1' })).toBeDisabled()

  await page.getByRole('button', { name: 'Cứu trợ (1)' }).click()
  await expect(page.getByText('Còn 28 / 28 bạn')).toBeVisible()
  await expect(page.getByRole('button', { name: /Cứu trợ/ })).toHaveCount(0)

  // Everyone but Minh Anh is wrong: she rings the bell before the last question.
  await page.getByRole('button', { name: 'Hiện đáp án' }).click()
  const chips = board.getByRole('button')
  for (let i = 1; i < (await chips.count()); i++) await chips.nth(i).click()
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()
  await expect(page.getByRole('heading', { name: 'Minh Anh rung chuông vàng!' })).toBeVisible()

  const minhAnh = (await backend.students()).find((s) => s.displayName === 'Minh Anh')!
  await page.getByRole('button', { name: 'Thưởng 2 sao cho Minh Anh' }).click()
  await expect(page.getByRole('button', { name: 'Đã thưởng sao' })).toBeDisabled()
  await expect.poll(async () => (await backend.students()).find((s) => s.id === minhAnh.id)!.totalStars).toBe(minhAnh.totalStars + 2)
  await backend.takeBackStar(minhAnh.id, 2)
})

test('Rung chuông vàng: when everyone is wrong, nobody is out', async ({ page, backend }) => {
  const game = await backend.createGame('GOLDEN_BELL', 'E2E Cả lớp sai', QUESTIONS)
  await page.goto(`/play/${game.code}`)
  await page.getByRole('button', { name: 'Hiện đáp án' }).click()
  const chips = page.getByLabel('Học sinh trong lớp').getByRole('button')
  for (let i = 0; i < (await chips.count()); i++) await chips.nth(i).click()
  await expect(page.getByText('Cả lớp cùng sai: không ai bị loại ở câu này.')).toBeVisible()
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()
  await expect(page.getByText('Còn 28 / 28 bạn')).toBeVisible()
  await expect(page.getByText('Câu vừa rồi cả lớp cùng sai nên không ai bị loại.')).toBeVisible()
})

test('Đua thuyền: right answers move the boat, the first boat at the dock wins', async ({ page, backend }) => {
  const game = await backend.createGame('BOAT_RACE', 'E2E Đua thuyền', QUESTIONS)
  await backend.setSettings(game.code, { shuffleItems: false, rules: { participants: { teams: 2 }, scoring: { points: 1, allowSteal: true }, win: { steps: 2 } } })
  await page.goto(`/play/${game.code}`)
  const option = (text: string) => page.getByRole('button', { name: new RegExp(`^[A-F✓]?\\s*${text}$`) })

  // Question 1: Đội Cam is wrong, Đội Biển steals it.
  await page.getByRole('button', { name: 'Đội Cam, chặng 0 / 2' }).click()
  await option('4').click()
  await page.getByRole('button', { name: 'Đội Biển, chặng 0 / 2' }).click()
  await option('5').click()
  await expect(page.getByRole('button', { name: 'Đội Biển, chặng 1 / 2' })).toBeVisible()
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()

  // Question 2: Đội Biển reaches the dock; the game ends there.
  await page.getByRole('button', { name: 'Đội Biển, chặng 1 / 2' }).click()
  await option('6').click()
  await expect(page.getByText('Đội Biển đã cập bến!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Biển chiến thắng!')).toBeVisible()
})

test('a quiz can be played as Rung chuông vàng or Đua thuyền from the editor', async ({ page, backend }) => {
  const game = await backend.createGame('QUIZ', 'E2E Chơi kiểu khác', QUESTIONS)
  await page.goto(`/games/${game.code}/edit`)
  await page.getByRole('button', { name: 'Chơi kiểu khác' }).click()
  await page.getByRole('link', { name: 'Rung chuông vàng' }).click()
  await expect(page).toHaveURL(new RegExp(`/play/${game.code}\\?as=GOLDEN_BELL$`))
  await expect(page.getByText('Còn 28 / 28 bạn')).toBeVisible()

  await page.goto(`/play/${game.code}?as=BOAT_RACE`)
  await expect(page.getByText('Bến', { exact: true })).toBeVisible()
  // Anything else falls back to the game's own screen.
  await page.goto(`/play/${game.code}?as=MATCHING`)
  await expect(page.getByText('Đội nào giành được quyền trả lời? Cô bấm vào tên đội.')).toBeVisible()
})

test('the chooser lists the new games, and a new Rung chuông vàng opens the quiz editor', async ({ page, backend }) => {
  await page.goto('/games/new')
  for (const name of ['Rung chuông vàng', 'Đua thuyền']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Chọn trò chơi Rung chuông vàng' }).click()
  await page.waitForURL(/\/games\/(g-[a-z0-9]+)\/edit$/)
  backend.adopt(page.url().match(/(g-[a-z0-9]+)\/edit$/)![1])
  await expect(page.getByRole('button', { name: 'Thêm câu Đúng / Sai' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chơi kiểu khác' })).toBeVisible()
})
