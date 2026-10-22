import { expect, test } from '@playwright/test'
import { signInBrowser } from './api'

test.beforeEach(async ({ page, context }) => {
  await signInBrowser(context)
  page.on('pageerror', (error) => {
    throw error
  })
})

test('the chooser lists the new class tools, and each opens', async ({ page }) => {
  await page.goto('/games/new')
  for (const [name, path] of [
    ['Tung đồng xu', '/tools/coin'],
    ['Chọn số ngẫu nhiên', '/tools/number'],
    ['Bảng điểm', '/tools/scoreboard'],
    ['Đo tiếng ồn', '/tools/noise'],
    ['Đèn tín hiệu', '/tools/light'],
  ]) {
    await page.goto('/games/new')
    await page.getByRole('button', { name: `Chơi ngay ${name}` }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
  }
})

test('Tung đồng xu: a toss lands on a side and is counted', async ({ page }) => {
  await page.goto('/tools/coin')
  await page.getByRole('button', { name: /Tung đồng xu/ }).click()
  await expect(page.getByRole('status')).toHaveText(/^Mặt (sấp|ngửa)!$/, { timeout: 5000 })
  await expect(page.getByRole('list', { name: 'Các lần tung gần đây' }).getByRole('listitem')).toHaveCount(1)
  await page.keyboard.press('Space')
  await expect(page.getByRole('list', { name: 'Các lần tung gần đây' }).getByRole('listitem')).toHaveCount(2, { timeout: 5000 })
})

test('Chọn số ngẫu nhiên: numbers come out once each until the range is used up', async ({ page }) => {
  await page.goto('/tools/number')
  await page.getByRole('spinbutton', { name: 'Từ số' }).fill('1')
  await page.getByRole('spinbutton', { name: 'Đến số' }).fill('2')
  for (let i = 1; i <= 2; i++) {
    await page.getByRole('button', { name: '🎲 Chọn số' }).click()
    await expect(page.getByRole('list', { name: 'Các số đã chọn' }).getByRole('listitem')).toHaveCount(i, { timeout: 5000 })
  }
  await expect(page.getByText('Đã chọn hết các số!')).toBeVisible()
  const drawn = await page.getByRole('list', { name: 'Các số đã chọn' }).getByRole('listitem').allTextContents()
  expect(drawn.sort()).toEqual(['1', '2'])
  await page.getByRole('button', { name: 'Làm lại từ đầu' }).click()
  await expect(page.getByRole('button', { name: '🎲 Chọn số' })).toBeEnabled()
})

test('Bảng điểm: points go up and down, names change, and the board survives a reload', async ({ page }) => {
  await page.goto('/tools/scoreboard')
  await page.getByRole('button', { name: 'Về 0 hết' }).click()
  await page.getByRole('button', { name: '2', exact: true }).click()
  await expect(page.getByRole('region')).toHaveCount(2)
  await page.getByRole('button', { name: 'Cộng 10 điểm cho Đội Cam' }).click()
  await page.getByRole('button', { name: 'Cộng 5 điểm cho Đội Cam' }).click()
  await page.getByRole('button', { name: 'Trừ 1 điểm cho Đội Cam' }).click()
  await expect(page.getByLabel('Đội Cam: 14 điểm')).toBeVisible()
  await expect(page.getByLabel('Đang dẫn đầu')).toHaveCount(1)
  await page.getByRole('textbox', { name: 'Tên Đội Biển' }).fill('Tổ 2')
  await page.reload()
  await expect(page.getByLabel('Đội Cam: 14 điểm')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Tên Tổ 2' })).toBeVisible()
  await page.getByRole('button', { name: 'Về 0 hết' }).click()
  await expect(page.getByLabel('Đội Cam: 0 điểm')).toBeVisible()
})

test('Đèn tín hiệu: a click or a key turns a light on', async ({ page }) => {
  await page.goto('/tools/light')
  await expect(page.getByRole('status')).toHaveText('Cô chọn một đèn cho lớp nhé!')
  await page.getByRole('radio', { name: /Im lặng/ }).click()
  await expect(page.getByRole('status')).toHaveText('Im lặng')
  await page.keyboard.press('3')
  await expect(page.getByRole('radio', { name: /Thảo luận/ })).toHaveAttribute('aria-checked', 'true')
})

test('Bấm giờ: counts up, pauses, and notes the time of each group', async ({ page }) => {
  await page.goto('/tools/stopwatch')
  const timer = page.getByRole('timer')
  await expect(timer).toHaveText('00:00.0')
  await page.getByRole('button', { name: '▶ Bắt đầu' }).click()
  await expect(timer).not.toHaveText('00:00.0')
  await page.getByRole('button', { name: '🏁 Ghi thời gian' }).click()
  await expect(page.getByRole('list', { name: 'Thời gian đã ghi' }).getByRole('listitem')).toHaveCount(1)
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: '▶ Tiếp tục' })).toBeVisible()
  const paused = await timer.textContent()
  await page.waitForTimeout(300)
  await expect(timer).toHaveText(paused!)
  await page.getByRole('button', { name: 'Về 0' }).click()
  await expect(timer).toHaveText('00:00.0')
})

test('Bốc thăm: the teacher writes the cards, each is drawn once', async ({ page }) => {
  await page.goto('/tools/draw')
  await page.getByRole('button', { name: '✎ Sửa lá thăm' }).click()
  await page.getByRole('textbox', { name: 'Các lá thăm' }).fill('Hát một bài\nĐọc một bài thơ')
  await page.getByRole('button', { name: 'Xong' }).click()
  await expect(page.getByText('2 lá thăm · còn 2 lá')).toBeVisible()
  for (let i = 1; i <= 2; i++) {
    await page.getByRole('button', { name: '🎴 Bốc thăm' }).click()
    await expect(page.getByRole('list', { name: 'Các lá đã bốc' }).getByRole('listitem')).toHaveCount(i)
  }
  await expect(page.getByText('Đã bốc hết lá thăm.', { exact: false })).toBeVisible()
  const drawn = await page.getByRole('list', { name: 'Các lá đã bốc' }).getByRole('listitem').allTextContents()
  expect(drawn.map((d) => d.replace(/^\d+\. /, '')).sort()).toEqual(['Hát một bài', 'Đọc một bài thơ'])
  await page.getByRole('button', { name: 'Xáo lại' }).click()
  await expect(page.getByText('2 lá thăm · còn 2 lá')).toBeVisible()
})

test('Sơ đồ chỗ ngồi: the class on the desks, two taps swap two seats', async ({ page }) => {
  await page.goto('/tools/seating')
  const seats = page.getByRole('list', { name: 'Sơ đồ chỗ ngồi' }).getByRole('button')
  await expect(seats).toHaveCount(28)
  const first = (await seats.nth(0).getAttribute('aria-label'))!.replace('Chỗ 1: ', '')
  const second = (await seats.nth(1).getAttribute('aria-label'))!.replace('Chỗ 2: ', '')
  await seats.nth(0).click()
  await seats.nth(1).click()
  await expect(seats.nth(0)).toHaveAccessibleName(`Chỗ 1: ${second}`)
  await expect(seats.nth(1)).toHaveAccessibleName(`Chỗ 2: ${first}`)
  await page.getByRole('button', { name: '🔀 Xếp ngẫu nhiên' }).click()
  await expect(seats).toHaveCount(28)
})
