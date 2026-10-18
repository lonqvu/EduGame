import { readFile } from 'node:fs/promises'
import { test as base, expect, type Page } from '@playwright/test'
import { Backend, signInBrowser } from './api'

const test = base.extend<{ backend: Backend }>({
  // oxlint-disable-next-line no-empty-pattern
  backend: async ({}, provide) => {
    const backend = await Backend.signIn()
    await provide(backend)
    await backend.cleanUp()
  },
})

test.use({ timezoneId: 'Asia/Ho_Chi_Minh' })

test.beforeEach(async ({ page, context }) => {
  await signInBrowser(context)
  page.on('pageerror', (error) => {
    throw error
  })
})

const tile = (page: Page, label: string) => page.locator('div').filter({ has: page.getByText(label, { exact: true }) }).filter({ has: page.locator('span.text-\\[30px\\]') }).last()

/** A class of three with what it played today: Trắc nghiệm to the end, Rung chuông vàng left open, and stars. */
async function playedClass(backend: Backend) {
  const classroom = await backend.createClassroom('E2E Báo cáo', ['An', 'Bình', 'Chi'])
  const [an, binh] = await backend.classStudents(classroom.code)
  await backend.playSession(classroom.code, 'g-quiz-vn', {
    results: { teams: [{ name: 'Đội Đỏ', score: 40, correct: 4 }, { name: 'Đội Xanh', score: 30, correct: 3 }] },
  })
  await backend.playSession(classroom.code, 'g-golden-bell', { ended: false })
  await backend.awardStars(classroom.code, an.id, 3)
  await backend.awardStars(classroom.code, binh.id, 1)
  await backend.awardStars(classroom.code, binh.id, -1)
  return classroom
}

test('"Báo cáo" shows what a class played, how it ended, and the stars of each student', async ({ page, backend }) => {
  const classroom = await playedClass(backend)

  await page.goto('/')
  await page.getByRole('link', { name: 'Báo cáo' }).click()
  await expect(page).toHaveURL(/\/reports$/)
  await expect(page.getByRole('link', { name: 'Báo cáo' })).toHaveAttribute('aria-current', 'page')

  // The class picker: another class, then this one, kept in the address.
  const pickClass = async (name: string) => {
    await page.getByRole('combobox', { name: 'Lớp' }).click()
    await page.locator(`.ant-select-item-option[title="${name}"]`).click()
  }
  await pickClass('Lớp 3A')
  await expect(page).toHaveURL(/class=c-3a/)
  await pickClass('Lớp E2E Báo cáo')
  await expect(page).toHaveURL(new RegExp(`class=${classroom.code}`))

  await expect(tile(page, 'Hoạt động')).toContainText('2')
  await expect(tile(page, 'Hoạt động')).toContainText('2 trò chơi khác nhau')
  await expect(tile(page, 'Hoàn thành')).toContainText('50%')
  await expect(tile(page, 'Hoàn thành')).toContainText('1/2 trò chơi đến cuối')
  await expect(tile(page, 'Sao đã thưởng')).toContainText('3')
  await expect(tile(page, 'Sao đã thưởng')).toContainText('1/3 học sinh được khen')

  // Today's column says what it holds (also to screen readers and the keyboard).
  const chart = page.getByRole('list', { name: 'Hoạt động theo ngày' })
  const today = chart.getByRole('button').last()
  await expect(today).toHaveAccessibleName(/: 2 hoạt động, 1 hoàn thành$/)
  await today.focus()
  await expect(page.getByRole('tooltip')).toContainText('2 hoạt động')

  await expect(page.getByRole('region', { name: 'Loại trò chơi' })).toContainText('Trắc nghiệm')
  await expect(page.getByRole('region', { name: 'Loại trò chơi' })).toContainText('Rung chuông vàng')

  const stars = page.getByRole('region', { name: 'Sao của học sinh' })
  await expect(stars).toContainText('An')
  await expect(stars).toContainText('3 sao')
  await expect(page.getByRole('list', { name: 'Học sinh chưa được khen' }).getByRole('listitem')).toHaveText(['Bình', 'Chi'])

  const history = page.getByRole('region', { name: 'Lịch sử hoạt động' })
  await expect(history).toContainText('7 câu trả lời đúng của các đội')
  await expect(history.getByRole('listitem').first()).toContainText('Dở dang')
  await expect(history.getByRole('listitem').nth(1)).toContainText('Đội Đỏ thắng · 40 – 30')
  await expect(history.getByRole('listitem').nth(1)).toContainText('Hoàn thành')

  // The history and the stars download as CSV files Excel opens in Vietnamese.
  const [historyFile] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Tải CSV lịch sử hoạt động' }).click()])
  expect(historyFile.suggestedFilename()).toMatch(/^bao-cao-e2e-bao-cao-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}-lich-su\.csv$/)
  const historyCsv = await readFile((await historyFile.path())!, 'utf8')
  expect(historyCsv.startsWith('﻿')).toBe(true)
  expect(historyCsv).toContain('Hoàn thành')
  expect(historyCsv).toContain('Đội Đỏ thắng · 40 – 30')

  const [starsFile] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Tải CSV sao của học sinh' }).click()])
  const starsCsv = await readFile((await starsFile.path())!, 'utf8')
  expect(starsCsv.split('\r\n').slice(1, 4)).toEqual(['1,An,3', '2,Bình,0', '3,Chi,0'])
})

