import { beforeEach, describe, expect, it, vi } from 'vitest'

/** A browser document: full screen allowed or not, and what the app asked of it. */
function stubDocument({ enabled = true, refuse = false } = {}) {
  const doc = {
    fullscreenElement: null as object | null,
    fullscreenEnabled: enabled,
    documentElement: {
      requestFullscreen: vi.fn(async () => {
        if (refuse) throw new TypeError('Permissions check failed')
        doc.fullscreenElement = doc.documentElement
      }),
    },
    exitFullscreen: vi.fn(async () => {
      doc.fullscreenElement = null
    }),
  }
  vi.stubGlobal('document', doc)
  return doc
}

async function freshModule() {
  vi.resetModules()
  return import('@/utils/fullscreen')
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => vi.unstubAllGlobals())

describe('full screen for the projector', () => {
  it('enters full screen, and leaves it on the way back to the teacher screens', async () => {
    const doc = stubDocument()
    const { enterFullscreen, leaveAppFullscreen } = await freshModule()

    enterFullscreen()
    await settle()
    expect(doc.fullscreenElement).not.toBeNull()

    leaveAppFullscreen()
    await settle()
    expect(doc.exitFullscreen).toHaveBeenCalledOnce()
    expect(doc.fullscreenElement).toBeNull()
  })

  it('never leaves a full screen the teacher entered', async () => {
    const doc = stubDocument()
    doc.fullscreenElement = {}
    const { enterFullscreen, leaveAppFullscreen } = await freshModule()

    enterFullscreen()
    leaveAppFullscreen()
    await settle()
    expect(doc.documentElement.requestFullscreen).not.toHaveBeenCalled()
    expect(doc.exitFullscreen).not.toHaveBeenCalled()
  })

  it('does nothing where full screen is not allowed', async () => {
    const doc = stubDocument({ enabled: false })
    const { enterFullscreen } = await freshModule()
    enterFullscreen()
    expect(doc.documentElement.requestFullscreen).not.toHaveBeenCalled()
  })

  it('a refused request just opens the game in the window', async () => {
    const doc = stubDocument({ refuse: true })
    const { enterFullscreen, leaveAppFullscreen } = await freshModule()
    enterFullscreen()
    await settle()
    leaveAppFullscreen()
    expect(doc.exitFullscreen).not.toHaveBeenCalled()
  })

  it('knows the projector and tool screens', async () => {
    const { isProjectorPath } = await freshModule()
    expect(isProjectorPath('/play/g-quiz-vn')).toBe(true)
    expect(isProjectorPath('/play/g-1/tiles/3')).toBe(true)
    expect(isProjectorPath('/tools/wheel')).toBe(true)
    expect(isProjectorPath('/games/g-1/start')).toBe(false)
    expect(isProjectorPath('/settings')).toBe(false)
    expect(isProjectorPath('/player')).toBe(false)
  })
})
