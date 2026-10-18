import { httpClient } from '@/api/httpClient'
import type { UserSettings } from '@/types/api'

export async function getSettings(): Promise<UserSettings> {
  const { data } = await httpClient.get<UserSettings>('/v1/me/settings')
  return data
}

/** Replaces the whole document; returns it as saved. */
export async function saveSettings(settings: UserSettings): Promise<UserSettings> {
  const { data } = await httpClient.put<UserSettings>('/v1/me/settings', settings)
  return data
}
