import { test as base, expect, type Page } from '@playwright/test'
import { Backend, quizItem, signInBrowser } from './api'

/** Every test keeps the teacher's settings and puts them back afterwards. */
const test = base.extend<{ backend: Backend }>({
  // oxlint-disable-next-line no-empty-pattern
  backend: async ({}, provide) => {
    const backend = await Backend.signIn()
    await backend.keepSettings()
    await backend.saveSettings({
      display: { reduceMotion: false, fullscreenOnStart: false },
      games: {},
      notifications: { newSignInEmail: true, passwordChangedEmail: true },
      sound: { enabled: true, volume: 80, music: true },
    })
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

async function pick(page: Page, select: string, option: string) {
  await page.getByRole('combobox', { name: select }).click()
  await page.locator(`.ant-select-item-option[title="${option}"]`).click()
}

const saved = (page: Page) => expect(page.getByRole('status').filter({ hasText: 'Đã lưu' })).toBeVisible()
const reduceMotion = (page: Page) => page.evaluate(() => document.documentElement.hasAttribute('data-reduce-motion'))

test('"Cài đặt" in the menu opens the settings, and every change is saved by itself', async ({ page, backend }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Cài đặt' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { name: 'Cài đặt', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Gửi tới colan@edugame.local')).toBeVisible()

  await page.getByRole('switch', { name: 'Toàn màn hình khi bắt đầu trò chơi' }).click()
  await page.getByRole('switch', { name: 'Mật khẩu được thay đổi' }).click()
  await pick(page, 'Thời gian mỗi câu', '45 giây')
  await pick(page, 'Cho đội khác giành quyền', 'Không')
  await saved(page)

  await expect
    .poll(() => backend.settings())
    .toEqual({
      display: { reduceMotion: false, fullscreenOnStart: true },
      games: { timeLimitSec: 45, allowSteal: false },
      notifications: { newSignInEmail: true, passwordChangedEmail: false },
      sound: { enabled: true, volume: 80, music: true },
    })

  await page.reload()
  await expect(page.getByRole('switch', { name: 'Toàn màn hình khi bắt đầu trò chơi' })).toBeChecked()
  await expect(page.getByRole('switch', { name: 'Mật khẩu được thay đổi' })).not.toBeChecked()
  await expect(page.getByRole('combobox', { name: 'Thời gian mỗi câu' }).locator('xpath=ancestor::div[contains(@class,"ant-select")][1]')).toContainText('45 giây')

  // "Đặt lại theo từng trò" clears every default for new games.
  await page.getByRole('button', { name: 'Đặt lại theo từng trò' }).click()
  await expect(page.getByRole('button', { name: 'Đặt lại theo từng trò' })).toBeHidden()
  await expect.poll(async () => (await backend.settings()).games).toEqual({})
})

test('a new game made in the app starts with the defaults; games made before keep theirs', async ({ page, backend }) => {
  const before = await backend.createGame('QUIZ', 'E2E Trước cài đặt', [quizItem('1 + 1 = ?', ['2', '3'], 0)])

  await page.goto('/settings')
  await pick(page, 'Số đội', '3 đội')
  await pick(page, 'Thời gian mỗi câu', '20 giây')
  await pick(page, 'Xáo trộn thứ tự câu hỏi', 'Có')
  await saved(page)
  await expect.poll(async () => (await backend.settings()).games).toEqual({ teams: 3, timeLimitSec: 20, shuffleItems: true })

  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Chọn trò chơi Trắc nghiệm' }).click()
  const dialog = page.getByRole('dialog', { name: /Tạo trò chơi mới/ })
  await dialog.getByRole('radio', { name: /Soạn nội dung mới/ }).click()
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click()
  await page.waitForURL(/\/games\/g-[a-z0-9]+\/edit$/)
  const code = /\/games\/([^/]+)\/edit$/.exec(page.url())![1]
  backend.adopt(code)

  const made = await backend.game(code)
  expect(made.settings.rules.participants.teams).toBe(3)
  expect(made.settings.timeLimitSec).toBe(20)
  expect(made.settings.shuffleItems).toBe(true)
  // Not a teacher default: the template's own.
  expect(made.settings.rules.scoring.allowSteal).toBe(true)

  // The start page shows the game with those rules.
  await page.goto(`/games/${code}/start`)
  await expect(page.getByRole('combobox', { name: 'Số đội' }).locator('xpath=ancestor::div[contains(@class,"ant-select")][1]')).toContainText('3 đội')

  const old = await backend.game(before.code)
  expect(old.settings.rules.participants.teams).toBe(4)
  expect(old.settings.timeLimitSec).toBe(30)
})

test('"Giảm hiệu ứng chuyển động" applies at once, everywhere, and before the settings load', async ({ page, backend }) => {
  await page.goto('/settings')
  expect(await reduceMotion(page)).toBe(false)

  await page.getByRole('switch', { name: 'Giảm hiệu ứng chuyển động' }).click()
  await expect.poll(() => reduceMotion(page)).toBe(true)
  await saved(page)
  await expect.poll(async () => (await backend.settings()).display.reduceMotion).toBe(true)

  // Other screens, the projector included.
  await page.goto('/classes')
  await expect.poll(() => reduceMotion(page)).toBe(true)
  await page.goto('/tools/dice')
  await expect.poll(() => reduceMotion(page)).toBe(true)

  // Even while the settings are still on their way (kept in this browser).
  await page.route('**/api/v1/me/settings', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })
  const loaded = page.waitForResponse('**/api/v1/me/settings')
  await page.goto('/')
  await expect.poll(() => reduceMotion(page), { timeout: 1000 }).toBe(true)
  await loaded
  await page.unroute('**/api/v1/me/settings')

  await page.goto('/settings')
  await page.getByRole('switch', { name: 'Giảm hiệu ứng chuyển động' }).click()
  await expect.poll(() => reduceMotion(page)).toBe(false)
  await saved(page)
})

