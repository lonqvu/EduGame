import { test as base, expect, type Page } from '@playwright/test'
import { Backend, gridQuestion, pairSet, quizItem, signInBrowser, type Game } from './api'

const test = base.extend<{ backend: Backend }>({
  // Playwright needs the destructuring pattern here, even with no fixtures to take.
  // oxlint-disable-next-line no-empty-pattern
  backend: async ({}, provide) => {
    const backend = await Backend.signIn()
    await provide(backend)
    await backend.cleanUp()
  },
})

/** Signs in, and fails the test on any uncaught error in the page. */
test.beforeEach(async ({ page, context }) => {
  await signInBrowser(context)
  page.on('pageerror', (error) => {
    throw error
  })
})

const exact = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)

/** Scores on the results podium, by team name. */
async function podium(page: Page) {
  await expect(page.getByText('Kết thúc trò chơi')).toBeVisible()
  return page.locator('body').innerText()
}

test('Lật ô thi đua: play the whole board, undo a mark, see the winner', async ({ page, backend }) => {
  const game = await backend.createGame('GRID_BOARD', 'E2E Lật ô', [
    gridQuestion('2 + 3 = ?', '5', 10),
    gridQuestion('7 - 4 = ?', '3', 20),
    gridQuestion('6 + 6 = ?', '12', 30),
  ])
  await page.goto(`/play/${game.code}`)
  await expect(page.getByText('Còn 3 ô')).toBeVisible()

  // Tile 1, Đội Cam: right.
  await page.getByRole('link', { name: '1', exact: true }).click()
  await expect(page.getByText('2 + 3 = ?')).toBeVisible()
  await expect(page.getByText('Đội Cam trả lời')).toBeVisible()
  await page.getByRole('button', { name: 'Đúng' }).click()
  await expect(page.getByText('Còn 2 ô')).toBeVisible()
  await expect(page.getByLabel('Ô 1 đã trả lời')).toBeVisible()

  // Tile 2, Đội Biển: marked wrong by mistake, then undone.
  await page.getByRole('link', { name: '2', exact: true }).click()
  await expect(page.getByText('Đội Biển trả lời')).toBeVisible()
  await page.getByRole('button', { name: 'Sai' }).click()
  await expect(page.getByText('Còn 2 ô')).toBeVisible()
  await page.getByRole('button', { name: 'Hoàn tác' }).click()

  // Đội Biển again (the undo gave the turn back): right this time.
  await page.getByRole('link', { name: '2', exact: true }).click()
  await expect(page.getByText('Đội Biển trả lời')).toBeVisible()
  await page.getByRole('button', { name: 'Đúng' }).click()

  // Reloading the projector (F5) keeps the round; an answered tile cannot be opened again from its URL.
  await page.reload()
  await expect(page.getByText('Còn 1 ô')).toBeVisible()
  await page.goto(`/play/${game.code}/tiles/2`)
  await expect(page).toHaveURL(new RegExp(`/play/${game.code}$`))

  await page.getByRole('link', { name: '3', exact: true }).click()
  await expect(page.getByText('Đội Lá trả lời')).toBeVisible()
  await page.getByRole('button', { name: 'Đúng' }).dblclick()
  await expect(page.getByText('Đã lật hết ô')).toBeVisible()

  await page.getByRole('link', { name: 'Kết thúc' }).click()
  const results = await podium(page)
  expect(results).toContain('Đội Lá chiến thắng')
  // 30 for Lá, 20 for Biển, 10 for Cam: the double click did not count twice.
  expect(results).not.toContain('60')

  await page.getByRole('button', { name: 'Chơi lại' }).click()
  await expect(page.getByText('Còn 3 ô')).toBeVisible()
})

test('Trắc nghiệm: teams steal wrong answers and the scores add up', async ({ page, backend }) => {
  const game = await backend.createGame('QUIZ', 'E2E Trắc nghiệm', [
    quizItem('Thủ đô của Việt Nam?', ['Huế', 'Hà Nội', 'Đà Nẵng'], 1),
    quizItem('5 x 6 = ?', ['30', '35', '11', '56'], 0),
    quizItem('Con vật nào biết bay?', ['Cá', 'Chó', 'Chim'], 2),
  ])
  await page.goto(`/play/${game.code}`)
  const option = (text: string) => page.locator('button').filter({ has: page.locator('span', { hasText: exact(text) }) })
  const teams = ['Đội Cam', 'Đội Biển']

  for (let i = 0; i < game.items.length; i++) {
    await expect(page.getByText(`Câu ${i + 1} / 3`)).toBeVisible()
    const item = await visibleQuestion(page, game)
    const options: { id: string; text: string }[] = item.content.options
    const right = options.find((o) => o.id === item.solution!.correct[0])!.text
    const wrong = options.find((o) => o.text !== right)!.text

    // Nobody can answer before the teacher picks a team.
    await expect(option(right)).toBeDisabled()
    await page.getByRole('button', { name: new RegExp(teams[0]) }).click()
    await option(wrong).click()
    await page.getByRole('button', { name: new RegExp(teams[1]) }).click()
    await option(right).click()
    await page.getByRole('button', { name: i === 2 ? 'Xem kết quả' : 'Câu tiếp theo' }).click()
  }
  expect(await podium(page)).toContain('Đội Biển chiến thắng')
})

