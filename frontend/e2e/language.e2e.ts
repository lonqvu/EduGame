import { test, expect } from '@playwright/test'
import { Backend, signInBrowser } from './api'

// The teacher's settings are put back afterwards (the language among them).
test.afterEach(async () => {
  const backend = await Backend.signIn()
  const settings = await backend.settings()
  await backend.saveSettings({ ...settings, display: { ...settings.display, language: 'vi' } })
  await backend.cleanUp()
})

test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
})

test('the language is switched next to the account, saved, and offered on the sign-in page', async ({ page, context }) => {
  await signInBrowser(context)
  await page.goto('/')
  await page.getByRole('button', { name: 'Ngôn ngữ: Tiếng Việt' }).click()
  await page.getByRole('menuitem', { name: /English/ }).click()
  await expect(page.getByRole('button', { name: 'Language: English' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // Saved with the settings: still English after a reload, and no longer a row of "Cài đặt".
  await page.reload()
  await expect(page.getByRole('button', { name: 'Language: English' })).toBeVisible()
  await page.goto('/settings')
  await expect(page.locator('#set-language')).toHaveCount(0)

  await page.getByRole('button', { name: 'Language: English' }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt' }).click()
  await expect(page.getByRole('button', { name: 'Ngôn ngữ: Tiếng Việt' })).toBeVisible()

  // A visitor picks it on the sign-in page too.
  await context.clearCookies()
  await page.goto('/login')
  await page.getByRole('button', { name: 'Ngôn ngữ: Tiếng Việt' }).click()
  await page.getByRole('menuitem', { name: /English/ }).click()
  await expect(page.getByRole('button', { name: 'Language: English' })).toBeVisible()
})