test('the period is picked from presets or two dates, kept in the address, and checked', async ({ page, backend }) => {
  const classroom = await playedClass(backend)
  await page.goto(`/reports?class=${classroom.code}`)
  await expect(tile(page, 'Hoạt động')).toContainText('2')

  await page.getByText('7 ngày', { exact: true }).click()
  await expect(page).toHaveURL(/period=7/)
  await expect(page.getByRole('list', { name: 'Hoạt động theo ngày' }).getByRole('button')).toHaveCount(7)

  await page.getByText('90 ngày', { exact: true }).click()
  // Beyond 45 days, one column per week.
  await expect(page.getByRole('list', { name: 'Hoạt động theo tuần' }).getByRole('button')).toHaveCount(13)

  await page.getByText('Tùy chọn', { exact: true }).click()
  await expect(page).toHaveURL(/period=custom&from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/)
  await page.getByLabel('Từ ngày').fill('2030-01-10')
  await page.getByLabel('Đến ngày').fill('2030-01-01')
  await expect(page.getByRole('alert')).toHaveText('Ngày bắt đầu phải trước ngày kết thúc.')

  // A period with nothing played: say so, and lead to the games.
  await page.getByLabel('Đến ngày').fill('2030-01-31')
  await expect(page.getByText('01/01 – 31/01/2030')).toBeHidden()
  await expect(page.getByText('10/01 – 31/01/2030')).toBeVisible()
  await expect(page.getByText('Chưa có hoạt động nào trong khoảng thời gian này')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tổ chức trò chơi' })).toHaveAttribute('href', '/games/new')

  // The address keeps it: a reload shows the same report.
  await page.reload()
  await expect(page.getByLabel('Từ ngày')).toHaveValue('2030-01-10')
  await expect(page.getByText('Chưa có hoạt động nào trong khoảng thời gian này')).toBeVisible()
})

test('a report that cannot load says so and loads again on request', async ({ page, backend }) => {
  const classroom = await playedClass(backend)
  let fail = true
  await page.route('**/api/v1/reports/**', (route) => (fail ? route.fulfill({ status: 503, body: '' }) : route.continue()))

  await page.goto(`/reports?class=${classroom.code}`)
  await expect(page.getByText('Chưa tải được dữ liệu')).toBeVisible()

  fail = false
  await page.getByRole('button', { name: /Thử lại/ }).click()
  await expect(tile(page, 'Hoạt động')).toContainText('2')
})
