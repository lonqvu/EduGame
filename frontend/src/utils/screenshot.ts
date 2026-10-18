import { SKIP_IN_SCREENSHOT } from '@/utils/feedback'

const TIMEOUT_MS = 15_000
/** Images that cannot be read (another site without CORS) are drawn empty instead of failing the screenshot. */
const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/**
 * A picture of what the teacher sees now: the app (#root) as it is scrolled, without dialogs (they live outside it)
 * nor the feedback button. Drawn in the browser (html-to-image, loaded on first use); web fonts are skipped so it
 * stays fast, the page is drawn with the system font. Rejects when the browser cannot draw it.
 */
export async function captureScreen(): Promise<File> {
  const root = document.getElementById('root')
  if (!root) throw new Error('No app to capture')
  const { toBlob } = await import('html-to-image')
  const capture = toBlob(root, {
    width: window.innerWidth,
    height: window.innerHeight,
    // The part of the page on screen.
    style: { transform: `translate(${-window.scrollX}px, ${-window.scrollY}px)`, transformOrigin: 'top left' },
    pixelRatio: 1,
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
    skipFonts: true,
    imagePlaceholder: EMPTY_IMAGE,
    filter: (node) => !(node instanceof Element && node.hasAttribute(SKIP_IN_SCREENSHOT)),
  })
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Screenshot timed out')), TIMEOUT_MS))
  const blob = await Promise.race([capture, timeout])
  if (!blob) throw new Error('Screenshot failed')
  return new File([blob], 'man-hinh.png', { type: blob.type || 'image/png' })
}
