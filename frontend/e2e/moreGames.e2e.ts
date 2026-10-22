import { test as base, expect, type Page } from '@playwright/test'
import { Backend, openGame, quizItem, signInBrowser } from './api'

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

/** Answers with words, so an option is found by its text whatever the shuffle. */
const QUESTIONS = [
  quizItem('Hai cộng ba bằng mấy?', ['Bốn', 'Năm', 'Sáu'], 1),
  quizItem('Mười trừ bốn bằng mấy?', ['Sáu', 'Bảy', 'Tám'], 0),
  quizItem('Ba nhân ba bằng mấy?', ['Bảy', 'Tám', 'Chín'], 2),
  quizItem('Tám chia hai bằng mấy?', ['Hai', 'Ba', 'Bốn'], 2),
]
const RIGHT = ['Năm', 'Sáu', 'Chín', 'Bốn']

/** The option of the question on screen whose text ends the button's name. */
const option = (page: Page, text: string) => page.getByRole('button', { name: new RegExp(`${text}$`) })
/** Index of the question on screen in QUESTIONS (they may be shuffled). */
async function rightAnswer(page: Page): Promise<string> {
  for (const [i, q] of QUESTIONS.entries()) {
    if (await page.getByText(q.content.text as string, { exact: true }).isVisible()) return RIGHT[i]
  }
  throw new Error('No known question on screen')
}
const score = (page: Page, team: string) => page.getByRole('button', { name: new RegExp(`^${team}`) }).or(page.locator('div', { hasText: new RegExp(`^${team}`) }))

test('Ai là triệu phú: 50:50, the class poll, then the climb to the top prize', async ({ page, backend }) => {
  const game = await backend.createGame('MILLIONAIRE', 'E2E Triệu phú', QUESTIONS.slice(0, 2))
  await backend.setSettings(game.code, { shuffleItems: false })
  await openGame(page, `/play/${game.code}`)
  await expect(page.getByRole('list', { name: 'Bậc thưởng' }).getByRole('listitem')).toHaveCount(2)

  await page.getByRole('button', { name: 'Bỏ đi 2 đáp án sai' }).click()
  await expect(page.getByRole('button', { name: /Bỏ đi 2 đáp án sai \(đã dùng\)/ })).toBeDisabled()
  await page.getByRole('button', { name: 'Hỏi ý kiến cả lớp' }).click()
  await page.getByRole('button', { name: 'Thêm một bạn chọn', exact: false }).first().click()
  await expect(page.getByText('1 ✋')).toBeVisible()

  await option(page, 'Năm').click()
  await page.getByRole('button', { name: 'Chốt đáp án' }).click()
  await expect(page.getByText('Chính xác! Bạn đạt 500.000 điểm.')).toBeVisible()
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()

  await option(page, 'Sáu').click()
  await page.getByRole('button', { name: 'Chốt đáp án' }).click()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByRole('heading', { name: 'Chúc mừng triệu phú của lớp!' })).toBeVisible()
  await expect(page.getByText('1.000.000 điểm')).toBeVisible()
})

test('Ai là triệu phú: a wrong answer ends the climb and shows the right one', async ({ page, backend }) => {
  const game = await backend.createGame('MILLIONAIRE', 'E2E Triệu phú sai', QUESTIONS.slice(0, 1))
  await openGame(page, `/play/${game.code}`)
  await option(page, 'Bốn').click()
  await page.getByRole('button', { name: 'Chốt đáp án' }).click()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByRole('heading', { name: /Rất tiếc/ })).toBeVisible()
  await expect(page.getByText('Đáp án đúng: Năm')).toBeVisible()
  await expect(page.getByText('0 điểm', { exact: true })).toBeVisible()
})

test('Kéo co: right answers pull the rope until it crosses a line', async ({ page, backend }) => {
  const game = await backend.createGame('TUG_OF_WAR', 'E2E Kéo co', QUESTIONS)
  await backend.setSettings(game.code, { rules: { win: { steps: 3 } } })
  await openGame(page, `/play/${game.code}`)
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /^Đội Cam,/ }).click()
    await option(page, await rightAnswer(page)).click()
    await expect(page.getByRole('button', { name: `Đội Cam, ${i + 1} câu đúng` })).toBeVisible()
    if (i < 2) await page.getByRole('button', { name: 'Câu tiếp theo' }).click()
  }
  await expect(page.getByText('Đội Cam kéo dây qua vạch!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Cam chiến thắng!')).toBeVisible()
})

test('Hái hoa dân chủ: a team picks a flower, answers, and the turn passes', async ({ page, backend }) => {
  const game = await backend.createGame('FLOWER_PICK', 'E2E Hái hoa', QUESTIONS)
  await openGame(page, `/play/${game.code}`)
  await expect(page.getByText('Đội Cam chọn một bông hoa nhé!')).toBeVisible()
  await page.getByRole('button', { name: 'Bông hoa số 2' }).click()
  await expect(page.getByText('Bông hoa số 2 · 10 điểm')).toBeVisible()
  await option(page, await rightAnswer(page)).click()
  await page.getByRole('button', { name: 'Quay lại cây hoa' }).click()
  await expect(page.getByRole('button', { name: 'Bông hoa số 2' })).toHaveCount(0)
  await expect(page.getByText('Đã hái 1 / 4 bông')).toBeVisible()
  await expect(page.getByText('Đội Biển chọn một bông hoa nhé!')).toBeVisible()
  await expect(score(page, 'Đội Cam').filter({ hasText: '10' }).first()).toBeVisible()
})

