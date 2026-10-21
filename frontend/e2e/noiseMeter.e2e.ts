import { expect, test } from '@playwright/test'
import { signInBrowser } from './api'

// A fake microphone (a steady beep), allowed without asking: the meter has something to measure.
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
})

test.beforeEach(async ({ page, context }) => {
  await signInBrowser(context)
  page.on('pageerror', (error) => {
    throw error
  })
})

test('Đo tiếng ồn measures the microphone against the limit, and turns it off', async ({ page }) => {
  await page.goto('/tools/noise')
  await expect(page.getByRole('status')).toHaveText('Micro đang tắt')
  await page.getByRole('button', { name: /Bật micro/ }).click()
  // The fake microphone beeps: the meter moves.
  await expect.poll(async () => Number(await page.getByRole('meter', { name: 'Độ ồn' }).getAttribute('aria-valuenow')), { timeout: 5000 }).toBeGreaterThan(0)
  await page.getByRole('slider', { name: 'Mức ồn cho phép' }).fill('20')
  await page.getByRole('button', { name: 'Tắt micro' }).click()
  await expect(page.getByRole('status')).toHaveText('Micro đang tắt')
})
