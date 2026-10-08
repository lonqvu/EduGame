import { httpClient } from '@/api/httpClient'
import type { GameTemplateResponse } from '@/types/api'

/** Templates a teacher can pick, in menu order. */
export async function listTemplates(): Promise<GameTemplateResponse[]> {
  const { data } = await httpClient.get<GameTemplateResponse[]>('/v1/game-templates')
  return data
}
