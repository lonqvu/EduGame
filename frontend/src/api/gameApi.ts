import * as guestGameApi from '@/api/guestGameApi'
import { httpClient } from '@/api/httpClient'
import { isGuest } from '@/store/authStore'
import type {
  CreateGameItemRequest,
  CreateGameRequest,
  GameResponse,
  GameSummaryResponse,
  UpdateGameItemRequest,
  UpdateGameRequest,
} from '@/types/api'
import type { GameType } from '@/types/game'

// Nobody signed in: every call goes to the games of this tab instead (guestGameApi), nothing reaches the server.

const gamePath = (code: string) => `/v1/games/${encodeURIComponent(code)}`

export async function listGames(): Promise<GameSummaryResponse[]> {
  if (isGuest()) return guestGameApi.listGames()
  const { data } = await httpClient.get<GameSummaryResponse[]>('/v1/games')
  return data
}

export async function createGame(request: CreateGameRequest): Promise<GameResponse> {
  if (isGuest()) return guestGameApi.createGame(request)
  const { data } = await httpClient.post<GameResponse>('/v1/games', request)
  return data
}

/** "Chơi ngay": the teacher's sample game of this type, made from the built-in sample content the first time. */
export async function playSample(templateCode: GameType): Promise<GameResponse> {
  if (isGuest()) return guestGameApi.playSample(templateCode)
  const { data } = await httpClient.post<GameResponse>('/v1/games/samples', { templateCode })
  return data
}

/** The version being edited (draft if any, else the last published). */
export async function getGame(code: string): Promise<GameResponse> {
  if (isGuest()) return guestGameApi.getGame(code)
  const { data } = await httpClient.get<GameResponse>(gamePath(code))
  return data
}

/** Like getGame, but creates the draft now if the game is published, so item ids stay stable while editing. */
export async function openDraft(code: string): Promise<GameResponse> {
  if (isGuest()) return guestGameApi.openDraft(code)
  const { data } = await httpClient.post<GameResponse>(`${gamePath(code)}/draft`)
  return data
}

export async function updateGame(code: string, request: UpdateGameRequest): Promise<GameResponse> {
  if (isGuest()) return guestGameApi.updateGame(code, request)
  const { data } = await httpClient.patch<GameResponse>(gamePath(code), request)
  return data
}

/** Soft delete: the game leaves the library. */
export async function archiveGame(code: string): Promise<void> {
  if (isGuest()) return guestGameApi.archiveGame(code)
  await httpClient.delete(gamePath(code))
}

export async function addItems(code: string, items: CreateGameItemRequest[]): Promise<GameResponse> {
  if (isGuest()) return guestGameApi.addItems(code, items)
  const { data } = await httpClient.post<GameResponse>(`${gamePath(code)}/items`, { items })
  return data
}

export async function updateItem(code: string, itemId: number, request: UpdateGameItemRequest): Promise<GameResponse> {
  if (isGuest()) return guestGameApi.updateItem(code, itemId, request)
  const { data } = await httpClient.patch<GameResponse>(`${gamePath(code)}/items/${itemId}`, request)
  return data
}

export async function deleteItem(code: string, itemId: number): Promise<GameResponse> {
  if (isGuest()) return guestGameApi.deleteItem(code, itemId)
  const { data } = await httpClient.delete<GameResponse>(`${gamePath(code)}/items/${itemId}`)
  return data
}

export async function reorderItems(code: string, itemIds: number[]): Promise<GameResponse> {
  if (isGuest()) return guestGameApi.reorderItems(code, itemIds)
  const { data } = await httpClient.put<GameResponse>(`${gamePath(code)}/items/order`, { itemIds })
  return data
}
