import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateGameItemRequest } from '@/types/api'

const SAMPLE_ITEMS: CreateGameItemRequest[] = [
  { itemType: 'MULTIPLE_CHOICE', content: { text: '2 + 2 = ?' }, solution: { answer: 'B' } },
  { itemType: 'MULTIPLE_CHOICE', content: { text: '3 + 3 = ?' }, solution: { answer: 'C' } },
]

const server = vi.hoisted(() => ({
  get: vi.fn(async (url: string) => {
    if (url !== '/v1/games/samples/QUIZ') throw { status: 400, code: 'NO_SAMPLE', message: '' }
    return { data: { templateCode: 'QUIZ', title: 'Toán vui', subject: 'MATH', items: structuredClone(SAMPLE_ITEMS) } }
  }),
  listTemplates: vi.fn(async () => [{ code: 'QUIZ', defaultConfig: { timeLimit: 30 } }]),
}))
vi.mock('@/api/httpClient', () => ({ httpClient: { get: server.get } }))
vi.mock('@/api/templateApi', () => ({ listTemplates: server.listTemplates }))

type Api = typeof import('@/api/guestGameApi')
let api: Api

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  api = await import('@/api/guestGameApi')
})

describe('guest games', () => {
  it('plays the built-in sample, fetched once, with the template defaults', async () => {
    const first = await api.playSample('QUIZ')
    expect(first).toMatchObject({ templateCode: 'QUIZ', title: 'Toán vui', sample: true, settings: { timeLimit: 30 } })
    expect(first.items.map((i) => i.content.text)).toEqual(['2 + 2 = ?', '3 + 3 = ?'])
    expect(first.items.map((i) => i.position)).toEqual([1, 2])

    const again = await api.playSample('QUIZ')
    expect(again.code).toBe(first.code)
    expect(server.get).toHaveBeenCalledTimes(1)
    expect(await api.listGames()).toHaveLength(1)
  })

  it('writes a game of its own: add, edit, reorder and delete items', async () => {
    const created = await api.createGame({ templateCode: 'QUIZ', title: 'Của em' })
    expect(created.code.startsWith('guest-')).toBe(true)

    const added = await api.addItems(created.code, SAMPLE_ITEMS)
    const [a, b] = added.items
    await api.updateItem(created.code, a.id, { content: { text: 'Sửa rồi' } })
    await api.reorderItems(created.code, [b.id, a.id])
    let game = await api.getGame(created.code)
    expect(game.items.map((i) => i.content.text)).toEqual(['3 + 3 = ?', 'Sửa rồi'])

    await api.deleteItem(created.code, b.id)
    await api.updateGame(created.code, { title: 'Tên mới', settings: { timeLimit: 10 } })
    game = await api.getGame(created.code)
    expect(game).toMatchObject({ title: 'Tên mới', settings: { timeLimit: 10 } })
    expect(game.items).toHaveLength(1)
  })

  it('what callers get back is a copy: changing it does not change the game', async () => {
    const created = await api.createGame({ templateCode: 'QUIZ' })
    created.title = 'changed'
    expect((await api.getGame(created.code)).title).toBe('Trò chơi mới')
  })

  it('an unknown or deleted game is not found, as on the server', async () => {
    await expect(api.getGame('g-teacher')).rejects.toMatchObject({ status: 404 })
    const created = await api.createGame({ templateCode: 'QUIZ' })
    await api.archiveGame(created.code)
    await expect(api.getGame(created.code)).rejects.toMatchObject({ status: 404 })
    expect(await api.listGames()).toEqual([])
  })

  it('signing in leaves the guest games behind', async () => {
    await api.playSample('QUIZ')
    api.forgetGuestGames()
    expect(await api.listGames()).toEqual([])
  })
})
