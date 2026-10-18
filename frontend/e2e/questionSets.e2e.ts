import { test as base, expect, type Page } from '@playwright/test'
import { Backend, choice, shortAnswer, signInBrowser } from './api'

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

/** A title no earlier run left behind. */
const unique = (prefix: string) => `${prefix} ${Date.now().toString(36).slice(-5)}`

/** Picks an option of an antd select by its label. */
async function pick(page: Page, select: string, option: string) {
  await page.getByRole('combobox', { name: select }).click()
  const item = page.locator(`.ant-select-item-option[title="${option}"]`)
  // A click while the list is still opening can be lost: click until the list closes on the choice.
  await expect(async () => {
    if (await item.isVisible()) await item.click()
    await expect(item).toBeHidden({ timeout: 1000 })
  }).toPass()
}

const row = (page: Page, title: string) => page.getByRole('listitem').filter({ has: page.getByRole('link', { name: title, exact: true }) })

test('the bank lists the sets with their numbers, and filters them', async ({ page, backend }) => {
  const total = (await backend.questionSetList()).length
  await page.goto('/question-sets')
  await expect(page.getByRole('heading', { name: 'Bộ câu hỏi', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bộ câu hỏi', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('tab', { name: `Tất cả (${total})` })).toHaveAttribute('aria-selected', 'true')

  const cong = row(page, 'Toán lớp 2 - Phép cộng trong phạm vi 100')
  await expect(cong).toContainText('Trắc nghiệm + tự luận')
  await expect(cong).toContainText('8Câu hỏi')
  await expect(cong).toContainText('Tạo bởi: Cô Lan')
  const doc = row(page, 'Tiếng Việt - Luyện đọc hiểu')

  // Subject tab, then search, kind and grade filters.
  await page.getByRole('tab', { name: /^Tiếng Việt \(\d+\)$/ }).click()
  await expect(doc).toBeVisible()
  await expect(cong).toBeHidden()
  await page.getByRole('tab', { name: /^Tất cả/ }).click()

  await page.getByLabel('Tìm bộ câu hỏi').fill('bang nhan')
  await expect(row(page, 'Toán lớp 3 - Bảng nhân 6, 7, 8')).toBeVisible()
  await expect(page.getByText('Tìm thấy 1 bộ câu hỏi')).toBeVisible()
  await page.getByLabel('Tìm bộ câu hỏi').fill('')

  await pick(page, 'Loại câu hỏi', 'Tự luận')
  await expect(doc).toBeVisible()
  await expect(cong).toBeHidden()
  await pick(page, 'Khối lớp', 'Lớp 5')
  await expect(page.getByText('Không có bộ câu hỏi nào phù hợp')).toBeVisible()
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).last().click()
  await expect(cong).toBeVisible()

  // "Chủ đề phổ biến" filters by subject too.
  await page.getByRole('button', { name: /^Khoa học/ }).click()
  await expect(page.getByRole('tab', { name: /^Khoa học \(\d+\)$/ })).toHaveAttribute('aria-selected', 'true')
  await expect(row(page, 'Khoa học - Cơ thể người và sức khỏe')).toBeVisible()
  await expect(cong).toBeHidden()

  await page.getByRole('link', { name: 'Khoa học - Cơ thể người và sức khỏe' }).click()
  await expect(page).toHaveURL(/\/question-sets\/qs-kh4-co-the$/)
  await expect(page.getByRole('heading', { name: 'Câu hỏi (4)' })).toBeVisible()
})

test('a teacher creates a set and writes, pastes, edits, moves and deletes its questions', async ({ page, backend }) => {
  const title = unique('E2E Bộ')
  await page.goto('/question-sets')
  await page.getByRole('button', { name: /Tạo bộ câu hỏi mới/ }).first().click()
  const form = page.getByRole('dialog', { name: 'Tạo bộ câu hỏi mới' })
  await form.getByRole('button', { name: 'Tạo bộ câu hỏi' }).click()
  await expect(form.getByText('Cô đặt tên cho bộ câu hỏi nhé')).toBeVisible()
  await form.getByLabel('Tên bộ câu hỏi').fill(title)
  await form.getByRole('button', { name: 'Tạo bộ câu hỏi' }).click()

  await expect(page).toHaveURL(/\/question-sets\/qs-[a-z0-9]{10}$/)
  const code = page.url().split('/').pop()!
  backend.adoptQuestionSet(code)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByText('Bộ chưa có câu hỏi')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sử dụng' }).first()).toBeDisabled()

  // One multiple choice question, then a short answer one in the same dialog.
  await page.getByRole('button', { name: 'Thêm câu hỏi' }).first().click()
  const writing = page.getByRole('dialog', { name: /Câu hỏi mới/ })
  await writing.getByRole('button', { name: 'Thêm câu hỏi' }).click()
  await expect(writing.getByRole('alert')).toHaveText('Cô nhập nội dung câu hỏi nhé.')
  await writing.getByRole('textbox').first().fill('5 + 3 = ?')
  await writing.getByLabel('Đáp án A', { exact: true }).fill('7')
  await writing.getByLabel('Đáp án B', { exact: true }).fill('8')
  await writing.getByLabel('Đáp án B đúng').check()
  await writing.getByRole('button', { name: 'Thêm và soạn câu tiếp' }).click()
  await expect(page.getByRole('dialog', { name: 'Câu hỏi mới (câu 2)' })).toBeVisible()
  await writing.getByText('Tự luận (trả lời ngắn)').click()
  await writing.getByRole('textbox').first().fill('Thủ đô của Việt Nam?')
  await writing.getByPlaceholder('Cô dùng để chấm khi học sinh trả lời').fill('Hà Nội')
  await writing.getByRole('button', { name: 'Thêm câu hỏi' }).click()
  await expect(page.getByRole('heading', { name: 'Câu hỏi (2)' })).toBeVisible()

  let set = await backend.questionSet(code)
  expect(set.questions.map((q) => [q.type, q.text, q.options ?? q.answer, q.correctOption])).toEqual([
    ['MULTIPLE_CHOICE', '5 + 3 = ?', ['7', '8'], 1],
    ['SHORT_ANSWER', 'Thủ đô của Việt Nam?', 'Hà Nội', undefined],
  ])

  // A pasted list: the bad line is listed and skipped.
  await page.getByRole('button', { name: 'Dán nhiều câu' }).click()
  const pasting = page.getByRole('dialog', { name: 'Dán nhiều câu hỏi' })
  await pasting.getByLabel('Các câu hỏi').fill('Con gì kêu meo meo? = Con mèo | Con chó\nCâu thiếu đáp án\nMặt trời mọc ở đằng Tây = Sai')
  await expect(pasting.getByText('Dòng 2: Thiếu đáp án sau dấu “=” (bỏ qua)')).toBeVisible()
  await pasting.getByRole('button', { name: 'Thêm 2 câu hỏi' }).click()
  await expect(page.getByRole('heading', { name: 'Câu hỏi (4)' })).toBeVisible()
  await expect(page.getByText('Đã thêm 2 câu hỏi, bỏ qua 1 dòng lỗi')).toBeVisible()

  // Edit: question 2 becomes multiple choice.
  await page.getByRole('button', { name: 'Sửa câu 2' }).click()
  const editing = page.getByRole('dialog', { name: 'Sửa câu 2' })
  await editing.getByText('Trắc nghiệm', { exact: true }).click()
  await editing.getByLabel('Đáp án A', { exact: true }).fill('Hà Nội')
  await editing.getByLabel('Đáp án B', { exact: true }).fill('Huế')
  await editing.getByRole('button', { name: 'Lưu câu hỏi' }).click()
  await expect(editing).toBeHidden()

  // Move question 1 down, delete the last one.
  await page.getByRole('button', { name: 'Đưa câu 1 xuống' }).click()
  await expect(page.getByRole('button', { name: 'Đưa câu 1 xuống' })).toBeEnabled()
  await page.getByRole('button', { name: 'Xóa câu 4' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa câu hỏi' }).click()
  await expect(page.getByRole('heading', { name: 'Câu hỏi (3)' })).toBeVisible()

  set = await backend.questionSet(code)
  expect(set.questions.map((q) => q.text)).toEqual(['Thủ đô của Việt Nam?', '5 + 3 = ?', 'Con gì kêu meo meo?'])
  expect(set.questions[0]).toMatchObject({ type: 'MULTIPLE_CHOICE', options: ['Hà Nội', 'Huế'], correctOption: 0 })

  // Details.
  await page.getByRole('button', { name: /^Sửa/ }).first().click()
  const details = page.getByRole('dialog', { name: 'Sửa thông tin bộ câu hỏi' })
  await pick(page, 'Môn học', 'Tiếng Việt')
  await details.getByLabel('Mô tả (không bắt buộc)').fill('Ôn tập cuối tuần')
  await details.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.locator('p', { hasText: 'Ôn tập cuối tuần' })).toBeVisible()
  expect((await backend.questionSet(code)).summary).toMatchObject({ subject: 'TIENG_VIET', description: 'Ôn tập cuối tuần' })

  // Copy, then delete the copy: back to the bank, the original stays.
  await page.getByRole('button', { name: 'Thêm thao tác' }).click()
  await page.getByRole('menuitem', { name: 'Nhân bản bộ câu hỏi' }).click()
  await expect(page.getByRole('heading', { name: `${title} (bản sao)` })).toBeVisible()
  const copy = page.url().split('/').pop()!
  backend.adoptQuestionSet(copy)
  await expect(page.getByRole('heading', { name: 'Câu hỏi (3)' })).toBeVisible()
  await page.getByRole('button', { name: 'Thêm thao tác' }).click()
  await page.getByRole('menuitem', { name: 'Xóa bộ câu hỏi' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa bộ câu hỏi' }).click()
  await expect(page).toHaveURL(/\/question-sets$/)
  await expect(page.getByRole('link', { name: `${title} (bản sao)` })).toBeHidden()
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
  expect((await backend.questionSetList()).map((s) => s.code)).not.toContain(copy)
})

test('"Sử dụng" makes a game from the set and opens it in the editor', async ({ page, backend }) => {
  const title = unique('E2E Dùng')
  const set = await backend.createQuestionSet(title, [
    choice('2 + 2 = ?', ['4', '5']),
    choice('3 + 3 = ?', ['6', '7', '8']),
    shortAnswer('Tên thủ đô?', 'Hà Nội'),
  ])
  const onlyShort = await backend.createQuestionSet(unique('E2E Tự luận'), [shortAnswer('Con gì kêu meo meo?', 'Con mèo')])

  await page.goto('/question-sets')
  await row(page, title).getByRole('button', { name: 'Sử dụng' }).click()
  const using = page.getByRole('dialog', { name: 'Sử dụng trong trò chơi' })
  await expect(using.getByRole('radio', { name: /Trắc nghiệm/ })).toHaveAttribute('aria-checked', 'true')
  await expect(using.getByRole('radio', { name: /Trắc nghiệm/ })).toContainText('Dùng được 2/3 câu (câu trắc nghiệm)')
  await expect(using.getByRole('radio', { name: /Lật ô thi đua/ })).toContainText('Dùng được cả 3 câu')
  await using.getByRole('radio', { name: /Rung chuông vàng/ }).click()
  await using.getByRole('button', { name: 'Tạo trò chơi' }).click()

  await expect(page).toHaveURL(/\/games\/[^/]+\/edit$/)
  const gameCode = page.url().split('/').at(-2)!
  backend.adopt(gameCode)
  await expect(page.getByText('Đã tạo trò chơi với 2 câu hỏi (bỏ qua 1 câu tự luận)')).toBeVisible()
  const game = await backend.game(gameCode)
  expect(game.title).toBe(title)
  expect(game.items.map((i) => i.content.text)).toEqual(['2 + 2 = ?', '3 + 3 = ?'])

  // The set lists the game and counts the use.
  await page.goto(`/question-sets/${set.summary.code}`)
  await expect(page.getByRole('link', { name: /Rung chuông vàng/ })).toBeVisible()
  // The "Lượt sử dụng" tile: one game made, not played with a class yet.
  await expect(page.getByText('chơi 0 lần với lớp')).toBeVisible()
  expect((await backend.questionSet(set.summary.code)).summary.useCount).toBe(1)

  // A set of short answers only plays in Lật ô; "Sử dụng trong trò chơi" lets the teacher pick the set.
  await page.goto('/question-sets')
  await page.getByRole('button', { name: /Sử dụng trong trò chơi/ }).click()
  await pick(page, 'Bộ câu hỏi', `${onlyShort.summary.title} (1 câu)`)
  const dialog = page.getByRole('dialog', { name: 'Sử dụng trong trò chơi' })
  await expect(dialog.getByRole('radio', { name: /Trắc nghiệm/ })).toBeDisabled()
  await expect(dialog.getByRole('radio', { name: /Lật ô thi đua/ })).toHaveAttribute('aria-checked', 'true')
  await dialog.getByRole('button', { name: 'Hủy' }).click()
})

test('the home page shows the last changed sets and leads to the bank', async ({ page, backend }) => {
  const [last] = await backend.questionSetList()
  await page.goto('/')
  await expect(page.getByRole('link', { name: last.title })).toBeVisible()
  await page.getByRole('link', { name: 'Xem tất cả' }).last().click()
  await expect(page).toHaveURL(/\/question-sets$/)
})
