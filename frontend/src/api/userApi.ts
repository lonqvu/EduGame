import { httpClient } from '@/api/httpClient'
import type { ProfileResponse, SignedOutResponse, UpdateProfileRequest, UserResponse } from '@/types/api'

export async function getMe(): Promise<UserResponse> {
  const { data } = await httpClient.get<UserResponse>('/v1/me')
  return data
}

export async function getProfile(): Promise<ProfileResponse> {
  const { data } = await httpClient.get<ProfileResponse>('/v1/me/profile')
  return data
}

export async function updateProfile(request: UpdateProfileRequest): Promise<ProfileResponse> {
  const { data } = await httpClient.patch<ProfileResponse>('/v1/me/profile', request)
  return data
}

/** Every other session of the teacher is signed out; this one stays. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<SignedOutResponse> {
  const { data } = await httpClient.post<SignedOutResponse>('/v1/me/password', { currentPassword, newPassword })
  return data
}

export async function signOutOthers(): Promise<SignedOutResponse> {
  const { data } = await httpClient.post<SignedOutResponse>('/v1/me/sessions/sign-out-others')
  return data
}

/** The picture is sent as a JPEG; the backend crops and re-encodes it again. */
export async function uploadAvatar(picture: Blob): Promise<ProfileResponse> {
  const form = new FormData()
  form.append('file', picture, 'avatar.jpg')
  // Not JSON: axios would turn the form into JSON; with this header the browser sets the multipart boundary.
  const { data } = await httpClient.post<ProfileResponse>('/v1/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  return data
}

export async function removeAvatar(): Promise<ProfileResponse> {
  const { data } = await httpClient.delete<ProfileResponse>('/v1/me/avatar')
  return data
}
