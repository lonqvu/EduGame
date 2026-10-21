import { test as base, expect } from '@playwright/test'
import { Backend, choice, shortAnswer, signInBrowser } from './api'

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
const gameCode = (url: string) => url.match(/\/games\/(g-[a-z0-9]+)\/(edit|start)$/)![1]

test('a game made from a question set: named, the set picked among those it can play, then its start page', async ({ page, backend }) => {
  const title = unique('E2E Bộ đua')
  await backend.createQuestionSet(title, [choice('2 + 2 = ?', ['4', '5']), choice('3 + 3 = ?', ['6', '7']), shortAnswer('Thủ đô?', 'Hà Nội')])
  const onlyShort = unique('E2E Chỉ tự luận')
  await backend.createQuestionSet(onlyShort, [shortAnswer('Con gì kêu meo meo?', 'Con mèo')])

  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Dùng câu hỏi của cô cho Đua thuyền' }).click()
  const dialog = page.getByRole('dialog', { name: /Tạo trò chơi mới/ })
  await expect(dialog.getByText('Đua thuyền • Tạo nội dung và bắt đầu chơi')).toBeVisible()
  // The name starts from the game and the class; the set option comes first and is chosen.
  await expect(dialog.getByLabel('Tên trò chơi')).toHaveValue(/^Đua thuyền/)
  await expect(dialog.getByRole('radio', { name: /Dùng bộ câu hỏi có sẵn/ })).toHaveAttribute('aria-checked', 'true')

  await dialog.getByLabel('Tên trò chơi').fill('')
  await expect(dialog.getByText('Cô đặt tên cho trò chơi nhé.')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled()
  await dialog.getByLabel('Tên trò chơi').fill('Đua thuyền – Ôn tập')
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click()

  const picker = page.getByRole('dialog', { name: /Chọn bộ câu hỏi/ })
  await picker.getByLabel('Tìm bộ câu hỏi').fill('E2E')
  const ours = picker.getByRole('radio', { name: new RegExp(title) })
  await expect(ours).toContainText('2/3 câu · Trắc nghiệm + tự luận')
  await expect(ours).toContainText('Phù hợp')
  const unfit = picker.getByRole('radio', { name: new RegExp(onlyShort) })
  await expect(unfit).toContainText('Không phù hợp với trò chơi này')
  await expect(unfit).toBeDisabled()

  // Back keeps the name; then the set is picked and the game made.
  await picker.getByRole('button', { name: '← Quay lại' }).click()
  await expect(dialog.getByLabel('Tên trò chơi')).toHaveValue('Đua thuyền – Ôn tập')
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click()
  await picker.getByLabel('Tìm bộ câu hỏi').fill(title)
  await ours.click()
  await expect(ours).toHaveAttribute('aria-checked', 'true')
  await picker.getByRole('button', { name: 'Tạo game' }).click()

  // A game made from a set is ready to play: its start page opens.
  await page.waitForURL(/\/games\/g-[a-z0-9]+\/start$/)
  const code = gameCode(page.url())
  backend.adopt(code)
  await expect(page.getByText('Đã tạo “Đua thuyền – Ôn tập” với 2 câu hỏi (bỏ qua 1 câu tự luận).')).toBeVisible()
  const game = await backend.game(code)
  expect(game.title).toBe('Đua thuyền – Ôn tập')
  expect(game.items.map((i) => i.content.text)).toEqual(['2 + 2 = ?', '3 + 3 = ?'])
})

test('a game that cannot use a set only offers new content, named as the teacher wants', async ({ page, backend }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Dùng câu hỏi của cô cho Nối cặp' }).click()
  const dialog = page.getByRole('dialog', { name: /Tạo trò chơi mới/ })
  await expect(dialog.getByRole('radio', { name: /Dùng bộ câu hỏi có sẵn/ })).toHaveCount(0)
  await expect(dialog.getByRole('radio', { name: /Soạn nội dung mới/ })).toHaveAttribute('aria-checked', 'true')

  // Cancel leaves nothing behind.
  const before = (await backend.library()).length
  await dialog.getByRole('button', { name: 'Hủy' }).click()
  await expect(dialog).toBeHidden()
  expect((await backend.library()).length).toBe(before)

  await page.getByRole('button', { name: 'Dùng câu hỏi của cô cho Nối cặp' }).click()
  await dialog.getByLabel('Tên trò chơi').fill('Nối từ tiếng Anh')
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click()
  await page.waitForURL(/\/games\/g-[a-z0-9]+\/edit$/)
  const code = gameCode(page.url())
  backend.adopt(code)
  expect((await backend.game(code)).title).toBe('Nối từ tiếng Anh')
})

test('"Dùng câu hỏi của cô" on Lật ô offers the seeded sets that fit', async ({ page }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Dùng câu hỏi của cô cho Lật ô thi đua' }).click()
  const dialog = page.getByRole('dialog', { name: /Tạo trò chơi mới/ })
  await expect(dialog.getByText('Lật ô thi đua • Tạo nội dung và bắt đầu chơi')).toBeVisible()
  await expect(dialog.getByRole('radio', { name: /Dùng bộ câu hỏi có sẵn/ })).toBeVisible()
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click()
  // Lật ô plays every question: the seeded sets fit.
  const picker = page.getByRole('dialog', { name: /Chọn bộ câu hỏi/ })
  await expect(picker.getByRole('radio', { name: /Tiếng Việt - Luyện đọc hiểu/ })).toContainText('6/6 câu')
  await expect(picker.getByRole('radio', { name: /Tiếng Việt - Luyện đọc hiểu/ })).toBeEnabled()
  await picker.getByRole('button', { name: 'Hủy' }).click()
  await expect(picker).toBeHidden()
})
