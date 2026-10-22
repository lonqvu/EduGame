import { useEffect, useRef, useState, type ReactNode } from 'react'
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

function fitScale() {
  return Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT)
}

/**
 * Fixed 1280×720 canvas scaled to fit the window, so projector screens keep
 * the same layout on any classroom screen. The canvas does not clip: the
 * background covers the whole window and scenes may paint past the canvas
 * edges (see SceneSvg), so screens wider than 16:9 have no empty bars. Sounds are heard on the stage only.
 */
export function ProjectorStage({ background, music, children }: ProjectorStageProps) {
  const [scale, setScale] = useState(fitScale)
  const box = useRef<HTMLDivElement>(null)

  // Fit the box the stage really has, not the window: an overlay put in full screen (the rules show) can be sized
  // differently from what the window reports, and its new size can land after the window's resize event.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setScale(Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT))
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
        className="absolute top-1/2 left-1/2 text-ink"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <SoundStage music={music}>{children}</SoundStage>
      </div>
    </div>
  )
}

export const PROJECTOR_BOARD_BG = '/assets/backgrounds/projector-board.svg'
export const PROJECTOR_RESULTS_BG = '/assets/backgrounds/projector-results.svg'
