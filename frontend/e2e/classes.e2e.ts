import { test as base, expect } from '@playwright/test'
import { Backend, quizItem, signInBrowser } from './api'

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

/** A class name no earlier run left behind. */
const uniqueName = (prefix: string) => `${prefix} ${Date.now().toString(36).slice(-5)}`

test('the class list shows each class with its numbers, and filters by status and search', async ({ page }) => {
  await page.goto('/classes')
  await expect(page.getByRole('heading', { name: 'Quản lý lớp học' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lớp học', exact: true })).toHaveAttribute('aria-current', 'page')

  const oneA = page.getByRole('link', { name: /^Lớp 1A, 25 học sinh/ })
  await expect(oneA).toContainText('Đang hoạt động')
  await expect(oneA).toContainText('8Hoạt động')
  await expect(oneA).toContainText('63%Hoàn thành')
  const twoB = page.getByRole('link', { name: /^Lớp 2B, 20 học sinh/ })
  await expect(twoB).toContainText('Tạm ngưng')

  await page.getByRole('tab', { name: 'Tạm ngưng (1)' }).click()
  await expect(twoB).toBeVisible()
  await expect(oneA).toBeHidden()

  await page.getByRole('tab', { name: /^Tất cả/ }).click()
  await page.getByLabel('Tìm kiếm lớp học').fill('nguyen hue')
  await expect(twoB).toBeVisible()
  await expect(oneA).toBeHidden()
  await page.getByLabel('Tìm kiếm lớp học').fill('không có lớp này')
  await expect(page.getByText('Không có lớp nào khớp “không có lớp này”')).toBeVisible()
  await page.getByRole('button', { name: 'Xóa tìm kiếm' }).click()
  await expect(oneA).toBeVisible()

  await oneA.click()
  await expect(page).toHaveURL(/\/classes\/c-1a$/)
  await expect(page.getByRole('heading', { name: 'Lớp 1A' })).toBeVisible()
  await expect(page.getByText('5/8 trò chơi đến cuối')).toBeVisible()
})

test('a teacher creates a class, fills its class list and manages it', async ({ page, backend }) => {
  const name = uniqueName('E2E')
  await page.goto('/classes')
  await page.getByRole('button', { name: 'Tạo lớp học' }).first().click()
  const form = page.getByRole('dialog', { name: 'Tạo lớp học mới' })
  await form.getByLabel('Tên lớp').fill(name)
  await form.getByRole('radio', { name: 'Gấu trúc' }).click()
  await form.getByRole('button', { name: 'Tạo lớp học' }).click()

  await expect(page).toHaveURL(/\/classes\/c-[a-z0-9]{8}$/)
  const code = page.url().split('/').pop()!
  backend.adoptClassroom(code)
  await expect(page.getByRole('heading', { name: `Lớp ${name}` })).toBeVisible()
  expect((await backend.classroom(code)).avatar).toBe('panda')

  // The same name again (other case) is refused, next to the field.
  await page.getByRole('link', { name: 'Danh sách lớp học' }).click()
  await page.getByRole('button', { name: 'Tạo lớp học' }).first().click()
  await form.getByLabel('Tên lớp').fill(name.toLowerCase())
  await form.getByRole('button', { name: 'Tạo lớp học' }).click()
  await expect(form.getByText('Cô đã có lớp trùng tên trong năm học này')).toBeVisible()
  await form.getByRole('button', { name: 'Hủy' }).click()
  await page.getByRole('link', { name: new RegExp(`^Lớp ${name}, 0 học sinh`) }).click()

  // A pasted class list: numbering and empty lines are dropped.
  await expect(page.getByText('Lớp chưa có học sinh')).toBeVisible()
  await page.getByRole('button', { name: 'Thêm học sinh' }).first().click()
  const adding = page.getByRole('dialog', { name: 'Thêm học sinh' })
  await adding.getByRole('textbox').fill('1. Trần Minh Đức\n2. Lê Bảo An\n\n3) Nguyễn Thu Hà')
  await expect(adding.getByText('Sẽ thêm 3 học sinh vào cuối danh sách.')).toBeVisible()
  await adding.getByRole('button', { name: 'Thêm 3 học sinh' }).click()
  await expect(page.getByRole('heading', { name: 'Học sinh (3)' })).toBeVisible()
  expect((await backend.classStudents(code)).map((s) => s.displayName)).toEqual(['Trần Minh Đức', 'Lê Bảo An', 'Nguyễn Thu Hà'])

  await page.getByRole('button', { name: 'Đổi tên Lê Bảo An' }).click()
  const renaming = page.getByRole('dialog', { name: 'Đổi tên học sinh' })
  await renaming.getByLabel('Tên học sinh').fill('Lê Bảo Anh')
  await renaming.getByRole('button', { name: 'Lưu' }).click()
  await expect(page.getByText('Lê Bảo Anh', { exact: true })).toBeVisible()

  // Roll call by given name: Anh, Đức, Hà.
  await page.getByRole('button', { name: 'Xếp theo tên' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xếp theo tên' }).click()
  await expect(page.getByText('Đã xếp danh sách theo tên')).toBeVisible()
  expect((await backend.classStudents(code)).map((s) => `${s.rollNumber}. ${s.displayName}`)).toEqual([
    '1. Lê Bảo Anh',
    '2. Trần Minh Đức',
    '3. Nguyễn Thu Hà',
  ])

  await page.getByRole('button', { name: 'Xóa Nguyễn Thu Hà khỏi lớp' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa khỏi lớp' }).click()
  await expect(page.getByRole('heading', { name: 'Học sinh (2)' })).toBeVisible()
  expect((await backend.classroom(code)).studentCount).toBe(2)

  await page.getByRole('button', { name: 'Sửa' }).click()
  const editing = page.getByRole('dialog', { name: 'Sửa thông tin lớp' })
  await expect(editing.getByLabel('Tên lớp')).toHaveValue(name)
  await editing.getByLabel('Trường').fill('Tiểu học Hòa Bình')
  await editing.getByRole('radio', { name: 'Cáo' }).click()
  await editing.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText(/Khối 1 · Tiểu học Hòa Bình/)).toBeVisible()
  expect(await backend.classroom(code)).toMatchObject({ avatar: 'fox', schoolName: 'Tiểu học Hòa Bình' })

  // Paused: kept, but not played with.
  await page.getByRole('button', { name: 'Thêm thao tác' }).click()
  await page.getByRole('menuitem', { name: 'Tạm ngưng lớp' }).click()
  await expect(page.getByText('Lớp đang tạm ngưng.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chơi cùng lớp' })).toBeDisabled()
  await page.getByRole('button', { name: 'Kích hoạt lại' }).click()
  await expect(page.getByText('Lớp đang tạm ngưng.')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Chơi cùng lớp' })).toBeEnabled()

  await page.getByRole('button', { name: 'Thêm thao tác' }).click()
  await page.getByRole('menuitem', { name: 'Xóa lớp' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa lớp' }).click()
  await expect(page).toHaveURL(/\/classes$/)
  await expect(page.getByRole('link', { name: new RegExp(`^Lớp ${name}`) })).toBeHidden()
  expect((await backend.classroomList()).map((c) => c.code)).not.toContain(code)
})

test('the class picked on the home page plays the games, and its numbers count them', async ({ page, backend }) => {
  const name = uniqueName('E2E chơi')
  const classroom = await backend.createClassroom(name, ['An', 'Bình', 'Chi'])
  const game = await backend.createGame('QUIZ', 'E2E Lớp chơi', [quizItem('2 + 2 = ?', ['3', '4'], 1)])

  await page.goto('/')
  await page.getByRole('button', { name: /^Lớp đang dạy:/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`Lớp ${name}`) }).click()
  await expect(page.getByRole('button', { name: `Lớp đang dạy: Lớp ${name}. Đổi lớp` })).toBeVisible()
  await expect(page.getByText('3 học sinh', { exact: true })).toBeVisible()

  await page.goto(`/play/${game.code}`)
  await page.getByRole('button', { name: /Đội Cam/ }).click()
  await page.locator('button').filter({ has: page.locator('span', { hasText: /^4$/ }) }).click()
  await page.getByRole('button', { name: 'Xem kết quả' }).click()
  await expect(page.getByText('Kết thúc trò chơi')).toBeVisible()

  await expect.poll(async () => (await backend.classroom(classroom.code)).completedCount).toBe(1)
  expect(await backend.classroom(classroom.code)).toMatchObject({ activityCount: 1, completionRate: 100 })

  await page.goto(`/classes/${classroom.code}`)
  await expect(page.getByText('Lớp đang dạy', { exact: true })).toBeVisible()
  await expect(page.getByText('1/1 trò chơi đến cuối')).toBeVisible()
})
