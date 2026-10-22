import { test as base, expect, type Page } from '@playwright/test'
import { Backend, quizItem, signInBrowser } from './api'

const test = base.extend<{ backend: Backend }>({
  // oxlint-disable-next-line no-empty-pattern
  backend: async ({}, provide) => {
    const backend = await Backend.signIn()
    await provide(backend)
    await backend.cleanUp()
  },
})

test.beforeEach(async ({ context, page }) => {
  await signInBrowser(context)
  // Keeps what the app puts in the upload form (Playwright cannot read a multipart body with files).
  await page.addInitScript(() => {
    const w = window as unknown as { __form: [string, Blob | string][] }
    w.__form = []
    const append = FormData.prototype.append
    FormData.prototype.append = function (this: FormData, name: string, value: Blob | string, fileName?: string) {
      w.__form.push([name, value])
      const original = append as (...args: unknown[]) => void
      original.apply(this, fileName === undefined ? [name, value] : [name, value, fileName])
    } as typeof FormData.prototype.append
  })
  page.on('pageerror', (error) => {
    throw error
  })
})

const feedbackButton = (page: Page) => page.getByRole('button', { name: 'Góp ý cho Lớp Vui' })
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Góp ý cho Lớp Vui' })
const message = (page: Page) => dialog(page).getByRole('textbox', { name: 'Nội dung' })

/** Sending is answered here instead of by the backend (which allows 10 a teacher an hour). */
async function fakeSending(page: Page, status = 201, body: object = { code: 'fb-e2e', createdAt: new Date().toISOString() }) {
  const sent: string[] = []
  await page.route('**/api/v1/feedback', async (route) => {
    sent.push(route.request().method())
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  })
  return sent
}

interface SentForm {
  feedback: Record<string, unknown>
  screenshot: { type: string; size: number; name: string } | null
}

/** The last feedback form the app sent: its JSON part, and the screenshot part if any. */
async function sentForm(page: Page): Promise<SentForm> {
  return page.evaluate(async () => {
    const parts = (window as unknown as { __form: [string, Blob | string][] }).__form
    const feedback = parts.findLast(([name]) => name === 'feedback')?.[1] as Blob
    const index = parts.findLastIndex(([name]) => name === 'feedback')
    const shot = parts.slice(index).find(([name]) => name === 'screenshot')?.[1] as File | undefined
    return {
      feedback: JSON.parse(await feedback.text()),
      screenshot: shot ? { type: shot.type, size: shot.size, name: shot.name } : null,
    }
  })
}

test('"Góp ý" is on every teacher screen, above the start bar, and not on the projector', async ({ page, backend }) => {
  const game = await backend.createGame('QUIZ', 'E2E Góp ý', [quizItem('1 + 1 = ?', ['2', '3'], 0)])

  for (const path of ['/', '/games/new', '/question-sets', '/classes', '/reports', '/settings', '/profile']) {
    await page.goto(path)
    await expect(feedbackButton(page)).toBeVisible()
  }

  // The start page: it does not cover "Bắt đầu trò chơi".
  await page.goto(`/games/${game.code}/start`)
  const start = await page.getByRole('link', { name: 'Bắt đầu trò chơi' }).boundingBox()
  const button = await feedbackButton(page).boundingBox()
  expect(start && button).toBeTruthy()
  expect(button!.y + button!.height).toBeLessThanOrEqual(start!.y)

  // The class sees the projector: no button there.
  await page.getByRole('link', { name: 'Bắt đầu trò chơi' }).click()
  await expect(page.getByText('Câu 1 / 1')).toBeVisible()
  await expect(feedbackButton(page)).toHaveCount(0)
})

