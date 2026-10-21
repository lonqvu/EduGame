import { readFile } from 'node:fs/promises'
import { test as base, expect, request, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, signInBrowser } from './api'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1/'
/** The seeded teacher the admin tests lock and unlock (the other tests use Cô Lan). */
const THU = { code: 'u-thu', username: 'cothu@edugame.local', password: '123456' }

/** The API as one account, signed in with a real token. */
async function signedIn(account: { username: string; password: string }): Promise<APIRequestContext> {
  const anonymous = await request.newContext({ baseURL: API_URL })
  const login = await anonymous.post('auth/login', { data: account })
  if (!login.ok()) throw new Error(`Sign-in failed: ${login.status()} ${await login.text()}`)
  const { accessToken } = await login.json()
  await anonymous.dispose()
  return request.newContext({ baseURL: API_URL, extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` } })
}

const canSignIn = async (account: { username: string; password: string }) => {
  const anonymous = await request.newContext({ baseURL: API_URL })
  const status = (await anonymous.post('auth/login', { data: account })).status()
  await anonymous.dispose()
  return status
}

/** Every test leaves Cô Thu as it found her: active, a teacher. */
const test = base.extend<{ admin: APIRequestContext }>({
  // oxlint-disable-next-line no-empty-pattern
  admin: async ({}, provide) => {
    const admin = await signedIn(ADMIN)
    await provide(admin)
    await admin.post(`admin/teachers/${THU.code}/unlock`)
    await admin.put(`admin/teachers/${THU.code}/role`, { data: { role: 'TEACHER' } })
    await admin.dispose()
  },
})

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
})

const nav = (page: Page) => page.getByRole('navigation', { name: 'Điều hướng chính' })

test('a teacher has no "Quản trị": not in the menu, and the pages say so', async ({ page, context }) => {
  await signInBrowser(context)
  await page.goto('/')
  await expect(nav(page).getByRole('link', { name: 'Báo cáo' })).toBeVisible()
  await expect(nav(page).getByRole('link', { name: 'Quản trị' })).toHaveCount(0)

  await page.goto('/admin/teachers')
  await expect(page.getByText('Trang dành cho quản trị viên')).toBeVisible()
})

test('the overview shows the figures of the period chosen', async ({ page, context }) => {
  await signInBrowser(context, ADMIN)
  await page.goto('/')
  await nav(page).getByRole('link', { name: 'Quản trị' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Tổng quan', level: 1 })).toBeVisible()
  for (const label of ['Giáo viên', 'Đang hoạt động', 'Lượt chơi', 'Góp ý chưa đọc']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
  }
  await expect(page.getByRole('list', { name: 'Lượt chơi theo ngày' }).getByRole('listitem')).toHaveCount(30)

  await page.getByRole('radiogroup', { name: 'Khoảng thời gian' }).getByText('7 ngày', { exact: true }).click()
  await expect(page).toHaveURL(/\?days=7$/)
  await expect(page.getByRole('list', { name: 'Lượt chơi theo ngày' }).getByRole('listitem')).toHaveCount(7)
})

test('an admin finds a teacher, locks and unlocks them, gives and takes the admin role; the log keeps it all', async ({
  page,
  context,
}) => {
  await signInBrowser(context, ADMIN)
  await page.goto('/admin/teachers')
  await page.getByRole('searchbox', { name: 'Tìm giáo viên' }).fill('thu')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/q=thu/)
  const rows = page.getByRole('row').filter({ hasText: 'cothu@edugame.local' })
  await expect(rows).toHaveCount(1)
  await rows.getByRole('link', { name: 'Cô Thu' }).click()
  await expect(page).toHaveURL(/\/admin\/teachers\/u-thu$/)
  await expect(page.getByRole('heading', { name: 'Cô Thu', level: 1 })).toBeVisible()

  // Lock, with a reason.
  await page.getByRole('button', { name: 'Khoá tài khoản' }).click()
  const lockDialog = page.getByRole('dialog', { name: /Khoá tài khoản Cô Thu/ })
  await lockDialog.getByRole('textbox', { name: 'Lý do (ghi vào nhật ký)' }).fill('Thử khoá trong e2e')
  await lockDialog.getByRole('button', { name: 'Khoá tài khoản' }).click()
  await expect(page.getByText('Đã khoá tài khoản.')).toBeVisible()
  const account = page.getByRole('region', { name: 'Tài khoản' })
  await expect(account.getByText('Đã khoá', { exact: true })).toBeVisible()
  const history = page.getByRole('region', { name: 'Lịch sử quản trị' })
  await expect(history.getByRole('listitem').first()).toContainText('Khoá tài khoản')
  await expect(history.getByRole('listitem').first()).toContainText('Lý do: Thử khoá trong e2e')
  expect(await canSignIn(THU)).toBe(401)

  // Locked: cannot be made admin.
  await expect(page.getByRole('button', { name: 'Cấp quyền quản trị' })).toBeDisabled()

  await page.getByRole('button', { name: 'Mở khoá tài khoản' }).click()
  await expect(account.getByText('Đang hoạt động', { exact: true })).toBeVisible()
  expect(await canSignIn(THU)).toBe(200)

  // Admin role, confirmed each way.
  await page.getByRole('button', { name: 'Cấp quyền quản trị' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cấp quyền' }).click()
  await expect(account.getByText('Quản trị viên')).toBeVisible()
  // An admin is not locked: the role goes first.
  await expect(page.getByRole('button', { name: 'Khoá tài khoản' })).toBeDisabled()
  await page.getByRole('button', { name: 'Bỏ quyền quản trị' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bỏ quyền' }).click()
  await expect(account.getByText('Quản trị viên')).toBeHidden()

  // The log, filtered by action.
  await page.getByRole('navigation', { name: 'Mục quản trị' }).getByRole('link', { name: 'Nhật ký' }).click()
  await expect(page).toHaveURL(/\/admin\/audit-log$/)
  const lines = page.getByRole('list', { name: 'Nhật ký quản trị' }).getByRole('listitem')
  await expect(lines.nth(0)).toContainText('Bỏ quyền quản trị')
  await expect(lines.nth(0)).toContainText('Cô Thu (cothu@edugame.local)')
  await expect(lines.nth(0)).toContainText('Quản trị Lớp vui')
  await expect(lines.nth(1)).toContainText('Cấp quyền quản trị')
  await page.getByRole('combobox', { name: 'Loại thao tác' }).click()
  await page.locator('.ant-select-item-option[title="Khoá tài khoản"]').click()
  await expect(page).toHaveURL(/action=TEACHER_LOCKED/)
  await expect(lines.first()).toContainText('Lý do: Thử khoá trong e2e')
  await expect(lines.filter({ hasText: 'Bỏ quyền quản trị' })).toHaveCount(0)
})

test('an admin cannot change their own account', async ({ page, context }) => {
  await signInBrowser(context, ADMIN)
  await page.goto('/admin/teachers/u-admin')
  await expect(page.getByText('Đây là tài khoản của cô.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Khoá tài khoản' })).toHaveCount(0)
})

test('feedback is read, marked, its screenshot opened and downloaded as CSV', async ({ page, context, admin }) => {
  // Cô Thu sends one, with a screenshot.
  const thu = await signedIn(THU)
  const png = await readFile('public/assets/logo/logo-192.png')
  const sent = await thu.post('feedback', {
    multipart: {
      feedback: {
        name: 'feedback.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ kind: 'IDEA', message: 'E2E: thêm trò Bingo', page: '/games/new', contactOk: true })),
      },
      screenshot: { name: 'man-hinh.png', mimeType: 'image/png', buffer: png },
    },
  })
  expect(sent.status()).toBe(201)
  const { code } = await sent.json()
  await thu.dispose()

  await signInBrowser(context, ADMIN)
  await page.goto('/admin/feedback')
  const item = page.getByRole('listitem', { name: `Góp ý ${code}` })
  await expect(item).toContainText('E2E: thêm trò Bingo')
  await expect(item).toContainText('Cô Thu')
  await expect(item.getByRole('link', { name: 'cothu@edugame.local' })).toHaveAttribute('href', /^mailto:cothu@edugame\.local/)

  await item.getByRole('button', { name: 'Xem ảnh màn hình' }).click()
  const shot = page.getByRole('img', { name: `Ảnh màn hình góp ý ${code}` })
  await expect(shot).toBeVisible()
  expect(await shot.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(192)
  await page.keyboard.press('Escape')

  // CSV of the new ones.
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải file CSV' }).click()
  const file = await downloading
  expect(file.suggestedFilename()).toMatch(/^gop-y-lop-vui-\d{4}-\d{2}-\d{2}\.csv$/)
  expect(await readFile(await file.path(), 'utf8')).toContain(code)

  // Marked as done: saved, and logged.
  await item.getByRole('combobox', { name: `Trạng thái góp ý ${code}` }).click()
  await page.locator('.ant-select-item-option[title="Đã xử lý"]').click()
  await expect
    .poll(async () => {
      const list = await (await admin.get('admin/feedback?status=DONE&size=200')).json()
      return list.items.some((f: { code: string }) => f.code === code)
    })
    .toBe(true)
  const log = await (await admin.get('admin/audit-log?action=FEEDBACK_STATUS_CHANGED&size=5')).json()
  expect(log.items[0]).toMatchObject({ targetCode: code, details: { from: 'NEW', to: 'DONE' } })
})
