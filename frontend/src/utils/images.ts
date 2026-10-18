import { env } from '@/utils/env'

/**
 * Images for questions: checked and shrunk in the browser before upload, so a 12 MB phone photo goes up as a few
 * hundred KB and shows at once on the projector. The server checks the file again (see GameAssetService).
 */

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const

/** Same limit as the server. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Longest side kept: sharp on a projector, far smaller than a phone photo. */
export const MAX_IMAGE_EDGE = 1600

/** Below this size an image that already fits is sent as it is. */
const SMALL_ENOUGH_BYTES = 1024 * 1024

export class ImageFileError extends Error {}

const isAccepted = (type: string) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)

/**
 * Why this file cannot be used, or null. GIFs are sent as they are (shrinking would stop their animation), so
 * only they can be too big; other images are shrunk first.
 */
export function imageFileProblem(file: { type: string; size: number }): string | null {
  if (!isAccepted(file.type)) {
    return file.type === 'image/heic' || file.type === 'image/heif'
      ? 'Ảnh HEIC của iPhone chưa dùng được. Cô chọn ảnh JPG hoặc PNG nhé.'
      : 'Cô chọn ảnh PNG, JPG, GIF hoặc WEBP nhé.'
  }
  if (file.size === 0) return 'File ảnh này bị trống.'
  if (file.type === 'image/gif' && file.size > MAX_IMAGE_BYTES) return 'Ảnh GIF quá lớn (tối đa 5 MB).'
  return null
}

/** The size to redraw the image at, or null to send it as it is. */
export function resizeTarget(width: number, height: number, bytes: number): { width: number; height: number } | null {
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height))
  if (scale === 1 && bytes <= SMALL_ENOUGH_BYTES) return null
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** "IMG_001.jpeg" → "IMG_001.webp". */
export function withExtension(name: string, extension: string): string {
  const base = name.replace(/\.[^./\\]*$/, '') || 'anh'
  return `${base}.${extension}`
}

/**
 * The file to upload: checked, and shrunk to MAX_IMAGE_EDGE when bigger (as WebP, or JPEG/PNG where the browser
 * cannot write WebP). Throws ImageFileError with a message for the teacher.
 */
export async function prepareImage(file: File): Promise<File> {
  const problem = imageFileProblem(file)
  if (problem) throw new ImageFileError(problem)
  if (file.type === 'image/gif') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageFileError('Không đọc được ảnh này. Cô thử chọn ảnh khác nhé.')
  }
  try {
    const target = resizeTarget(bitmap.width, bitmap.height, file.size)
    if (!target) return file
    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, target.width, target.height)
    const blob = (await toBlob(canvas, 'image/webp')) ?? (await toBlob(canvas, file.type === 'image/png' ? 'image/png' : 'image/jpeg'))
    // A browser without WebP output answers with PNG; keep whichever is smaller than the original.
    if (!blob || blob.size >= file.size) {
      if (file.size > MAX_IMAGE_BYTES) throw new ImageFileError('Ảnh quá lớn (tối đa 5 MB).')
      return file
    }
    const extension = blob.type.split('/')[1] === 'jpeg' ? 'jpg' : blob.type.split('/')[1]
    return new File([blob], withExtension(file.name, extension), { type: blob.type })
  } finally {
    bitmap.close()
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob && blob.type === type ? blob : null), type, 0.85))
}

/**
 * Where to load an image from. Uploaded images are stored as `/api/v1/assets/…` (independent of the host), and
 * the API may be on another origin than the app (http://localhost:8080 in development).
 */
export function assetSrc(url: string): string
export function assetSrc(url: string | undefined): string | undefined
export function assetSrc(url: string | undefined): string | undefined {
  if (!url?.startsWith('/api/')) return url
  try {
    return new URL(url, new URL(env.apiBaseUrl).origin).href
  } catch {
    // A relative API base ("/api" behind a reverse proxy): same origin as the app.
    return url
  }
}
