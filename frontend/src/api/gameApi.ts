import { httpClient } from '@/api/httpClient'
import type {
  CreateGameItemRequest,
  CreateGameRequest,
  GameResponse,
  GameSummaryResponse,
  UpdateGameItemRequest,
  UpdateGameRequest,
} from '@/types/api'

const gamePath = (code: string) => `/v1/games/${encodeURIComponent(code)}`

export async function listGames(): Promise<GameSummaryResponse[]> {
  const { data } = await httpClient.get<GameSummaryResponse[]>('/v1/games')
  return data
}

export async function createGame(request: CreateGameRequest): Promise<GameResponse> {
  const { data } = await httpClient.post<GameResponse>('/v1/games', request)
  return data
}

/** The version being edited (draft if any, else the last published). */
export async function getGame(code: string): Promise<GameResponse> {
  const { data } = await httpClient.get<GameResponse>(gamePath(code))
  return data
}

/** Like getGame, but creates the draft now if the game is published, so item ids stay stable while editing. */
export async function openDraft(code: string): Promise<GameResponse> {
  const { data } = await httpClient.post<GameResponse>(`${gamePath(code)}/draft`)
  return data
}

export async function updateGame(code: string, request: UpdateGameRequest): Promise<GameResponse> {
  const { data } = await httpClient.patch<GameResponse>(gamePath(code), request)
  return data
}

/** Soft delete: the game leaves the library. */
export async function archiveGame(code: string): Promise<void> {
  await httpClient.delete(gamePath(code))
}

export async function addItems(code: string, items: CreateGameItemRequest[]): Promise<GameResponse> {
  const { data } = await httpClient.post<GameResponse>(`${gamePath(code)}/items`, { items })
  return data
}

export async function updateItem(code: string, itemId: number, request: UpdateGameItemRequest): Promise<GameResponse> {
  const { data } = await httpClient.patch<GameResponse>(`${gamePath(code)}/items/${itemId}`, request)
  return data
}

export async function deleteItem(code: string, itemId: number): Promise<GameResponse> {
  const { data } = await httpClient.delete<GameResponse>(`${gamePath(code)}/items/${itemId}`)
  return data
}

export async function reorderItems(code: string, itemIds: number[]): Promise<GameResponse> {
  const { data } = await httpClient.put<GameResponse>(`${gamePath(code)}/items/order`, { itemIds })
  return data
}
