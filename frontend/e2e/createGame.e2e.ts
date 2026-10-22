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

/** Signs in, and fails the test on any uncaught error in the page. */
test.beforeEach(async ({ page, context }) => {
  await signInBrowser(context)
  page.on('pageerror', (error) => {
    throw error
  })
})

test('the editor\'s "Chơi" goes to the projector, after saying which questions are left out', async ({ page, backend }) => {
  const game = await backend.createGame('QUIZ', 'E2E Chơi từ trình soạn', [
    quizItem('1 + 1 = ?', ['2', '3'], 0),
    quizItem('2 + 2 = ?', ['4', '5'], 0),
    // As the editor saves a question still being written: no correct answer yet.
    { itemType: 'SINGLE_CHOICE', content: { text: 'Chưa xong', options: [{ id: 'a', text: 'A' }, { id: 'b', text: '' }] } },
  ])
  await page.goto(`/games/${game.code}/edit`)
  await page.getByRole('button', { name: 'Chơi · 2 câu hỏi' }).click()
  const confirm = page.getByRole('dialog', { name: /1 câu hỏi chưa đủ nội dung/ })
  await confirm.getByRole('button', { name: 'Sửa tiếp' }).click()
  await expect(page).toHaveURL(new RegExp(`/games/${game.code}/edit$`))

  await page.getByRole('button', { name: 'Chơi · 2 câu hỏi' }).click()
  await page.getByRole('dialog', { name: /1 câu hỏi chưa đủ nội dung/ }).getByRole('button', { name: 'Chơi 2 câu hỏi' }).click()
  await expect(page).toHaveURL(new RegExp(`/play/${game.code}$`))
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
  await expect(page.getByText('Câu 1 / 2')).toBeVisible()
})
