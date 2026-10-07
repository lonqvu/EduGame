import { useEffect, useState, type ReactNode } from 'react'

const STAGE_WIDTH = 1280
const STAGE_HEIGHT = 720

interface ProjectorStageProps {
  /** Background image of the stage, e.g. a projector SVG; omit when the screen draws its own. */
  background?: string
  /** Backdrop class drawn by CSS instead of an image, e.g. `stage-paper`. */
  backdrop?: string
  children: ReactNode
}

function fitScale() {
  return Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT)
}

/**
 * Fixed 1280×720 canvas scaled to fit the window, so projector screens keep
 * the same layout on any classroom screen.
 */
export function ProjectorStage({ background, backdrop, children }: ProjectorStageProps) {
  const [scale, setScale] = useState(fitScale)

  useEffect(() => {
    const onResize = () => setScale(fitScale())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="flex h-dvh w-full items-center justify-center overflow-hidden bg-ink">
      <div style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }}>
        <div
          className={`relative origin-top-left overflow-hidden bg-cover bg-center text-ink ${backdrop ?? ''}`}
          style={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transform: `scale(${scale})`,
            backgroundImage: background ? `url(${background})` : undefined,
          }}
        >
          {children}
          <div className="stage-grain" aria-hidden />
        </div>
      </div>
    </div>
  )
}

export const PROJECTOR_BOARD_BG = '/assets/backgrounds/projector-board.svg'
