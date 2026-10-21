import { test as base, expect } from '@playwright/test'
import { Backend, crosswordRow, orderSet, quizItem, signInBrowser, sortSet } from './api'

const test = base.extend<{ backend: Backend }>({
  // Playwright needs the destructuring pattern here, even with no fixtures to take.
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

const QUESTIONS = [
  quizItem('2 + 3 = ?', ['4', '5', '6'], 1),
  quizItem('10 - 4 = ?', ['6', '7', '5'], 0),
  quizItem('3 x 3 = ?', ['6', '8', '9'], 2),
]

test('Rung chuông vàng: wrong answers leave, a rescue brings them back, the last one rings the bell', async ({ page, backend }) => {
  const game = await backend.createGame('GOLDEN_BELL', 'E2E Rung chuông', QUESTIONS)
  await page.goto(`/play/${game.code}`)
  await expect(page.getByText('Còn 28 / 28 bạn')).toBeVisible()
  const board = page.getByLabel('Học sinh trong lớp')

  // Names cannot be marked before the answer is shown.
  await expect(board.getByRole('button', { name: 'Bảo', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Hiện đáp án' }).click()
  await board.getByRole('button', { name: 'Bảo', exact: true }).click()
  await board.getByRole('button', { name: 'Hà', exact: true }).click()
  await expect(page.getByText('2 bạn trả lời sai sẽ ra ngoài.')).toBeVisible()
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()
  await expect(page.getByText('Còn 26 / 28 bạn')).toBeVisible()
  await expect(board.getByRole('button', { name: 'Bảo, ra ngoài ở câu 1' })).toBeDisabled()

  await page.getByRole('button', { name: 'Cứu trợ (1)' }).click()
  await expect(page.getByText('Còn 28 / 28 bạn')).toBeVisible()
  await expect(page.getByRole('button', { name: /Cứu trợ/ })).toHaveCount(0)

  // Everyone but Minh Anh is wrong: she rings the bell before the last question.
  await page.getByRole('button', { name: 'Hiện đáp án' }).click()
  const chips = board.getByRole('button')
  for (let i = 1; i < (await chips.count()); i++) await chips.nth(i).click()
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()
  await expect(page.getByRole('heading', { name: 'Minh Anh rung chuông vàng!' })).toBeVisible()

  const minhAnh = (await backend.students()).find((s) => s.displayName === 'Minh Anh')!
  await page.getByRole('button', { name: 'Thưởng 2 sao cho Minh Anh' }).click()
  await expect(page.getByRole('button', { name: 'Đã thưởng sao' })).toBeDisabled()
  await expect.poll(async () => (await backend.students()).find((s) => s.id === minhAnh.id)!.totalStars).toBe(minhAnh.totalStars + 2)
  await backend.takeBackStar(minhAnh.id, 2)
})

test('Rung chuông vàng: when everyone is wrong, nobody is out', async ({ page, backend }) => {
  const game = await backend.createGame('GOLDEN_BELL', 'E2E Cả lớp sai', QUESTIONS)
  await page.goto(`/play/${game.code}`)
  await page.getByRole('button', { name: 'Hiện đáp án' }).click()
  const chips = page.getByLabel('Học sinh trong lớp').getByRole('button')
  for (let i = 0; i < (await chips.count()); i++) await chips.nth(i).click()
  await expect(page.getByText('Cả lớp cùng sai: không ai bị loại ở câu này.')).toBeVisible()
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()
  await expect(page.getByText('Còn 28 / 28 bạn')).toBeVisible()
  await expect(page.getByText('Câu vừa rồi cả lớp cùng sai nên không ai bị loại.')).toBeVisible()
})

test('Đua thuyền: right answers move the boat, the first boat at the dock wins', async ({ page, backend }) => {
  const game = await backend.createGame('BOAT_RACE', 'E2E Đua thuyền', QUESTIONS)
  await backend.setSettings(game.code, { shuffleItems: false, rules: { participants: { teams: 2 }, scoring: { points: 1, allowSteal: true }, win: { steps: 2 } } })
  await page.goto(`/play/${game.code}`)
  const option = (text: string) => page.getByRole('button', { name: new RegExp(`^[A-F✓]?\\s*${text}$`) })

  // Question 1: Đội Cam is wrong, Đội Biển steals it.
  await page.getByRole('button', { name: 'Đội Cam, chặng 0 / 2' }).click()
  await option('4').click()
  await page.getByRole('button', { name: 'Đội Biển, chặng 0 / 2' }).click()
  await option('5').click()
  await expect(page.getByRole('button', { name: 'Đội Biển, chặng 1 / 2' })).toBeVisible()
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()

  // Question 2: Đội Biển reaches the dock; the game ends there.
  await page.getByRole('button', { name: 'Đội Biển, chặng 1 / 2' }).click()
  await option('6').click()
  await expect(page.getByText('Đội Biển đã cập bến!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Biển chiến thắng!')).toBeVisible()
})

test('a quiz can be played as Rung chuông vàng or Đua thuyền from the editor', async ({ page, backend }) => {
  const game = await backend.createGame('QUIZ', 'E2E Chơi kiểu khác', QUESTIONS)
  await page.goto(`/games/${game.code}/edit`)
  await page.getByRole('button', { name: 'Chơi kiểu khác' }).click()
  await page.getByRole('link', { name: 'Rung chuông vàng' }).click()
  // The start page comes first, and keeps the chosen way of playing.
  await expect(page).toHaveURL(new RegExp(`/games/${game.code}/start\\?as=GOLDEN_BELL$`))
  await page.getByRole('link', { name: 'Bắt đầu trò chơi' }).click()
  await expect(page).toHaveURL(new RegExp(`/play/${game.code}\\?as=GOLDEN_BELL`))
  await expect(page.getByText('Còn 28 / 28 bạn')).toBeVisible()

  await page.goto(`/play/${game.code}?as=BOAT_RACE`)
  await expect(page.getByText('Bến', { exact: true })).toBeVisible()
  // Anything else falls back to the game's own screen.
  await page.goto(`/play/${game.code}?as=MATCHING`)
  await expect(page.getByText('Đội nào giành được quyền trả lời? Cô bấm vào tên đội.')).toBeVisible()
})

test('the chooser lists the new games, and a new Rung chuông vàng opens the quiz editor', async ({ page, backend }) => {
  await page.goto('/games/new')
  for (const name of ['Rung chuông vàng', 'Đua thuyền']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Chọn trò chơi Rung chuông vàng' }).click()
  const dialog = page.getByRole('dialog', { name: /Tạo trò chơi mới/ })
  // A click while the dialog still opens can be lost: click until the choice holds.
  const fresh = dialog.getByRole('radio', { name: /Soạn nội dung mới/ })
  await expect(async () => {
    await fresh.click()
    await expect(fresh).toHaveAttribute('aria-checked', 'true', { timeout: 1000 })
  }).toPass()
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click()
  await page.waitForURL(/\/games\/(g-[a-z0-9]+)\/edit$/)
  backend.adopt(page.url().match(/(g-[a-z0-9]+)\/edit$/)![1])
  await expect(page.getByRole('button', { name: 'Thêm câu Đúng / Sai' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chơi kiểu khác' })).toBeVisible()
})

test('Ô chữ: rows open in turn, a steal, and the keyword guessed early', async ({ page, backend }) => {
  const game = await backend.createGame('CROSSWORD', 'E2E Ô chữ', [
    crosswordRow('Thủ đô?', 'HÀ NỘI', 0),
    crosswordRow('Sông ở Huế?', 'SÔNG HƯƠNG', 4),
    crosswordRow('Con vật kêu meo?', 'CON MÈO', 4),
  ])
  await backend.setSettings(game.code, { rules: { participants: { teams: 2 }, scoring: { points: 10, keywordPoints: 40, allowSteal: true } } })
  await page.goto(`/play/${game.code}`)
  await expect(page.getByText('Còn 3 / 3 hàng')).toBeVisible()

  // Đội Cam picks row 1 and gets it.
  await page.getByRole('button', { name: 'Hàng 1' }).click()
  await expect(page.getByText('Hàng 1 · 5 chữ cái · Đội Cam trả lời')).toBeVisible()
  await page.getByRole('button', { name: 'Đúng', exact: true }).click()
  await expect(page.getByText('Còn 2 / 3 hàng')).toBeVisible()

  // Đội Biển picks row 2, misses; Đội Cam steals it.
  await page.getByRole('button', { name: 'Hàng 2' }).click()
  await page.getByRole('button', { name: 'Sai' }).click()
  await expect(page.getByText('Hàng 2 · 9 chữ cái · Đội Cam trả lời (giành quyền)')).toBeVisible()
  await page.getByRole('button', { name: 'Đúng', exact: true }).click()

  // One row hidden: the keyword (HHÈ) is worth 40 + 10.
  await page.getByRole('button', { name: 'Đoán từ khóa' }).click()
  await page.getByRole('button', { name: /Đội Biển/ }).click()
  await page.getByRole('button', { name: 'Đúng (+50)' }).click()
  await expect(page.getByText(/Đội Biển đoán đúng từ khóa\s*HHÈ/)).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Biển chiến thắng!')).toBeVisible()
})

test('Ô chữ editor: the key letter picked in the form is saved', async ({ page, backend }) => {
  const game = await backend.createGame('CROSSWORD', 'E2E Soạn ô chữ', [{ itemType: 'CROSSWORD_ROW', content: { clue: '' } }])
  await page.goto(`/games/${game.code}/edit`)
  await page.getByLabel('Câu gợi ý').fill('Mọc ở đằng Đông?')
  await page.getByLabel('Đáp án').fill('mặt trời')
  await expect(page.getByText('Cô bấm vào chữ cái nằm ở cột từ khóa.')).toBeVisible()
  await page.getByRole('button', { name: 'Chữ thứ 5: R' }).click()
  await expect(page.getByLabel('Từ khóa')).toHaveText('R')
  await expect
    .poll(async () => (await backend.game(game.code)).items[0].solution)
    .toEqual({ answer: 'mặt trời', keyIndex: 4 })
})

test('Sắp xếp: a wrong check keeps the right cards, the next team completes it', async ({ page, backend }) => {
  const game = await backend.createGame('ORDERING', 'E2E Sắp xếp', [orderSet('Từ bé đến lớn', ['1', '2', '3'])])
  await page.goto(`/play/${game.code}`)
  const card = (text: string) => page.getByLabel('Các thẻ').getByRole('button', { name: text, exact: true })

  await card('1').click()
  await card('3').click()
  await card('2').click()
  await page.getByRole('button', { name: 'Kiểm tra' }).click()
  await expect(page.getByRole('button', { name: 'Ô 1: 1' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Ô 2 trống' })).toBeVisible()
  await expect(page.getByText('Đội Biển: nói thứ tự')).toBeVisible({ timeout: 3000 })

  await card('2').click()
  await card('3').click()
  await page.getByRole('button', { name: 'Kiểm tra' }).click()
  await expect(page.getByText('Đội Biển xếp đúng!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Đội Biển chiến thắng!')).toBeVisible()
})

test('Sắp xếp editor: cards move up and down, and the order is saved', async ({ page, backend }) => {
  const game = await backend.createGame('ORDERING', 'E2E Soạn sắp xếp', [orderSet('Xếp', ['B', 'A'])])
  await page.goto(`/games/${game.code}/edit`)
  await page.getByRole('button', { name: 'Đưa thẻ 2 lên' }).click()
  await expect(page.getByLabel('Thẻ 1', { exact: true })).toHaveValue('A')
  await expect
    .poll(async () => (await backend.game(game.code)).items[0].content.items.map((e: { text: string }) => e.text))
    .toEqual(['A', 'B'])
})

test('Phân loại: cards go into the right basket, a wrong one comes back later', async ({ page, backend }) => {
  const game = await backend.createGame('SORTING', 'E2E Phân loại', [sortSet('Chẵn hay lẻ?', { Chẵn: ['2', '4'], Lẻ: ['1'] })])
  await page.goto(`/play/${game.code}`)
  const right: Record<string, string> = { '2': 'Chẵn', '4': 'Chẵn', '1': 'Lẻ' }
  const wrong: Record<string, string> = { '2': 'Lẻ', '4': 'Lẻ', '1': 'Chẵn' }

  // First card: dropped in the wrong basket, then every card right.
  // The card on show (the previous one may still be flying into its basket).
  const onShow = async () => {
    await expect(page.getByLabel('Thẻ đang chờ')).toHaveCount(1)
    return (await page.getByLabel('Thẻ đang chờ').innerText()).trim()
  }
  const first = await onShow()
  await page.getByRole('button', { name: `Giỏ ${wrong[first]}` }).click()
  await expect(page.getByText('Chưa đúng giỏ, thẻ quay lại cuối chồng.')).toBeVisible()
  await expect(page.getByText(/Còn 3 thẻ/)).toBeVisible()
  for (let i = 0; i < 3; i++) {
    await expect(page.getByRole('button', { name: /^Giỏ / }).first()).toBeEnabled()
    const text = await onShow()
    await page.getByRole('button', { name: `Giỏ ${right[text]}` }).click()
  }
  await expect(page.getByText('Đã phân loại xong!')).toBeVisible()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Kết thúc trò chơi')).toBeVisible()
})

test('Phân loại editor: picking a basket for a card is saved', async ({ page, backend }) => {
  const game = await backend.createGame('SORTING', 'E2E Soạn phân loại', [sortSet('', { Chẵn: ['2'], Lẻ: ['1'] })])
  await page.goto(`/games/${game.code}/edit`)
  await page.getByRole('button', { name: 'Thêm thẻ' }).click()
  await page.getByLabel('Thẻ 3', { exact: true }).fill('5')
  await expect(page.getByText('Còn 1 thẻ chưa chọn giỏ đúng.')).toBeVisible()
  await page.getByRole('radiogroup', { name: 'Giỏ của thẻ 3' }).getByRole('radio', { name: 'Lẻ' }).click()
  await expect
    .poll(async () => (await backend.game(game.code)).items[0].solution?.assign)
    .toEqual([['c1', 'g1'], ['c2', 'g2'], ['c3', 'g2']])
})

test('Chia nhóm: the whole class split into the chosen number of groups', async ({ page }) => {
  await page.goto('/tools/groups')
  await expect(page.getByText('Chia 28 bạn thành 4 nhóm')).toBeVisible()
  await page.getByRole('button', { name: 'Bớt một nhóm' }).click()
  await expect(page.getByText('Mỗi nhóm khoảng 9–10 bạn.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Chia nhóm' }).click()
  const groups = page.getByRole('region', { name: /^Nhóm \d$/ })
  await expect(groups).toHaveCount(3)
  const names = (await groups.locator('span.rounded-full').allInnerTexts()).map((n) => n.trim())
  expect(names).toHaveLength(28)
  expect(new Set(names).size).toBe(28)
  await page.getByRole('button', { name: 'Chia lại' }).click()
  await expect(groups).toHaveCount(3)
})

test('Đồng hồ: counts down, pauses, and says time is up at zero', async ({ page }) => {
  await page.clock.install()
  await page.goto('/tools/timer')
  await page.getByRole('button', { name: '1 phút', exact: true }).click()
  const timer = page.getByRole('timer', { name: 'Thời gian còn lại' })
  await expect(timer).toHaveText('01:00')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await page.clock.runFor(20_000)
  await expect(timer).toHaveText('00:40')
  await page.getByRole('button', { name: 'Tạm dừng' }).click()
  await page.clock.runFor(10_000)
  await expect(timer).toHaveText('00:40')
  await page.getByRole('button', { name: '+ 1 phút' }).click()
  await expect(timer).toHaveText('01:40')
  await page.getByRole('button', { name: 'Chạy tiếp' }).click()
  await page.clock.runFor(101_000)
  await expect(timer).toHaveText('Hết giờ!')
  // Reset goes back to the time chosen.
  await page.getByRole('button', { name: 'Đặt lại' }).click()
  await expect(timer).toHaveText('01:00')
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible()
})

test('Xúc xắc: rolls the chosen number of dice and keeps the last rolls', async ({ page }) => {
  await page.goto('/tools/dice')
  await page.getByRole('button', { name: '3 xúc xắc' }).click()
  await page.getByRole('button', { name: 'Gieo xúc xắc' }).click()
  await expect(page.getByRole('button', { name: 'Gieo xúc xắc' })).toBeEnabled()
  const faces = await page.getByLabel('Kết quả').getByRole('img').evaluateAll((els) =>
    els.map((e) => Number(e.getAttribute('aria-label')!.replace('Mặt ', ''))),
  )
  expect(faces).toHaveLength(3)
  faces.forEach((f) => expect(f).toBeGreaterThanOrEqual(1))
  await expect(page.getByText(`Tổng: ${faces.reduce((a, b) => a + b, 0)}`)).toBeVisible()
  await expect(page.getByLabel('Các lần gieo trước')).toContainText(`${faces.join(' + ')} = `)
})

test('the "Công cụ" filter lists the classroom tools, and each opens', async ({ page }) => {
  await page.goto('/games/new')
  await page.getByRole('tab', { name: 'Công cụ' }).click()
  await expect(page.getByText('Tổng 3 trò chơi')).toBeVisible()
  await page.getByRole('button', { name: 'Chọn trò chơi Xúc xắc' }).click()
  await expect(page).toHaveURL(/\/tools\/dice$/)
})
