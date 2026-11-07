import { ConfigProvider } from 'antd'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { SoundStage } from '@/sound/SoundStage'

const STAGE_WIDTH = 1280
const STAGE_HEIGHT = 720

interface ProjectorStageProps {
  /** Background image of the stage, e.g. a projector SVG; omit when the screen draws its own. */
  background?: string
  /** Background music while the screen is open (games; not the classroom tools). */
  music?: boolean
  children: ReactNode
}

/** Narrower than this and held upright: a phone, where the stage turns a quarter to fill the screen. */
const PHONE_WIDTH = 700

/**
 * A phone held upright. From the screen's orientation where the browser tells it, not the window's shape: the
 * on-screen keyboard makes the window wide for a while, and the stage would turn back and forth while typing.
 */
function phoneUpright(width: number) {
  if (width >= PHONE_WIDTH) return false
  const type = typeof screen !== 'undefined' ? screen.orientation?.type : undefined
  return type ? type.startsWith('portrait') : window.innerHeight > window.innerWidth
}

/** The scale of the stage in a box, and whether it turns (a phone held upright). */
function fit(width: number, height: number) {
  const turned = phoneUpright(width)
  return turned
    ? { turned, scale: Math.min(height / STAGE_WIDTH, width / STAGE_HEIGHT) }
    : { turned, scale: Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT) }
}

/**
 * Fixed 1280×720 canvas scaled to fit the window, so projector screens keep
 * the same layout on any classroom screen. The canvas does not clip: the
 * background covers the whole window and scenes may paint past the canvas
 * edges (see SceneSvg), so screens wider than 16:9 have no empty bars. Sounds are heard on the stage only.
 *
 * On a phone held upright the 16:9 stage would fill a third of the screen: it turns a quarter instead, to be read
 * with the phone on its side (with rotation locked too); once the phone turns the page, it is straight again. Dialogs
 * open on the stage then, so they turn with it.
 */
export function ProjectorStage({ background, music, children }: ProjectorStageProps) {
  const [{ scale, turned }, setFit] = useState(() => fit(window.innerWidth, window.innerHeight))
  const box = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const turnedRef = useRef(turned)
  useEffect(() => {
    turnedRef.current = turned
  }, [turned])
  const popupContainer = useCallback(() => (turnedRef.current && stage.current) || document.body, [])

  // Fit the box the stage really has, not the window: an overlay put in full screen (the rules show) can be sized
  // differently from what the window reports, and its new size can land after the window's resize event.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setFit(fit(width, height))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={box}
      className="relative h-dvh w-full overflow-hidden bg-ink bg-cover bg-center"
      style={{ backgroundImage: background ? `url(${background})` : undefined }}
    >
      <div
        ref={stage}
        className="absolute top-1/2 left-1/2 text-ink"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `translate(-50%, -50%) ${turned ? 'rotate(90deg) ' : ''}scale(${scale})`,
        }}
      >
        <ConfigProvider getPopupContainer={popupContainer}>
          <SoundStage music={music}>{children}</SoundStage>
        </ConfigProvider>
      </div>
    </div>
  )
}

export const PROJECTOR_BOARD_BG = '/assets/backgrounds/projector-board.svg'
export const PROJECTOR_RESULTS_BG = '/assets/backgrounds/projector-results.svg'
