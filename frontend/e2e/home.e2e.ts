import { test as base, expect } from '@playwright/test'
import { Backend, choice, signInBrowser } from './api'

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

test('the home page leads to a game with one main button, and to the tools of the lesson', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Chào/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tổ chức trò chơi' })).toHaveAttribute('href', '/games/new')
  await expect(page.getByRole('heading', { name: 'Chơi gần đây' })).toBeVisible()
  // No "Trò chơi nổi bật", no "Hôm nay": the tools of the lesson instead.
  await expect(page.getByText('Trò chơi nổi bật')).toHaveCount(0)
  const tools = page.getByRole('list', { name: 'Công cụ lớp học' })
  await expect(tools.getByRole('link')).toHaveCount(4)
  await tools.getByRole('link', { name: /Gọi tên/ }).click()
  await expect(page).toHaveURL(/\/tools\/wheel$/)
})

test('"Chơi" on a question set of the home page picks the game for it', async ({ page, backend }) => {
  const set = await backend.createQuestionSet(`E2E Trang chủ ${Date.now().toString(36).slice(-5)}`, [choice('1 + 1 = ?', ['2', '3'])])
  await page.goto('/')
  await page.getByRole('button', { name: `Chơi với ${set.summary.title}` }).click()
  const dialog = page.getByRole('dialog', { name: /với trò nào\?/ })
  await expect(dialog).toContainText(set.summary.title)
  await dialog.getByRole('button', { name: 'Đóng' }).click()
  await expect(dialog).toBeHidden()
})

test('the top bar shows the picture of "Hồ sơ của tôi", and "Góp ý" is in the menu', async ({ page, backend }) => {
  const kept = await backend.profile()
  await backend.saveProfile({ displayName: kept.displayName, phone: kept.phone ?? '', avatar: 'panda' })
  try {
    await page.goto('/')
    const account = page.getByRole('button', { name: `Tài khoản ${kept.displayName}` })
    await expect(account.locator('img')).toHaveAttribute('src', /avatar-panda\.svg$/)
    await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: 'Góp ý cho Lớp Vui' })).toBeVisible()
  } finally {
    await backend.saveProfile({ displayName: kept.displayName, phone: kept.phone ?? '', avatar: kept.avatar ?? '' })
  }
})
