import { test, expect } from '@playwright/test'

test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
})

test('"Tiện ích" lists the tools, finds one, and says which are still coming', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /Tiện ích/ }).click()
  await expect(page).toHaveURL(/\/utilities$/)
  await expect(page.getByRole('heading', { name: 'Tiện ích', level: 1 })).toBeVisible()
  await expect(page.getByRole('region', { name: '✏️ Tạo tài liệu dạy học' })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Tìm tiện ích' }).fill('pdf')
  await expect(page.getByRole('link', { name: /Phiếu luyện viết ô li/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Ảnh → PDF/ })).toBeVisible()
  await page.getByRole('button', { name: /Ảnh → PDF/ }).click()
  await expect(page.getByText('“Ảnh → PDF” đang được hoàn thiện.')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Tìm tiện ích' }).fill('khong co')
  await expect(page.getByText('Không có tiện ích nào khớp “khong co”.')).toBeVisible()
})

test('a handwriting sheet is laid out from the samples typed, on as many A4 pages as it needs', async ({ page }) => {
  await page.goto('/utilities')
  await page.getByRole('link', { name: /Phiếu luyện viết ô li/ }).click()
  await expect(page).toHaveURL(/\/utilities\/handwriting$/)
  // Back to the tools, from where the account chip is on every page.
  await expect(page.getByRole('link', { name: 'Tiện ích' }).first()).toBeVisible()

  const preview = page.getByRole('region', { name: 'Xem trước' })
  await expect(preview.getByRole('img')).toHaveCount(1)
  await expect(preview.getByRole('img')).toHaveAccessibleName('Luyện viết: b, bé, bà, Mẹ đi chợ')

  await page.getByRole('textbox').fill('ô\nơ')
  await expect(preview.getByRole('img')).toHaveAccessibleName('Luyện viết: ô, ơ')
  // "Cả trang": each sample fills a page.
  await page.getByRole('radio', { name: 'Cả trang' }).click()
  await expect(preview.getByRole('img')).toHaveCount(2)
  await expect(preview.getByText('Trang 2/2')).toBeVisible()

  await page.getByRole('textbox').fill('')
  await expect(page.getByText('Gõ chữ cần luyện ở bên trái, phiếu hiện ở đây.')).toBeVisible()
  await expect(page.getByRole('button', { name: '🖨 In phiếu' })).toBeDisabled()
})
