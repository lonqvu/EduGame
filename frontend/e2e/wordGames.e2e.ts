import { test as base, expect } from '@playwright/test'
import { Backend, gridQuestion, openGame, signInBrowser } from './api'

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

test('Vua Tiếng Việt: the letters put back in order score, a wrong word lets another team try', async ({ page, backend }) => {
  const game = await backend.createGame('WORD_SCRAMBLE', 'E2E Vua Tiếng Việt', [gridQuestion('Con vật kêu meo meo', 'Mèo', 20)])
  await openGame(page, `/play/${game.code}`)
  const letter = (ch: string) => page.getByRole('button', { name: `Chữ ${ch}`, exact: true })
  // Without a team, the letters cannot be placed.
  await expect(letter('M')).toBeDisabled()

  await page.getByRole('button', { name: /^Đội Cam/ }).click()
  for (const ch of ['O', 'M', 'È']) await letter(ch).click()
  await expect(page.getByText('Chưa đúng rồi! Đội khác giành quyền nào.')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Đáp án' }).getByLabel('Ô 1, trống')).toBeVisible()

  await page.getByRole('button', { name: /^Đội Biển/ }).click()
  for (const ch of ['M', 'È', 'O']) await letter(ch).click()
  await expect(page.getByText('Chính xác!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Biển chiến thắng!')).toBeVisible()
})

test('Đoán chữ: a guessed letter opens all its boxes, a miss passes the turn, solving earns the bonus', async ({ page, backend }) => {
  const game = await backend.createGame('HANGMAN', 'E2E Đoán chữ', [gridQuestion('Con vật có vòi dài', 'Con voi', 20)])
  await openGame(page, `/play/${game.code}`)
  const board = page.getByRole('group', { name: 'Ô chữ' })
  await expect(board.getByLabel(/chưa mở$/)).toHaveCount(6)

  await page.getByRole('button', { name: 'Chữ O', exact: true }).click()
  await expect(page.getByText('Có 2 chữ O! Đội Cam đoán tiếp.')).toBeVisible()
  await expect(board.getByLabel(/chưa mở$/)).toHaveCount(4)
  await page.getByRole('button', { name: 'Chữ Z', exact: true }).click()
  await expect(page.getByText('Không có chữ Z. Đến lượt Đội Biển.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chữ O', exact: true })).toBeDisabled()

  await page.getByRole('button', { name: 'Giải ô chữ' }).click()
  await page.getByRole('button', { name: 'Đúng', exact: true }).click()
  await expect(page.getByText('Đội Biển giải được ô chữ: CON VOI!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Biển chiến thắng!')).toBeVisible()
})

test('a Lật ô game can be played as Vua Tiếng Việt', async ({ page, backend }) => {
  const game = await backend.createGame('GRID_BOARD', 'E2E Lật ô chữ', [gridQuestion('Thủ đô của Việt Nam', 'Hà Nội', 10)])
  await page.goto(`/games/${game.code}/edit`)
  await page.getByRole('button', { name: /Chơi kiểu khác/ }).click()
  await page.getByRole('menuitem', { name: 'Vua Tiếng Việt' }).click()
  await expect(page).toHaveURL(new RegExp(`/play/${game.code}\\?as=WORD_SCRAMBLE`))
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
  await expect(page.getByText('Thủ đô của Việt Nam')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Đáp án' }).getByLabel(/trống$/)).toHaveCount(5)
})
