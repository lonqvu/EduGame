import { expect, test } from '@playwright/test'
import { signInBrowser } from './api'

test.beforeEach(async ({ context, page }) => {
  await signInBrowser(context)
  page.on('pageerror', (error) => {
    throw error
  })
})

test('a thin bar along the top shows while the app waits for the server, and goes away', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Chào/ })).toBeVisible()
  // The question sets take a while to come.
  await page.route('**/api/v1/question-sets*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.continue()
  })
  const bar = page.getByRole('progressbar', { name: 'Đang tải', includeHidden: true })
  await page.getByRole('link', { name: 'Bộ câu hỏi' }).first().click()
  await expect(bar).toHaveAttribute('aria-hidden', 'false')
  await expect.poll(async () => Number(await bar.getAttribute('aria-valuenow'))).toBeGreaterThan(0)
  await expect(bar).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 })
})

test('quick pages do not flash the bar', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Chào/ })).toBeVisible()
  const bar = page.getByRole('progressbar', { name: 'Đang tải', includeHidden: true })
  await expect(bar).toHaveAttribute('aria-hidden', 'true', { timeout: 5000 })
})