test('a change the server refuses goes back, with a message', async ({ page, backend }) => {
  await page.goto('/settings')
  await page.route('**/api/v1/me/settings', (route) =>
    route.request().method() === 'PUT' ? route.fulfill({ status: 503, body: '' }) : route.continue(),
  )

  const fullscreen = page.getByRole('switch', { name: 'Toàn màn hình khi bắt đầu trò chơi' })
  await fullscreen.click()
  await expect(page.getByText(/Chưa lưu được cài đặt/)).toBeVisible()
  await expect(fullscreen).not.toBeChecked()
  expect((await backend.settings()).display.fullscreenOnStart).toBe(false)

  // Back online: the next change saves.
  await page.unroute('**/api/v1/me/settings')
  await fullscreen.click()
  await saved(page)
  await expect.poll(async () => (await backend.settings()).display.fullscreenOnStart).toBe(true)
})

test('"Bắt đầu trò chơi" opens the projector in full screen when asked, and the teacher screens leave it', async ({ page, backend }) => {
  const game = await backend.createGame('QUIZ', 'E2E Toàn màn hình', [quizItem('1 + 1 = ?', ['2', '3'], 0)])
  const fullscreen = () => page.evaluate(() => document.fullscreenElement !== null)

  // Off: the game opens in the window.
  await page.goto(`/games/${game.code}/start`)
  await page.getByRole('link', { name: 'Bắt đầu trò chơi' }).click()
  await page.waitForURL(new RegExp(`/play/${game.code}$`))
  expect(await fullscreen()).toBe(false)

  await backend.saveSettings({ ...(await backend.settings()), display: { reduceMotion: false, fullscreenOnStart: true } })
  await page.goto(`/games/${game.code}/start`)
  await page.getByRole('link', { name: 'Bắt đầu trò chơi' }).click()
  await page.waitForURL(new RegExp(`/play/${game.code}$`))
  await expect.poll(fullscreen).toBe(true)

  // Back to the start page: full screen ends.
  await page.goBack()
  await page.waitForURL(new RegExp(`/games/${game.code}/start$`))
  await expect.poll(fullscreen).toBe(false)
})

test('the profile rows "Thông báo" and "Ngôn ngữ & hiển thị" lead to their settings', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('button', { name: /^Thông báo Email/ }).click()
  await expect(page).toHaveURL(/\/settings#notifications$/)
  await expect(page.getByRole('region', { name: 'Thông báo qua email' })).toBeInViewport()

  await page.goto('/profile')
  await page.getByRole('button', { name: /Ngôn ngữ & hiển thị/ }).click()
  await expect(page).toHaveURL(/\/settings#display$/)
  await expect(page.getByRole('region', { name: 'Hiển thị & trình chiếu' })).toBeInViewport()
})
