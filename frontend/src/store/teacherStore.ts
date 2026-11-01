import { create } from 'zustand'
import { getProfile } from '@/api/userApi'
import type { LoadStatus, ProfileResponse } from '@/types/api'
import { avatarSrc } from '@/utils/profile'

export interface Teacher {
  /** "Cô Lan" */
  name: string
  /** "cô Lan", used inside a sentence ("Chào cô Lan!") */
  greetingName: string
  /** "Lan", without the honorific (avatar initial) */
  shortName: string
  /** Role ADMIN: the "Quản trị" pages. */
  isAdmin: boolean
  /** The picture chosen in "Hồ sơ của tôi" (uploaded, an animal or the teacher drawing). */
  avatar: string
}

const HONORIFIC = /^(cô|thầy)\s+/i

type ProfilePart = Pick<ProfileResponse, 'displayName' | 'role' | 'avatar' | 'avatarUrl'>

function toTeacher({ displayName, role, avatar, avatarUrl }: ProfilePart): Teacher {
  return {
    isAdmin: role === 'ADMIN',
    avatar: avatarSrc(avatar, avatarUrl),
    name: displayName,
    greetingName: HONORIFIC.test(displayName) ? displayName.charAt(0).toLowerCase() + displayName.slice(1) : displayName,
    shortName: displayName.replace(HONORIFIC, ''),
  }
}

/** The signed-in teacher (GET /me/profile: the name and the picture). */
interface TeacherState {
  teacher: Teacher | null
  status: LoadStatus
  load: () => Promise<void>
  /** After the profile was saved: the greeting and the top bar use the new name and picture at once. */
  update: (profile: ProfilePart) => void
}

export const useTeacherStore = create<TeacherState>()((set, get) => ({
  teacher: null,
  status: 'idle',
  load: async () => {
    if (get().status !== 'idle' && get().status !== 'error') return
    set({ status: 'loading' })
    try {
      set({ teacher: toTeacher(await getProfile()), status: 'ready' })
    } catch {
      set({ status: 'error' })
    }
  },
  update: (profile) => set({ teacher: toTeacher(profile), status: 'ready' }),
}))
