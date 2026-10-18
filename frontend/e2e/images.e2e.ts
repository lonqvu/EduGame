import { test as base, expect, type Locator, type Page } from '@playwright/test'
import { Backend, gridQuestion, quizItem, signInBrowser } from './api'

const test = base.extend<{ backend: Backend }>({
  // oxlint-disable-next-line no-empty-pattern
  backend: async ({}, provide) => {
    const backend = await Backend.signIn()
    await provide(backend)
    await backend.cleanUp()
  },
})

test.beforeEach(async ({ page, context }) => {
  await signInBrowser(context)
  page.on('pageerror', (error) => {
    throw error
  })
})

const ASSET_URL = /^http:\/\/localhost:8080\/api\/v1\/assets\/[\w-]{22}\.(png|webp|jpg)$/

/** A real PNG of this size, drawn by the browser. */
async function png(page: Page, width: number, height: number): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      const gradient = ctx.createLinearGradient(0, 0, w, h)
      gradient.addColorStop(0, '#3563E9')
      gradient.addColorStop(1, '#FFD15C')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
      return canvas.toDataURL('image/png')
    },
    [width, height],
  )
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

const naturalWidth = (img: Locator) => img.evaluate((el: HTMLImageElement) => (el.complete ? el.naturalWidth : 0))

test('a quiz question gets an uploaded image: saved with the game, there after a reload', async ({ page, backend }) => {
  const game = await backend.createGame('QUIZ', 'E2E Ảnh trắc nghiệm', [quizItem('Con gì đây?', ['Mèo', 'Chó'], 0)])
  await page.goto(`/games/${game.code}/edit`)
  await expect(page.getByText('Chưa có hình')).toBeVisible()

  await page.getByLabel('Chọn ảnh từ máy').setInputFiles({ name: 'con-meo.png', mimeType: 'image/png', buffer: await png(page, 320, 240) })

  const picture = page.getByRole('img', { name: 'Hình của câu hỏi' })
  await expect(picture).toHaveAttribute('src', ASSET_URL)
  await expect.poll(() => naturalWidth(picture)).toBe(320)
  await expect(page.getByRole('button', { name: 'Đổi ảnh' })).toBeVisible()
  await expect(page.getByText('Đã tự động lưu')).toBeVisible()

  await expect.poll(async () => (await backend.game(game.code)).items[0].content.image).toMatch(/^\/api\/v1\/assets\/[\w-]{22}\.png$/)

  await page.reload()
  await expect(page.getByRole('img', { name: 'Hình của câu hỏi' })).toHaveAttribute('src', ASSET_URL)
  await expect.poll(() => naturalWidth(page.getByRole('img', { name: 'Hình của câu hỏi' }))).toBe(320)
})

test('a big photo is shrunk before upload, and the projector shows it', async ({ page, backend }) => {
  const game = await backend.createGame('GRID_BOARD', 'E2E Ảnh lật ô', [gridQuestion('Đây là màu gì?', 'Xanh')])
  await page.goto(`/games/${game.code}/edit`)

  await page.getByLabel('Chọn ảnh từ máy').setInputFiles({ name: 'IMG_2041.png', mimeType: 'image/png', buffer: await png(page, 2400, 1800) })

  const picture = page.getByRole('img', { name: 'Hình của câu hỏi' })
  await expect(picture).toHaveAttribute('src', ASSET_URL)
  await expect.poll(() => naturalWidth(picture)).toBe(1600)
  const src = (await picture.getAttribute('src'))!
  const file = await page.request.get(src)
  expect(file.headers()['content-type']).toBe('image/webp')

  await expect.poll(async () => (await backend.game(game.code)).items[0].content.image).toMatch(/\.webp$/)

  await page.goto(`/play/${game.code}/tiles/1`)
  const shown = page.locator(`img[src="${src}"]`)
  await expect(shown).toBeVisible()
  await expect.poll(() => naturalWidth(shown)).toBe(1600)
})

test('files that are not pictures are refused with a reason, and nothing is saved', async ({ page, backend }) => {
  const game = await backend.createGame('QUIZ', 'E2E Ảnh sai', [quizItem('Câu 1', ['A', 'B'], 0)])
  await page.goto(`/games/${game.code}/edit`)
  const input = page.getByLabel('Chọn ảnh từ máy')

  await input.setInputFiles({ name: 'bai-tap.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
  await expect(page.getByRole('alert')).toHaveText('Cô chọn ảnh PNG, JPG, GIF hoặc WEBP nhé.')

  await input.setInputFiles({ name: 'hong.png', mimeType: 'image/png', buffer: Buffer.from('not really a png') })
  await expect(page.getByRole('alert')).toHaveText('Không đọc được ảnh này. Cô thử chọn ảnh khác nhé.')

  await expect(page.getByText('Chưa có hình')).toBeVisible()
  expect((await backend.game(game.code)).items[0].content.image).toBeUndefined()

  // A good picture afterwards clears the message.
  await input.setInputFiles({ name: 'tot.png', mimeType: 'image/png', buffer: await png(page, 40, 30) })
  await expect(page.getByRole('img', { name: 'Hình của câu hỏi' })).toHaveAttribute('src', ASSET_URL)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('"Bỏ hình" takes the image off the question', async ({ page, backend }) => {
  const game = await backend.createGame('GRID_BOARD', 'E2E Bỏ hình', [gridQuestion('Câu có hình', 'Có')])
  await page.goto(`/games/${game.code}/edit`)
  await page.getByLabel('Chọn ảnh từ máy').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: await png(page, 60, 40) })
  await expect.poll(async () => (await backend.game(game.code)).items[0].content.image).toBeTruthy()

  await page.getByRole('button', { name: 'Bỏ hình' }).click()
  await expect(page.getByText('Chưa có hình')).toBeVisible()
  await expect.poll(async () => (await backend.game(game.code)).items[0].content.image).toBeUndefined()
})
