import { test, expect } from '@playwright/test'
import { signInBrowser } from './api'

test.beforeEach(async ({ page, context }) => {
  await signInBrowser(context)
  page.on('pageerror', (error) => {
    throw error
  })
})

const groups = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Nhóm trò chơi' })

test('the games are grouped by what the teacher prepares, every one on the page', async ({ page }) => {
  await page.goto('/games/new')
  const questions = page.getByRole('region', { name: 'Hỏi đáp' })
  // Every game a question set plays is a "Hỏi đáp" game, the word games too.
  for (const name of ['Lật ô thi đua', 'Trắc nghiệm', 'Bingo', 'Vua Tiếng Việt', 'Đoán chữ']) {
    await expect(questions.getByRole('button', { name: `Chơi ngay ${name}`, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('region', { name: 'Giải đố' }).getByRole('button', { name: 'Chơi ngay Nối cặp' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Công cụ lớp học' }).getByRole('button', { name: 'Chơi ngay Bấm giờ' })).toBeVisible()
  // The chip says how many, and jumps to the group.
  await expect(groups(page).getByRole('button', { name: /Hỏi đáp/ })).toHaveAttribute('aria-current', 'true')
  await groups(page).getByRole('button', { name: /Công cụ/ }).click()
  await expect(page.getByRole('region', { name: 'Công cụ lớp học' })).toBeInViewport()
  await expect(groups(page).getByRole('button', { name: /Công cụ/ })).toHaveAttribute('aria-current', 'true')
})

test('hovering a game says what it is and its first three steps', async ({ page }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: 'Chơi ngay Đua thuyền', exact: true }).hover()
  const preview = page.getByRole('tooltip')
  await expect(preview).toContainText('Đua thuyền')
  await expect(preview.getByRole('listitem')).toHaveCount(3)
  await expect(preview).toContainText('Dùng bộ câu hỏi')
})

test('on a phone a long group shows six games, and the rest on demand', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/games/new')
  const questions = page.getByRole('region', { name: 'Hỏi đáp' })
  await expect(questions.getByRole('button', { name: /^Chơi ngay / }).filter({ visible: true })).toHaveCount(6)
  await questions.getByRole('button', { name: /^Xem thêm \d+ trò/ }).click()
  await expect(questions.getByRole('button', { name: 'Chơi ngay Đoán chữ' })).toBeVisible()
})
