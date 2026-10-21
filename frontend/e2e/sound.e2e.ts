import { test as base, expect, type Page } from '@playwright/test'
import { Backend, quizItem, signInBrowser, type Game, openGame } from './api'

const SOUND_ON = { enabled: true, volume: 80, music: true }

/** Every test starts with the sounds on, and puts the teacher's settings back afterwards. */
const test = base.extend<{ backend: Backend }>({
  // oxlint-disable-next-line no-empty-pattern
  backend: async ({}, provide) => {
    const backend = await Backend.signIn()
    const kept = await backend.keepSettings()
    await backend.saveSettings({ ...kept, sound: SOUND_ON })
    await provide(backend)
    await backend.cleanUp()
  },
})

/**
 * Counts what the browser really plays: every Web Audio source started (howler plays through Web Audio), and every
 * sound file fetched.
 */
test.beforeEach(async ({ page, context }) => {
  await signInBrowser(context)
  await page.addInitScript(() => {
    const w = window as unknown as { __played: number }
    w.__played = 0
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      w.__played++
      return start.apply(this, args)
    }
  })
  page.on('pageerror', (error) => {
    throw error
  })
})

const played = (page: Page) => page.evaluate(() => (window as unknown as { __played: number }).__played)

function soundFiles(page: Page) {
  const files: string[] = []
  page.on('request', (r) => {
    const match = /\/assets\/sounds\/([\w-]+)\.(webm|mp3)$/.exec(r.url())
    if (match) files.push(match[1])
  })
  return files
}

async function quiz(backend: Backend): Promise<Game> {
  return backend.createGame('QUIZ', 'E2E Âm thanh', [quizItem('1 + 1 = ?', ['2', '3'], 0), quizItem('2 + 2 = ?', ['4', '5'], 0)])
}

/** Picks a team, then answers right. */
async function answerRight(page: Page) {
  await page.getByRole('button', { name: /Đội Cam/ }).click()
  await page.locator('button').filter({ hasText: /^[A-D]\s*(2|4)$/ }).first().click()
}

test('the projector loads its sounds and music, and plays them as the class answers', async ({ page, backend }) => {
  const game = await quiz(backend)
  const files = soundFiles(page)
  await openGame(page, `/play/${game.code}`)
  await expect(page.getByText('Câu 1 / 2')).toBeVisible()

  // The common sounds load with the screen, the calm music starts.
  await expect.poll(() => files).toEqual(expect.arrayContaining(['correct-1', 'correct-2', 'wrong-1', 'tick', 'fanfare', 'music-calm']))

  const before = await played(page)
  await answerRight(page)
  await expect.poll(() => played(page)).toBeGreaterThan(before)
})

test('the speaker button and the M key turn the sounds off and on, and it is remembered', async ({ page, backend }) => {
  const game = await quiz(backend)
  await openGame(page, `/play/${game.code}`)
  await expect(page.getByText('Câu 1 / 2')).toBeVisible()

  await page.getByRole('button', { name: 'Tắt âm thanh (phím M)' }).click()
  await expect(page.getByRole('button', { name: 'Bật âm thanh (phím M)' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await backend.settings()).sound?.enabled).toBe(false)

  // Silent now: answering plays nothing.
  const before = await played(page)
  await answerRight(page)
  await page.waitForTimeout(500)
  expect(await played(page)).toBe(before)

  await page.keyboard.press('m')
  await expect(page.getByRole('button', { name: 'Tắt âm thanh (phím M)' })).toBeVisible()
  await expect.poll(async () => (await backend.settings()).sound?.enabled).toBe(true)

  // Remembered after a reload.
  await page.keyboard.press('M')
  await expect.poll(async () => (await backend.settings()).sound?.enabled).toBe(false)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Bật âm thanh (phím M)' })).toBeVisible()
})

test('the preview on the start page stays silent', async ({ page, backend }) => {
  const game = await quiz(backend)
  const files = soundFiles(page)
  await page.goto(`/games/${game.code}/start`)
  await expect(page.getByRole('heading', { name: 'Bắt đầu trò chơi' })).toBeVisible()
  // The preview runs the same quiz screen, countdown included.
  await page.waitForTimeout(2500)
  expect(files).toEqual([])
  expect(await played(page)).toBe(0)
})

test('"Cài đặt" → Âm thanh: on/off, volume and music are saved', async ({ page, backend }) => {
  await page.goto('/settings')
  const section = page.getByRole('region', { name: 'Âm thanh' })
  await expect(section).toBeVisible()

  await section.getByRole('switch', { name: 'Nhạc nền' }).click()
  await expect.poll(async () => (await backend.settings()).sound).toEqual({ enabled: true, volume: 80, music: false })

  // The volume slider with the keyboard, released on a step: saved, and a sound plays to hear it.
  const slider = section.getByRole('slider', { name: 'Âm lượng' })
  await slider.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(async () => (await backend.settings()).sound?.volume).toBe(75)
  await expect(section).toContainText('75%')

  await section.getByRole('switch', { name: 'Âm thanh trong trò chơi' }).click()
  await expect.poll(async () => (await backend.settings()).sound?.enabled).toBe(false)
  await expect(slider).toHaveAttribute('aria-disabled', 'true')
})
