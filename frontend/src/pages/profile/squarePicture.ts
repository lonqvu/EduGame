import { AVATAR_SIDE, centreSquare } from '@/utils/profile'

/**
 * The centre square of a picture file as a JPEG of at most AVATAR_SIDE px: what is uploaded, a few dozen KB whatever
 * the phone photo was (the backend checks and re-encodes it again). Rejects when the browser cannot read the file.
 */
export async function squarePicture(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const { x, y, side } = centreSquare(bitmap.width, bitmap.height)
    const out = Math.min(AVATAR_SIDE, side)
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2D canvas')
    // A transparent PNG goes on white, as the backend does.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, out, out)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, x, y, side, side, 0, 0, out, out)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('JPEG encoding failed'))), 'image/jpeg', 0.9),
    )
  } finally {
    bitmap.close()
  }
}
