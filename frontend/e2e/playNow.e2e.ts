import { test as base, expect, request, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, signInBrowser } from './api'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1/'

/**
 * "Chơi ngay", as a new teacher sees it: the seeded admin account has no class, no game and no question set. Its
 * sample games are archived after each test, so every test starts from nothing.
 */
const test = base.extend<{ api: APIRequestContext }>({
  api: [
    // oxlint-disable-next-line no-empty-pattern
    async ({}, provide) => {
      const anonymous = await request.newContext({ baseURL: API_URL })
      const { accessToken } = await (await anonymous.post('auth/login', { data: ADMIN })).json()
      await anonymous.dispose()
      const api = await request.newContext({ baseURL: API_URL, extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` } })
      const archiveAll = async () => {
        for (const g of (await (await api.get('games')).json()) as { code: string }[]) await api.delete(`games/${g.code}`)
      }
      await archiveAll()
      await provide(api)
      await archiveAll()
      await api.dispose()
    },
    // Every test, used or not, starts and ends with no game.
    { auto: true },
  ],
})

test.beforeEach(async ({ context, page }) => {
  await signInBrowser(context, ADMIN)
  page.on('pageerror', (error) => {
    throw error
  })
})

const intro = (page: Page) => page.getByRole('region', { name: /^Giới thiệu trò chơi/ })

test('"Chơi ngay" puts a question game on the projector at once, with sample questions and its rules first', async ({ page, api }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Chơi ngay Trắc nghiệm' }).click()
  await expect(page).toHaveURL(/\/play\/g-[a-z0-9]+$/)
  const code = /\/play\/(g-[a-z0-9]+)$/.exec(page.url())![1]

  // The introduction for the class: what it is, how a round goes, teams and time, "Bắt đầu".
  await expect(intro(page)).toBeVisible()
  await expect(intro(page)).toContainText('Trắc nghiệm mẫu – Kiến thức chung')
  await expect(intro(page)).toContainText('Câu hỏi mẫu')
  await expect(intro(page).getByRole('list', { name: 'Cách chơi' }).getByRole('listitem')).toHaveCount(4)

  // Teams chosen here are saved with the game and played.
  await intro(page).getByRole('radiogroup', { name: 'Số đội' }).getByRole('radio', { name: '2 đội' }).click()
  await expect(intro(page).getByRole('radio', { name: '2 đội' })).toHaveAttribute('aria-checked', 'true')
  await expect.poll(async () => (await (await api.get(`games/${code}`)).json()).settings.rules.participants.teams).toBe(2)

  // The full rules, then Enter starts.
  await intro(page).getByRole('button', { name: 'Xem luật chơi' }).click()
  const rules = page.getByRole('dialog', { name: /^Luật chơi/ })
  await expect(rules).toBeVisible()
  await rules.getByRole('button', { name: 'Thoát' }).click()
  await expect(rules).toBeHidden()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Câu 1 / 10')).toBeVisible()
  await expect(page.getByText('Đội Cam')).toBeVisible()
  await expect(page.getByText('Đội Lá')).toHaveCount(0)

  // "?" shows the rules again while playing.
  await page.getByRole('button', { name: 'Xem luật chơi' }).click()
  await expect(page.getByRole('dialog', { name: /^Luật chơi/ })).toBeVisible()
})

test('the sample game is made once: playing again opens the same one', async ({ page, api }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Chơi ngay Ô chữ' }).click()
  await expect(page).toHaveURL(/\/play\/g-/)
  const first = page.url()

  await page.goto('/')
  // "Trò chơi nổi bật" plays at once too.
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Chơi ngay Ô chữ' }).click()
  await expect(page).toHaveURL(first)
  const games = (await (await api.get('games')).json()) as { templateCode: string; sample: boolean }[]
  expect(games.filter((g) => g.templateCode === 'CROSSWORD')).toEqual([expect.objectContaining({ sample: true })])
})

test('"Trò chơi nổi bật" on the home page plays the game at once', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Lật ô thi đua/ }).first().click()
  await expect(page).toHaveURL(/\/play\/g-/)
  await expect(intro(page)).toContainText('Lật ô mẫu')
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Ô 1\b/ }).or(page.getByText('1', { exact: true }).first())).toBeVisible()
})

test('without a class, the name tools ask for names on the spot, or roll numbers', async ({ page }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Chơi ngay Vòng quay may mắn' }).click()
  await expect(page).toHaveURL(/\/tools\/wheel$/)
  const names = page.getByRole('region', { name: 'Nhập tên học sinh' })
  await expect(names).toBeVisible()
  await expect(names.getByRole('button', { name: 'Nhập ít nhất 2 tên' })).toBeDisabled()

  await names.getByRole('textbox', { name: 'Danh sách tên' }).fill('1. Nguyễn Minh Anh\n2. Trần Bảo Ngọc\n3. Lê Hoàng Nam')
  await names.getByRole('button', { name: '▶ Bắt đầu với 3 bạn' }).click()
  await expect(names).toBeHidden()
  await expect(page.getByText('Trần Bảo Ngọc').first()).toBeVisible()

  // Another tool, opened afresh, asks again with the names filled in.
  await page.goto('/tools/groups')
  await expect(page.getByRole('textbox', { name: 'Danh sách tên' })).toHaveValue('Nguyễn Minh Anh\nTrần Bảo Ngọc\nLê Hoàng Nam')

  // Or by roll number.
  await page.getByRole('spinbutton', { name: 'Số học sinh' }).fill('5')
  await page.getByRole('button', { name: 'Dùng số thứ tự' }).click()
  await expect(page.getByText('Chia 5 bạn thành')).toBeVisible()
  await page.getByRole('button', { name: 'Chia nhóm' }).click()
  await expect(page.getByText('Số 5', { exact: true })).toBeVisible()
})

test('the introduction of a game opened with "Chơi ngay" leads back to the chooser', async ({ page }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Chơi ngay Trắc nghiệm' }).click()
  await expect(intro(page)).toBeVisible()
  const url = page.url()
  await intro(page).getByRole('button', { name: 'Quay lại' }).click()
  await expect(page).toHaveURL(/\/games\/new$/)

  // Opened directly (a link, a new tab), it leads to the chooser too.
  const tab = await page.context().newPage()
  await tab.goto(url)
  await intro(tab).getByRole('button', { name: 'Quay lại' }).click()
  await expect(tab).toHaveURL(/\/games\/new$/)
})
