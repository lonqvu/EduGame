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

const tile = (page: Page, label: string | RegExp) => page.getByRole('group', { name: label })

/** Picks a class with its pill, or in the list when the teacher has many. */
async function pickClass(page: Page, name: string) {
  const pills = page.getByRole('radiogroup', { name: 'Lớp' })
  if (await pills.isVisible()) await pills.getByRole('radio', { name, exact: true }).click()
  else {
    await page.getByRole('combobox', { name: 'Lớp' }).click()
    await page.locator(`.ant-select-item-option[title="${name}"]`).click()
  }
}

const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

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
  await pickClass(page, 'Lớp 3A')
  await expect(page).toHaveURL(/class=c-3a/)
  await pickClass(page, 'Lớp E2E Báo cáo')
  await expect(page).toHaveURL(new RegExp(`class=${classroom.code}`))

  await expect(tile(page, 'lượt chơi')).toContainText('2')
  await expect(tile(page, 'chơi đến cuối')).toContainText('50%')
  await expect(tile(page, 'sao · 1/3 em được khen')).toContainText('3')

  // Today's column says what it holds (also to screen readers and the keyboard).
  const chart = page.getByRole('list', { name: 'Hoạt động theo ngày' })
  const today = chart.getByRole('button').last()
  await expect(today).toHaveAccessibleName(/: 2 hoạt động, 1 hoàn thành$/)
  await today.focus()
  await expect(page.getByRole('tooltip')).toContainText('2 hoạt động')

  // What to do next: praise who was not, play again the game left halfway.
  const tips = page.getByRole('region', { name: 'Gợi ý cho cô' })
  await expect(tips).toContainText('Bình và Chi chưa được khen sao nào trong tháng này.')
  await expect(tips.getByRole('link', { name: 'Khen ngay →' })).toHaveAttribute('href', `/classes/${classroom.code}`)
  await expect(tips.getByRole('link', { name: 'Chơi lại →' })).toHaveAttribute('href', /^\/play\//)

  const plays = page.getByRole('region', { name: 'Trò lớp hay chơi' })
  await expect(plays.getByRole('list', { name: 'Loại trò chơi' })).toContainText('Trắc nghiệm')
  await expect(plays.getByRole('list', { name: 'Loại trò chơi' })).toContainText('Rung chuông vàng')
  await plays.getByRole('radio', { name: 'Trò của cô' }).click()
  await expect(plays.getByRole('list', { name: 'Trò chơi được chơi nhiều' }).getByRole('listitem')).toHaveCount(2)

  const stars = page.getByRole('region', { name: 'Ngôi sao của lớp' })
  await expect(stars.getByRole('listitem', { name: '1. An: 3 sao' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Học sinh chưa được khen' }).getByRole('listitem')).toHaveText(['Bình', 'Chi'])

  const history = page.getByRole('region', { name: 'Lịch sử hoạt động' })
  await expect(history).toContainText('7 câu trả lời đúng của các đội')
  await expect(history.getByRole('heading', { level: 3 }).first()).toContainText('Hôm nay')
  await expect(history.getByRole('listitem').first()).toContainText('Dừng giữa chừng')
  await expect(history.getByRole('listitem').nth(1)).toContainText('Đội Đỏ thắng · 40 – 30')
  await expect(history.getByRole('listitem').nth(1)).toContainText('Đến cuối')
  await history.getByRole('radio', { name: 'Chơi đến cuối' }).click()
  await expect(history.getByRole('listitem')).toHaveCount(1)

  // The history and the stars download as CSV files Excel opens in Vietnamese.
  const downloadAs = async (item: string) => {
    await page.getByRole('button', { name: /Tải báo cáo/ }).click()
    const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: item }).click()])
    return file
  }
  const historyFile = await downloadAs('Lịch sử hoạt động (CSV)')
  expect(historyFile.suggestedFilename()).toMatch(/^bao-cao-e2e-bao-cao-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}-lich-su\.csv$/)
  const historyCsv = await readFile((await historyFile.path())!, 'utf8')
  expect(historyCsv.startsWith('\ufeff')).toBe(true)
  expect(historyCsv).toContain('Hoàn thành')
  expect(historyCsv).toContain('Đội Đỏ thắng · 40 – 30')

  const starsFile = await downloadAs('Sao của học sinh (CSV)')
  const starsCsv = await readFile((await starsFile.path())!, 'utf8')
  expect(starsCsv.split('\r\n').slice(1, 4)).toEqual(['1,An,3', '2,Bình,0', '3,Chi,0'])
})

test('the period is picked from presets or two dates, kept in the address, and checked', async ({ page, backend }) => {
  const classroom = await playedClass(backend)
  await page.goto(`/reports?class=${classroom.code}`)
  await expect(tile(page, 'lượt chơi')).toContainText('2')

  const periods = page.getByRole('radiogroup', { name: 'Khoảng thời gian' })
  await periods.getByRole('radio', { name: 'Tuần này' }).click()
  await expect(page).toHaveURL(/period=week/)
  await expect(page.getByRole('list', { name: 'Hoạt động theo ngày' })).toBeVisible()
  await periods.getByRole('radio', { name: 'Học kỳ này' }).click()
  await expect(page).toHaveURL(/period=term/)

  // Sixty days: a column per week, or per day on request.
  await periods.getByRole('radio', { name: '📅 Tùy chọn' }).click()
  await expect(page).toHaveURL(/period=custom&from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/)
  const now = new Date()
  await page.getByLabel('Đến ngày').fill(isoDay(now))
  await page.getByLabel('Từ ngày').fill(isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59)))
  await expect(page.getByRole('list', { name: 'Hoạt động theo tuần' }).getByRole('button')).toHaveCount(9)
  await page.getByRole('radio', { name: 'Theo ngày' }).click()
  await expect(page.getByRole('list', { name: 'Hoạt động theo ngày' }).getByRole('button')).toHaveCount(60)

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
  await expect(tile(page, 'lượt chơi')).toContainText('2')
})
