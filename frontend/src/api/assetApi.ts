import { httpClient } from '@/api/httpClient'
import type { AssetResponse } from '@/types/api'

interface UploadOptions {
  /** 0–1, as the file goes up. */
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/** Uploads an image for a question of the game; the question then keeps the returned `url`. */
export async function uploadGameImage(gameCode: string, file: File, { onProgress, signal }: UploadOptions = {}): Promise<AssetResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await httpClient.post<AssetResponse>(`/v1/games/${encodeURIComponent(gameCode)}/assets`, form, {
    // Not the client's JSON default: the browser sets the multipart boundary.
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
    signal,
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(e.loaded / e.total)
    },
  })
  return data
}
