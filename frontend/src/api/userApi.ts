import { httpClient } from '@/api/httpClient'
import type { UserResponse } from '@/types/api'

export async function getMe(): Promise<UserResponse> {
  const { data } = await httpClient.get<UserResponse>('/v1/me')
  return data
}
