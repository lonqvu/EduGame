import { test as base, expect } from '@playwright/test'
import { Backend, choice, quizItem, shortAnswer, signInBrowser } from './api'

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

const unique = (prefix: string) => `${prefix} ${Date.now().toString(36).slice(-5)}`
const playedCode = (url: string) => url.match(/\/play\/(g-[a-z0-9]+)/)![1]
const editedCode = (url: string) => url.match(/\/games\/(g-[a-z0-9]+)\/edit$/)![1]

test('"Chơi với câu hỏi nào?": a set is played in one click, the game named after it, on the projector', async ({ page, backend }) => {
  const title = unique('E2E Bộ đua')
  await backend.createQuestionSet(title, [choice('2 + 2 = ?', ['4', '5']), choice('3 + 3 = ?', ['6', '7']), shortAnswer('Thủ đô?', 'Hà Nội')])
  const onlyShort = unique('E2E Chỉ tự luận')
  await backend.createQuestionSet(onlyShort, [shortAnswer('Con gì kêu meo meo?', 'Con mèo')])

  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Dùng câu hỏi của cô cho Đua thuyền' }).click()
  const dialog = page.getByRole('dialog', { name: /Chơi với câu hỏi nào/ })
  await expect(dialog).toContainText('Đua thuyền')
  // Many sets: the search box helps.
  await dialog.getByLabel('Tìm bộ câu hỏi').fill('E2E')
  const ours = dialog.getByRole('listitem', { name: title })
  await expect(ours).toContainText('2/3 câu · Trắc nghiệm + tự luận')
  const unfit = dialog.getByRole('listitem', { name: onlyShort })
  await expect(unfit).toContainText('Chưa có câu trắc nghiệm cho trò này')
  await expect(unfit.getByRole('button')).toHaveCount(0)

  await ours.getByRole('button', { name: `Chơi với ${title}` }).click()
  await page.waitForURL(/\/play\/g-[a-z0-9]+$/)
  const code = playedCode(page.url())
  backend.adopt(code)
  await expect(page.getByText('Trò chơi dùng 2 câu, bỏ qua 1 câu tự luận.')).toBeVisible()
  await expect(page.getByRole('region', { name: /^Giới thiệu trò chơi/ })).toContainText(`Đua thuyền – ${title}`)
  const game = await backend.game(code)
  expect(game.title).toBe(`Đua thuyền – ${title}`)
  expect(game.items.map((i) => i.content.text)).toEqual(['2 + 2 = ?', '3 + 3 = ?'])
})

test('a game without sets is written from scratch; closing the dialog leaves nothing behind', async ({ page, backend }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Dùng câu hỏi của cô cho Nối cặp' }).click()
  const dialog = page.getByRole('dialog', { name: /Chơi với câu hỏi nào/ })
  await expect(dialog.getByRole('region', { name: 'Bộ câu hỏi của cô' })).toHaveCount(0)

  const before = (await backend.library()).length
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect((await backend.library()).length).toBe(before)

  await page.getByRole('button', { name: 'Dùng câu hỏi của cô cho Nối cặp' }).click()
  await dialog.getByRole('button', { name: /Soạn câu hỏi/ }).click()
  await page.waitForURL(/\/games\/g-[a-z0-9]+\/edit$/)
  const code = editedCode(page.url())
  backend.adopt(code)
  // Named for her, renamed in the editor if she wants.
  await expect(page.getByLabel('Tên trò chơi')).toHaveValue(/^Nối cặp – /)
  expect((await backend.game(code)).items).toHaveLength(1)
})

test('"Dán từ Word / Excel" opens the editor with the paste dialog, and no empty question', async ({ page, backend }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Dùng câu hỏi của cô cho Trắc nghiệm' }).click()
  await page.getByRole('dialog', { name: /Chơi với câu hỏi nào/ }).getByRole('button', { name: /Dán từ Word/ }).click()
  await page.waitForURL(/\/games\/g-[a-z0-9]+\/edit$/)
  const code = editedCode(page.url())
  backend.adopt(code)
  await expect(page.getByRole('dialog')).toBeVisible()
  expect((await backend.game(code)).items).toHaveLength(0)
})

test('"Dùng câu hỏi của cô" on Lật ô offers the seeded sets that fit', async ({ page }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Dùng câu hỏi của cô cho Lật ô thi đua' }).click()
  const dialog = page.getByRole('dialog', { name: /Chơi với câu hỏi nào/ })
  // Lật ô plays every question: the seeded sets fit.
  const reading = dialog.getByRole('listitem', { name: 'Tiếng Việt - Luyện đọc hiểu' })
  await expect(reading).toContainText('6/6 câu')
  await expect(reading.getByRole('button', { name: 'Chơi với Tiếng Việt - Luyện đọc hiểu' })).toBeEnabled()
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