test('Đập chuột: the answering team whacks the mole with the right answer', async ({ page, backend }) => {
  const game = await backend.createGame('WHACK_MOLE', 'E2E Đập chuột', QUESTIONS.slice(0, 1))
  await openGame(page, `/play/${game.code}`)
  // No team yet: the moles cannot be whacked.
  await expect(page.getByRole('button', { name: /\. Năm$/ })).toBeDisabled()
  await page.getByRole('button', { name: /^Đội Biển/ }).click()
  await page.getByRole('button', { name: /\. Bốn$/ }).click()
  await page.getByRole('button', { name: /^Đội Cam/ }).click()
  await page.getByRole('button', { name: /\. Năm$/ }).click()
  await expect(page.getByText('Đáp án đúng đã hiện.')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Cam chiến thắng!')).toBeVisible()
})

test('Đúng hay sai: every team judges, the right ones score', async ({ page, backend }) => {
  const statement = { itemType: 'TRUE_FALSE', content: { text: 'Cá sống dưới nước.', options: [{ id: 'true', text: 'Đúng' }, { id: 'false', text: 'Sai' }] }, solution: { correct: ['true'] } }
  const game = await backend.createGame('TRUE_FALSE', 'E2E Đúng sai', [statement])
  await backend.setSettings(game.code, { rules: { participants: { teams: 2 } } })
  await openGame(page, `/play/${game.code}`)
  await page.getByRole('button', { name: 'Đội Cam: Đúng' }).click()
  await page.getByRole('button', { name: 'Đội Biển: Sai' }).click()
  await expect(page.getByText('2/2 đội đã chọn')).toBeVisible()
  await page.getByRole('button', { name: 'Công bố' }).click()
  await expect(page.getByText('Đáp án này ĐÚNG!')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Đội Cam: Đúng' })).toBeDisabled()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Cam chiến thắng!')).toBeVisible()
})

test('Ngôi sao may mắn: a lucky star gives points at once, a question star is answered', async ({ page, backend }) => {
  const game = await backend.createGame('LUCKY_STAR', 'E2E Ngôi sao', QUESTIONS.slice(0, 1))
  await backend.setSettings(game.code, { rules: { scoring: { luckyStars: 1 } } })
  await openGame(page, `/play/${game.code}`)
  await expect(page.getByRole('button', { name: /^Ngôi sao số/ })).toHaveCount(2)
  for (const n of [1, 2]) {
    await page.getByRole('button', { name: `Ngôi sao số ${n}`, exact: true }).click()
    const lucky = page.getByText('Ngôi sao may mắn!')
    await expect(lucky.or(page.getByText('Hai cộng ba bằng mấy?'))).toBeVisible()
    if (await lucky.isVisible()) {
      await expect(page.getByText(/được \+10 điểm/)).toBeVisible()
      await page.getByRole('button', { name: n === 2 ? 'Xem kết quả' : 'Tiếp tục' }).click()
    } else {
      await option(page, 'Năm').click()
      await page.getByRole('button', { name: n === 2 ? 'Xem kết quả' : 'Quay lại bảng sao' }).click()
    }
  }
  // Đội Cam's lucky star or right answer, Đội Biển's the other.
  await expect(page.getByText('Đội Cam và Đội Biển cùng thắng!')).toBeVisible()
})

test('Ô cửa bí mật: doors open after their question, a guess of the picture scores and ends', async ({ page, backend }) => {
  const game = await backend.createGame('SECRET_PICTURE', 'E2E Ô cửa', QUESTIONS.slice(0, 2))
  await openGame(page, `/play/${game.code}`)
  await page.getByRole('button', { name: 'Ô cửa số 1' }).click()
  await option(page, await rightAnswer(page)).click()
  await page.getByRole('button', { name: 'Mở ô cửa' }).click()
  await expect(page.getByRole('button', { name: 'Ô cửa số 1' })).toHaveCount(0)
  await expect(page.getByText('Đã mở 1 / 2 ô cửa')).toBeVisible()
  await expect(page.getByText('Đội Biển chọn một ô cửa, hoặc đoán bức tranh!')).toBeVisible()

  await page.getByRole('button', { name: 'Có đội đoán! Mở bức tranh' }).click()
  await page.getByRole('button', { name: 'Đội Biển', exact: true }).click()
  await expect(page.getByText('Đội Biển chiến thắng!')).toBeVisible()
})

test('Leo núi: a right answer takes the climber one stage up', async ({ page, backend }) => {
  const game = await backend.createGame('MOUNTAIN_CLIMB', 'E2E Leo núi', QUESTIONS)
  await openGame(page, `/play/${game.code}`)
  await page.getByRole('button', { name: 'Đội Lá, chặng 0 / 5' }).click()
  await option(page, await rightAnswer(page)).click()
  await expect(page.getByRole('button', { name: 'Đội Lá, chặng 1 / 5' })).toBeVisible()
})

test('Vòng quay điểm thưởng: the wheel sets what the question is worth', async ({ page, backend }) => {
  // The wheel stops on its first segment, "10".
  await page.addInitScript(() => {
    Math.random = () => 0.01
  })
  const game = await backend.createGame('POINT_WHEEL', 'E2E Vòng quay', QUESTIONS.slice(0, 1))
  await openGame(page, `/play/${game.code}`)
  await page.getByRole('button', { name: '🎡 Quay' }).click()
  await expect(page.getByText('10 điểm', { exact: true })).toBeVisible({ timeout: 8000 })
  await page.getByRole('button', { name: 'Xem câu hỏi' }).click()
  await expect(page.getByText('Đội Cam · câu hỏi đáng 10 điểm')).toBeVisible()
  await option(page, 'Năm').click()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Cam chiến thắng!')).toBeVisible()
})
