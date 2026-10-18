import { create } from 'zustand'
import * as userApi from '@/api/userApi'
import { useTeacherStore } from '@/store/teacherStore'
import type { LoadStatus, ProfileResponse, UpdateProfileRequest } from '@/types/api'
import { UPLOADED } from '@/utils/profile'

/** "Hồ sơ của tôi": the signed-in teacher's profile (GET /me/profile). */
interface ProfileState {
  profile: ProfileResponse | null
  status: LoadStatus
  /** Loads again each time the page opens: the figures change as the teacher works. */
  load: () => Promise<void>
  /**
   * Saves; rejects with the API error (the profile shown stays as it was). With `picture` (a square JPEG) it is
   * uploaded first and kept as the profile picture.
   */
  save: (request: UpdateProfileRequest, picture?: Blob) => Promise<ProfileResponse>
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  profile: null,
  status: 'idle',

  load: async () => {
    if (!get().profile) set({ status: 'loading' })
    try {
      set({ profile: await userApi.getProfile(), status: 'ready' })
    } catch {
      // A profile already on screen stays; only a first load shows the error.
      if (!get().profile) set({ status: 'error' })
    }
  },

  save: async (request, picture) => {
    if (picture) {
      // Shown at once: if the rest of the form is then refused, the new picture is already the teacher's.
      set({ profile: await userApi.uploadAvatar(picture), status: 'ready' })
    }
    const profile = await userApi.updateProfile({
      displayName: request.displayName.trim(),
      phone: request.phone.trim(),
      avatar: picture ? UPLOADED : request.avatar,
    })
    set({ profile, status: 'ready' })
    useTeacherStore.getState().rename(profile.displayName)
    return profile
  },
}))
