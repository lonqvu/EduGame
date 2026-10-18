import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/env', () => ({ env: { apiBaseUrl: 'http://localhost:8080/api' } }))

const { assetSrc, imageFileProblem, MAX_IMAGE_BYTES, MAX_IMAGE_EDGE, resizeTarget, withExtension } = await import('@/utils/images')

const MB = 1024 * 1024

describe('imageFileProblem', () => {
  it('accepts the four kinds of picture the server takes', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
      expect(imageFileProblem({ type, size: 200_000 })).toBeNull()
    }
  })

  it('refuses other files with a message for the teacher', () => {
    expect(imageFileProblem({ type: 'image/svg+xml', size: 1000 })).toBe('Cô chọn ảnh PNG, JPG, GIF hoặc WEBP nhé.')
    expect(imageFileProblem({ type: 'application/pdf', size: 1000 })).toBe('Cô chọn ảnh PNG, JPG, GIF hoặc WEBP nhé.')
    expect(imageFileProblem({ type: '', size: 1000 })).toBe('Cô chọn ảnh PNG, JPG, GIF hoặc WEBP nhé.')
  })

  it('explains iPhone HEIC photos', () => {
    expect(imageFileProblem({ type: 'image/heic', size: 2 * MB })).toMatch(/HEIC/)
    expect(imageFileProblem({ type: 'image/heif', size: 2 * MB })).toMatch(/HEIC/)
  })

  it('refuses an empty file', () => {
    expect(imageFileProblem({ type: 'image/png', size: 0 })).toBe('File ảnh này bị trống.')
  })

  it('lets a big photo through, since it is shrunk, but not a big GIF, which is sent as it is', () => {
    expect(imageFileProblem({ type: 'image/jpeg', size: 12 * MB })).toBeNull()
    expect(imageFileProblem({ type: 'image/gif', size: MAX_IMAGE_BYTES })).toBeNull()
    expect(imageFileProblem({ type: 'image/gif', size: MAX_IMAGE_BYTES + 1 })).toBe('Ảnh GIF quá lớn (tối đa 5 MB).')
  })
})

describe('resizeTarget', () => {
  it('leaves a small image alone', () => {
    expect(resizeTarget(800, 600, 300_000)).toBeNull()
    expect(resizeTarget(MAX_IMAGE_EDGE, MAX_IMAGE_EDGE, MB)).toBeNull()
  })

  it('shrinks a phone photo to the longest side kept, landscape or portrait', () => {
    expect(resizeTarget(4032, 3024, 4 * MB)).toEqual({ width: 1600, height: 1200 })
    expect(resizeTarget(3024, 4032, 4 * MB)).toEqual({ width: 1200, height: 1600 })
  })

  it('re-encodes an image that fits but is heavy, at the same size', () => {
    expect(resizeTarget(1200, 900, 3 * MB)).toEqual({ width: 1200, height: 900 })
  })

  it('never goes below one pixel for a very thin image', () => {
    expect(resizeTarget(10_000, 2, 500_000)).toEqual({ width: 1600, height: 1 })
  })
})

describe('withExtension', () => {
  it('swaps the extension', () => {
    expect(withExtension('IMG_0001.jpeg', 'webp')).toBe('IMG_0001.webp')
    expect(withExtension('con.meo.PNG', 'jpg')).toBe('con.meo.jpg')
  })

  it('adds one when there is none, and names a nameless file', () => {
    expect(withExtension('anh-chup', 'webp')).toBe('anh-chup.webp')
    expect(withExtension('', 'webp')).toBe('anh.webp')
    expect(withExtension('.png', 'webp')).toBe('anh.webp')
  })
})

describe('assetSrc', () => {
  it('loads uploaded images from the API host', () => {
    expect(assetSrc('/api/v1/assets/abc.png')).toBe('http://localhost:8080/api/v1/assets/abc.png')
  })

  it('leaves other images as they are', () => {
    expect(assetSrc('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(assetSrc('/assets/home/hero.png')).toBe('/assets/home/hero.png')
    expect(assetSrc('blob:http://localhost:5173/1234')).toBe('blob:http://localhost:5173/1234')
    expect(assetSrc(undefined)).toBeUndefined()
  })

  it('keeps them relative when the API is on the app\'s own origin ("/api" behind a reverse proxy)', async () => {
    vi.resetModules()
    vi.doMock('@/utils/env', () => ({ env: { apiBaseUrl: '/api' } }))
    const sameOrigin = await import('@/utils/images')
    expect(sameOrigin.assetSrc('/api/v1/assets/abc.png')).toBe('/api/v1/assets/abc.png')
  })
})