/** The item whose question text is on screen (the game may shuffle its questions). */
async function visibleQuestion(page: Page, game: Game) {
  for (const item of game.items) {
    if (await page.getByText(item.content.text, { exact: true }).isVisible()) return item
  }
  throw new Error('No known question on screen')
}

test('Nối cặp: a wrong attempt passes the turn, then every pair is joined', async ({ page, backend }) => {
  const pairs: [string, string][] = [
    ['Hà Nội', 'Hồ Gươm'],
    ['Huế', 'Sông Hương'],
    ['Đà Nẵng', 'Cầu Rồng'],
  ]
  const game = await backend.createGame('MATCHING', 'E2E Nối cặp', [pairSet('PAIR_SET', pairs)])
  await page.goto(`/play/${game.code}`)
  const left = (name: string) => page.getByLabel('Cột trái').getByRole('button', { name, exact: true })
  const right = (name: string) => page.getByLabel('Cột phải').getByRole('button', { name, exact: true })

  await left('Hà Nội').click()
  await right('Sông Hương').click() // wrong: Đội Cam
  await expect(page.getByText('Đội Biển: chọn một ô')).toBeVisible()
  // The wrong pair is shown for 0.9 s; clicks wait until it is gone.
  await page.waitForTimeout(1000)
  for (const [a, b] of pairs) {
    await left(a).click()
    await right(b).click()
    // A joined entry gets its number and cannot be picked again.
    await expect(page.getByLabel('Cột trái').getByRole('button', { name: new RegExp(`${a}$`) })).toBeDisabled()
  }
  await expect(page.getByText('Đã nối xong bộ này!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  // Biển, Cam, Biển got the three right pairs.
  expect(await podium(page)).toContain('Đội Biển chiến thắng')
})

test('Lật thẻ: a miss turns the cards back, a pair keeps the turn, all pairs are found', async ({ page, backend }) => {
  const pairs: [string, string][] = [
    ['Mèo', 'Meo meo'],
    ['Chó', 'Gâu gâu'],
    ['Vịt', 'Quạc quạc'],
  ]
  const game = await backend.createGame('MEMORY', 'E2E Lật thẻ', [pairSet('CARD_SET', pairs)])
  const partner = new Map(pairs.flatMap(([a, b]) => [[a, b], [b, a]] as const))
  await page.goto(`/play/${game.code}`)

  const cards = page.locator('div.grid button')
  await expect(cards).toHaveCount(6)
  const flip = async (i: number) => {
    await cards.nth(i).click()
    return (await cards.nth(i).getAttribute('aria-label'))!
  }

  // Remember every card's text by turning them two at a time.
  const seen = new Map<string, number>()
  const found = new Set<number>()
  for (let i = 0; i < 6; i += 2) {
    const a = await flip(i)
    const b = await flip(i + 1)
    seen.set(a, i).set(b, i + 1)
    if (partner.get(a) === b) {
      found.add(i).add(i + 1)
    } else {
      await expect(page.getByText('Chưa đúng cặp, thẻ sẽ úp lại.')).toBeVisible()
      await expect(cards.nth(i)).toHaveAttribute('aria-label', `Thẻ ${i + 1}`)
    }
  }
  for (const [text, i] of seen) {
    const j = seen.get(partner.get(text)!)!
    if (found.has(i)) continue
    await flip(i)
    await flip(j)
    found.add(i).add(j)
  }
  await expect(page.getByText('Đã tìm hết các cặp!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await podium(page)
})

test('a game with nothing playable says so instead of crashing', async ({ page, backend }) => {
  const quiz = await backend.createGame('QUIZ', 'E2E Trống')
  await page.goto(`/play/${quiz.code}`)
  await expect(page.getByText('Chưa có câu hỏi nào đủ nội dung')).toBeVisible()
  await page.goto('/play/g-does-not-exist')
  await expect(page.getByText('Trang bạn tìm không tồn tại.')).toBeVisible()
})

test('Vòng quay: picks a student, the star is saved, the student is not called twice', async ({ page, backend }) => {
  await page.goto('/tools/wheel')
  await expect(page.getByText('Đã gọi 0 / 28 bạn')).toBeVisible()
  await page.getByRole('button', { name: 'Quay', exact: true }).click()
  await expect(page.getByText('Bạn được gọi là')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Đã gọi 1 / 28 bạn')).toBeVisible()
  const name = (await page.locator('span.text-\\[64px\\]').innerText()).trim()

  const before = (await backend.students()).find((s) => s.displayName === name)!
  await page.getByRole('button', { name: 'Thưởng 1 sao' }).click()
  await expect(page.getByRole('button', { name: 'Đã thưởng sao' })).toBeDisabled()
  await expect.poll(async () => (await backend.students()).find((s) => s.id === before.id)!.totalStars).toBe(before.totalStars + 1)
  await backend.takeBackStar(before.id)

  await page.getByRole('button', { name: 'Quay tiếp' }).click()
  await expect(page.getByText('Đã gọi 2 / 28 bạn')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('span.text-\\[64px\\]')).not.toHaveText(name)
})

for (const [mode, start, again] of [
  ['horse', 'Bắt đầu đua', 'Đua lại'],
  ['balloon', 'Thả bóng bay', 'Thả bóng lại'],
  ['claw', 'Gắp thú', 'Gắp lại'],
  ['fishing', 'Thả câu', 'Thả câu lại'],
  ['rocket', 'Phóng tên lửa', 'Phóng lại'],
] as const) {
  test(`chọn tên "${mode}": a round ends on one student and can run again`, async ({ page }) => {
    await page.goto(`/tools/pick/${mode}`)
    await page.getByRole('button', { name: start, exact: true }).click()
    await expect(page.getByRole('button', { name: again })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Đã gọi 1 / 28 bạn')).toBeVisible()
    await page.getByRole('button', { name: again }).click()
    await expect(page.getByText('Đã gọi 2 / 28 bạn')).toBeVisible({ timeout: 30_000 })
  })
}

test('an unknown picker mode opens the horse race', async ({ page }) => {
  for (const mode of ['nope', 'toString', 'constructor']) {
    await page.goto(`/tools/pick/${mode}`)
    await expect(page).toHaveURL(/\/tools\/pick\/horse$/)
  }
})

test('the editor autosaves edits and they are there after a reload', async ({ page, backend }) => {
  const game = await backend.createGame('QUIZ', 'E2E Soạn', [quizItem('Câu cũ', ['A', 'B'], 0)])
  await page.goto(`/games/${game.code}/edit`)
  const text = page.getByLabel('Nội dung câu hỏi')
  await text.fill('Mặt Trời mọc ở hướng nào?')
  await page.getByLabel('Phương án A', { exact: true }).fill('Đông')
  await page.getByLabel('Phương án B', { exact: true }).fill('Tây')
  await page.getByRole('button', { name: 'Thêm phương án' }).click()
  await page.getByLabel('Phương án C', { exact: true }).fill('Nam')
  await expect(page.getByText('Đã tự động lưu')).toBeVisible()

  await expect
    .poll(async () => (await backend.game(game.code)).items[0].content)
    .toMatchObject({ text: 'Mặt Trời mọc ở hướng nào?', options: [{ text: 'Đông' }, { text: 'Tây' }, { text: 'Nam' }] })

  await page.reload()
  await expect(page.getByLabel('Nội dung câu hỏi')).toHaveValue('Mặt Trời mọc ở hướng nào?')
  await expect(page.getByLabel('Phương án C', { exact: true })).toHaveValue('Nam')
})

test('a new game made from the chooser shows up in the library', async ({ page, backend }) => {
  await page.goto('/games/new')
  await page.getByRole('button', { name: /Trắc nghiệm/ }).first().click()
  await page.waitForURL(/\/games\/(g-[a-z0-9]+)\/edit$/)
  const code = page.url().match(/(g-[a-z0-9]+)\/edit$/)![1]
  backend.adopt(code)
  await expect(page.getByLabel('Nội dung câu hỏi')).toBeVisible()
  expect((await backend.library()).map((g) => g.code)).toContain(code)
})

test('each name picker is its own game, grouped under the "Gọi tên" filter', async ({ page }) => {
  await page.goto('/games/new')
  await page.getByRole('tab', { name: 'Gọi tên' }).click()
  await expect(page.getByText('Tổng 6 trò chơi')).toBeVisible()
  const names = ['Vòng quay may mắn', 'Đua ngựa', 'Bóng bay', 'Máy gắp thú', 'Câu cá', 'Tên lửa']
  for (const name of names) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  // No folder card any more.
  await expect(page.getByRole('heading', { name: 'Đua tên', exact: true })).toHaveCount(0)

  // Each card opens its own game.
  for (const [name, mode, start] of [
    ['Câu cá', 'fishing', 'Thả câu'],
    ['Tên lửa', 'rocket', 'Phóng tên lửa'],
  ]) {
    await page.goto('/games/new')
    await page.getByRole('button', { name: `Chọn trò chơi ${name}` }).click()
    await expect(page).toHaveURL(new RegExp(`/tools/pick/${mode}$`))
    await expect(page.getByRole('button', { name: start, exact: true })).toBeVisible()
  }

  // Searching finds a name picker by its own name.
  await page.goto('/games/new')
  await page.getByLabel('Tìm kiếm trò chơi').fill('bong bay')
  await expect(page.getByText('Tổng 1 trò chơi')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bóng bay', exact: true })).toBeVisible()
})
