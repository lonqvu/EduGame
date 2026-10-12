import { expect, test } from '@playwright/test'
import { TEACHER } from './api'

test('the teacher signs in on the login page and lands on the home page', async ({ page }) => {
  await page.goto('/play/g-addition')
  await expect(page).toHaveURL(/\/login\?from=/)
  await page.getByLabel('Email').fill(TEACHER.username)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(TEACHER.password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  // Back to the page asked for first.
  await expect(page).toHaveURL(/\/play\/g-addition$/)
  await page.reload()
  await expect(page).toHaveURL(/\/play\/g-addition$/)
})
