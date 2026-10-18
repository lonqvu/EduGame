import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProfileResponse } from '@/types/api'

const backend = vi.hoisted(() => {
  const state = {
    profile: {
      code: 'u-long',
      username: 'long',
      displayName: 'Vũ Long',
      email: 'long@example.com',
      phone: '0987654321',
      role: 'TEACHER',
      emailVerified: true,
      memberSince: '2025-08-15T03:00:00Z',
      stats: { classrooms: 3, students: 45, questionSets: 12, activities: 8 },
    } as ProfileResponse,
    fail: false,
    failUpload: false,
  }
  const api = {
    getMe: vi.fn(),
    getProfile: vi.fn(async () => {
      if (state.fail) throw { status: 503, code: 'NETWORK_ERROR', message: 'offline' }
      return { ...state.profile }
    }),
    updateProfile: vi.fn(async (request: { displayName: string; phone: string; avatar: string }) => {
      if (state.fail) throw { status: 400, code: 'INVALID_PHONE', message: 'bad phone' }
      state.profile = { ...state.profile, displayName: request.displayName, phone: request.phone || undefined, avatar: request.avatar || undefined }
      return { ...state.profile }
    }),
    uploadAvatar: vi.fn(async (_picture: Blob) => {
      if (state.failUpload) throw { status: 400, code: 'INVALID_IMAGE', message: 'not a picture' }
      state.profile = { ...state.profile, avatar: 'upload', avatarUrl: '/api/v1/avatars/new' }
      return { ...state.profile }
    }),
    removeAvatar: vi.fn(),
    changePassword: vi.fn(),
    signOutOthers: vi.fn(),
  }
  return { state, api, original: { ...state.profile } }
})

vi.mock('@/api/userApi', () => backend.api)

type ProfileStore = typeof import('@/store/profileStore').useProfileStore
type TeacherStore = typeof import('@/store/teacherStore').useTeacherStore
let store: ProfileStore
let teacher: TeacherStore

beforeEach(async () => {
  vi.resetModules()
  backend.state.fail = false
  backend.state.failUpload = false
  backend.api.uploadAvatar.mockClear()
  backend.state.profile = { ...backend.original }
  backend.api.updateProfile.mockClear()
  store = (await import('@/store/profileStore')).useProfileStore
  teacher = (await import('@/store/teacherStore')).useTeacherStore
})

describe('profileStore', () => {
  it('loads the profile with its figures', async () => {
    await store.getState().load()

    expect(store.getState().status).toBe('ready')
    expect(store.getState().profile?.displayName).toBe('Vũ Long')
    expect(store.getState().profile?.stats.students).toBe(45)
  })

  it('a first load that fails shows the error; a later one keeps the profile on screen', async () => {
    backend.state.fail = true
    await store.getState().load()
    expect(store.getState().status).toBe('error')

    backend.state.fail = false
    await store.getState().load()
    backend.state.fail = true
    await store.getState().load()
    expect(store.getState().status).toBe('ready')
    expect(store.getState().profile?.displayName).toBe('Vũ Long')
  })

  it('saves trimmed values and renames the teacher everywhere', async () => {
    await store.getState().load()
    await store.getState().save({ displayName: '  Thầy Long ', phone: ' 0912345678 ', avatar: 'owl' })

    expect(backend.api.updateProfile).toHaveBeenCalledWith({ displayName: 'Thầy Long', phone: '0912345678', avatar: 'owl' })
    expect(store.getState().profile?.avatar).toBe('owl')
    expect(teacher.getState().teacher).toMatchObject({ name: 'Thầy Long', shortName: 'Long', greetingName: 'thầy Long' })
  })

  it('a refused save leaves the profile as it was and passes the error on', async () => {
    await store.getState().load()
    backend.state.fail = true

    await expect(store.getState().save({ displayName: 'Người khác', phone: '12ab', avatar: '' })).rejects.toMatchObject({
      code: 'INVALID_PHONE',
    })
    expect(store.getState().profile?.displayName).toBe('Vũ Long')
    expect(teacher.getState().teacher).toBeNull()
  })

  it('a picked picture is uploaded first, then kept by the rest of the form', async () => {
    await store.getState().load()
    const picture = new Blob(['jpeg'], { type: 'image/jpeg' })

    await store.getState().save({ displayName: 'Vũ Long', phone: '', avatar: 'upload' }, picture)

    expect(backend.api.uploadAvatar).toHaveBeenCalledWith(picture)
    expect(backend.api.updateProfile).toHaveBeenCalledWith({ displayName: 'Vũ Long', phone: '', avatar: 'upload' })
    expect(store.getState().profile).toMatchObject({ avatar: 'upload', avatarUrl: '/api/v1/avatars/new' })
  })

  it('a refused picture stops the save', async () => {
    await store.getState().load()
    backend.state.failUpload = true

    await expect(
      store.getState().save({ displayName: 'Tên mới', phone: '', avatar: 'upload' }, new Blob(['x'])),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE' })
    expect(backend.api.updateProfile).not.toHaveBeenCalled()
    expect(store.getState().profile?.displayName).toBe('Vũ Long')
  })
})