test('a teacher sends feedback with a screenshot of the page, and is thanked', async ({ page }) => {
  await page.goto('/question-sets')
  await expect(page.getByRole('heading', { name: 'Bộ câu hỏi', level: 1 })).toBeVisible()
  await feedbackButton(page).click()
  await expect(dialog(page)).toBeVisible()
  // Nothing to send yet.
  await expect(dialog(page).getByRole('button', { name: 'Gửi góp ý' })).toBeDisabled()

  await dialog(page).locator('label').filter({ hasText: 'Đề xuất' }).click()
  await dialog(page).getByRole('radio', { name: 'Hài lòng', exact: true }).check({ force: true })
  await expect(dialog(page)).toContainText('Hài lòng')
  await message(page).fill('Cô muốn có thêm trò Bingo cho lớp 3.')
  await expect(dialog(page).getByText(/Đội Lớp Vui có thể trả lời cô qua email/)).toBeVisible()

  await dialog(page).getByRole('button', { name: 'Chụp màn hình trang này' }).click()
  await expect(dialog(page).getByRole('img', { name: 'Ảnh màn hình đính kèm' })).toBeVisible({ timeout: 20_000 })
  await expect(dialog(page)).toContainText(/Đã đính kèm ảnh \(\d+ KB\)/)

  // Sent to the real backend.
  const answered = page.waitForResponse((r) => r.url().endsWith('/api/v1/feedback') && r.request().method() === 'POST')
  await dialog(page).getByRole('button', { name: 'Gửi góp ý' }).click()
  const response = await answered
  expect(response.status()).toBe(201)
  expect((await response.json()).code).toMatch(/^fb-[a-z0-9]{10}$/)

  const form = await sentForm(page)
  expect(form.feedback).toMatchObject({
    kind: 'IDEA',
    rating: 4,
    message: 'Cô muốn có thêm trò Bingo cho lớp 3.',
    page: '/question-sets',
    viewport: '1280x720',
    contactOk: true,
  })
  expect(form.feedback.appVersion).toMatch(/^\d{4}-\d{2}-\d{2}/)
  expect(form.screenshot?.type).toMatch(/^image\/(webp|png)$/)
  expect(form.screenshot!.size).toBeGreaterThan(1000)

  await expect(page.getByRole('status').filter({ hasText: 'Cảm ơn cô đã góp ý!' })).toBeVisible()
  await expect(page.getByText('Khi cần, đội sẽ trả lời cô qua email.')).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Xong' }).click()
  await expect(dialog(page)).toBeHidden()

  // A new feedback starts empty.
  await feedbackButton(page).click()
  await expect(message(page)).toHaveValue('')
  await expect(dialog(page).getByRole('img', { name: 'Ảnh màn hình đính kèm' })).toHaveCount(0)
})

test('what is typed stays when the dialog closes; a pasted picture is attached and can be removed', async ({ page }) => {
  const sent = await fakeSending(page)
  await page.goto('/classes')
  await feedbackButton(page).click()
  await message(page).fill('Nút xoá lớp khó tìm')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()

  // Elsewhere in the app.
  await page.getByRole('link', { name: 'Báo cáo' }).click()
  await expect(page).toHaveURL(/\/reports/)
  await feedbackButton(page).click()
  await expect(message(page)).toHaveValue('Nút xoá lớp khó tìm')

  // Ctrl+V of a picture (made in the page, as a copied screenshot would be).
  await message(page).evaluate(async (box) => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const g = canvas.getContext('2d')!
    g.fillStyle = '#3563E9'
    g.fillRect(0, 0, 320, 200)
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
    const data = new DataTransfer()
    data.items.add(new File([blob], 'chup.png', { type: 'image/png' }))
    box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  })
  await expect(dialog(page).getByRole('img', { name: 'Ảnh màn hình đính kèm' })).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Bỏ ảnh' }).click()
  await expect(dialog(page).getByRole('img', { name: 'Ảnh màn hình đính kèm' })).toHaveCount(0)

  // Ctrl+Enter sends; the page is the one it was sent from.
  await message(page).press('Control+Enter')
  await expect(page.getByText('Cảm ơn cô đã góp ý!')).toBeVisible()
  expect(sent).toHaveLength(1)
  const form = await sentForm(page)
  expect(form.feedback).toMatchObject({ kind: 'BUG', message: 'Nút xoá lớp khó tìm', page: expect.stringMatching(/^\/reports/) })
  expect(form.feedback).not.toHaveProperty('rating')
  expect(form.screenshot).toBeNull()
})

test('a refused feedback stays in the dialog, with why', async ({ page }) => {
  await fakeSending(page, 429, { status: 429, code: 'TOO_MANY_FEEDBACK', message: 'At most 10 feedback an hour' })
  await page.goto('/')
  await feedbackButton(page).click()
  await dialog(page).locator('label').filter({ hasText: 'Khen' }).click()
  await message(page).fill('Lớp Vui rất hay!')
  await dialog(page).getByRole('button', { name: 'Gửi góp ý' }).click()

  await expect(page.getByText(/Cô đã gửi nhiều góp ý trong một giờ qua/)).toBeVisible()
  await expect(dialog(page)).toBeVisible()
  await expect(message(page)).toHaveValue('Lớp Vui rất hay!')
  await expect(dialog(page).getByRole('radio', { name: /Khen/ })).toBeChecked()
})

test('"Trợ giúp" leads to "Góp ý" when the answer is not there', async ({ page }) => {
  await page.goto('/profile')
  await page.getByRole('main').getByRole('button', { name: /^Trợ giúp/ }).click()
  await page.getByRole('button', { name: 'Gửi góp ý cho đội Lớp Vui' }).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByRole('radio', { name: /Khác/ })).toBeChecked()
  await expect(message(page)).toBeFocused()
})
