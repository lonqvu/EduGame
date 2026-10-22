import { test as base, expect, type Page } from '@playwright/test'
import { Backend, openGame, quizItem, signInBrowser } from './api'

const test = base.extend<{ backend: Backend }>({
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

/** Every question has the right answer "Đúng rồi", so the tests can answer without knowing the order. */
const QUESTIONS = Array.from({ length: 10 }, (_, i) => quizItem(`Câu số ${i + 1}?`, ['Đúng rồi', `Sai ${i}`, `Nhầm ${i}`], 0))
const right = (page: Page) => page.getByRole('button', { name: /Đúng rồi$/ })
const wrong = (page: Page) => page.getByRole('button', { name: /Sai \d+$/ })
const next = (page: Page) => page.getByRole('button', { name: 'Lượt tiếp theo' })

test('Cờ ca-rô hỏi đáp: right answers mark cells, three in a row wins the board', async ({ page, backend }) => {
  const game = await backend.createGame('TIC_TAC_TOE', 'E2E Ca-rô', QUESTIONS)
  await openGame(page, `/play/${game.code}`)
  const cell = (n: number) => page.getByRole('button', { name: new RegExp(`^Ô ${n}[,:]`) })

  // A wrong answer marks nothing and passes the turn.
  await wrong(page).first().click()
  await expect(page.getByText('Chưa đúng, mất lượt.')).toBeVisible()
  await expect(cell(1)).toBeDisabled()
  await next(page).click()

  // Đội Biển (O) plays next: O 4, X 1, O 5, X 2, O 9, X 3: three X across.
  for (const n of [4, 1, 5, 2, 9, 3]) {
    await right(page).click()
    await expect(next(page)).toBeDisabled()
    await cell(n).click()
    if (n !== 3) await next(page).click()
  }
  await expect(page.getByRole('status')).toHaveText(/thắng ván này!/)
  await expect(cell(1)).toHaveAccessibleName('Ô 1: X')
  await expect(cell(4)).toHaveAccessibleName('Ô 4: O')
  await page.getByRole('button', { name: 'Ván mới' }).click()
  await expect(cell(1)).toHaveAccessibleName('Ô 1, trống')
  await page.getByRole('button', { name: 'Kết thúc' }).click()
  await expect(page.getByText(/chiến thắng!/)).toBeVisible()
})

test('Bốn ô liên tiếp: a right answer drops a disc in the chosen column', async ({ page, backend }) => {
  const game = await backend.createGame('CONNECT_FOUR', 'E2E Bốn ô', QUESTIONS)
  await openGame(page, `/play/${game.code}`)
  await expect(page.getByRole('button', { name: 'Thả vào cột 1' })).toBeDisabled()
  for (let turn = 0; turn < 7; turn++) {
    await right(page).click()
    // Đội Cam fills column 1, Đội Biển column 2: four discs for Đội Cam after its fourth turn.
    await page.getByRole('button', { name: `Thả vào cột ${turn % 2 === 0 ? 1 : 2}` }).click()
    if (turn < 6) await next(page).click()
  }
  await expect(page.getByRole('status')).toHaveText(/Đội Cam có 4 quân liền nhau!/)
})

test('Rương vàng: a right answer opens a chest, which changes the scores', async ({ page, backend }) => {
  const game = await backend.createGame('TREASURE_CHEST', 'E2E Rương', QUESTIONS)
  await openGame(page, `/play/${game.code}`)
  await expect(page.getByRole('button', { name: 'Rương 1' })).toBeDisabled()
  await right(page).click()
  await page.getByRole('button', { name: 'Rương 2' }).click()
  await expect(page.getByRole('button', { name: /^Rương 2: / })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Rương 1: / })).toBeVisible()
  await next(page).click()
  // New turn, new closed chests.
  await expect(page.getByRole('button', { name: 'Rương 1' })).toBeDisabled()
  await expect(page.getByText('Lượt của Đội Biển')).toBeVisible()
})

test('Xây tháp: a right answer adds a block to the team’s tower', async ({ page, backend }) => {
  const game = await backend.createGame('BUILD_TOWER', 'E2E Tháp', QUESTIONS.slice(0, 2))
  await openGame(page, `/play/${game.code}`)
  await page.getByRole('button', { name: 'Đội Lá, tháp 0 khối' }).click()
  await right(page).click()
  await expect(page.getByRole('button', { name: 'Đội Lá, tháp 1 khối' })).toBeVisible()
})

test('Ong tìm hoa: the bee flies to the flower the team picks', async ({ page, backend }) => {
  const game = await backend.createGame('BEE_FLOWER', 'E2E Ong', QUESTIONS.slice(0, 1))
  await openGame(page, `/play/${game.code}`)
  await expect(right(page)).toBeDisabled()
  await page.getByRole('button', { name: /^Đội Biển/ }).click()
  await right(page).click()
  await expect(page.getByText('Chú ong lấy được mật rồi!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Biển chiến thắng!')).toBeVisible()
})

test('Bingo: a right claim is marked and scores, a wrong one is not', async ({ page, backend }) => {
  // Nine different right answers: 3×3 cards.
  const items = Array.from({ length: 9 }, (_, i) => quizItem(`${i} + 1 = ?`, [`${i + 1}`, `${i + 20}`], 0))
  const game = await backend.createGame('BINGO', 'E2E Bingo', items)
  await backend.setSettings(game.code, { shuffleItems: false, rules: { participants: { teams: 2 } } })
  await openGame(page, `/play/${game.code}`)
  // The first question is "0 + 1 = ?": every card has all nine answers.
  await page.getByRole('button', { name: 'Đội Cam: 1', exact: true }).click()
  await page.getByRole('button', { name: 'Đội Biển: 2', exact: true }).click()
  await page.getByRole('button', { name: 'Công bố đáp án' }).click()
  await expect(page.getByRole('button', { name: 'Đội Cam: 1, đã đánh dấu' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Đội Biển: 2', exact: true })).toBeVisible()
  await expect(page.getByLabel('Thẻ của Đội Cam')).toContainText('10')
})
