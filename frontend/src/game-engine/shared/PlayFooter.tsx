import type { ReactNode } from 'react'
import { ChevronRightIcon, EyeIcon } from '@/components/ui/icons'
import { playButtonClass } from '@/game-engine/shared/PlayFrame'
import { useSound } from '@/sound/useSound'

interface PlayFooterProps {
  /** What happens now, for the class and the teacher. */
  message: ReactNode
  /** "Hiện đáp án" is offered while the answer is hidden. */
  revealed: boolean
  onReveal?: () => void
  onFinish: () => void
  onNext: () => void
  nextLabel: string
  /** "Next" waits for the answer to be shown unless told otherwise. */
  nextDisabled?: boolean
  /** The row starts at the left edge of the screen, under the sound and rules buttons: leave them room. */
  clearCorner?: boolean
}

/** The bottom row of a question game: what to do now, then "Hiện đáp án", "Kết thúc" and the next step. */
export function PlayFooter({
  message,
  revealed,
  onReveal,
  onFinish,
  onNext,
  nextLabel,
  nextDisabled = !revealed,
  clearCorner = true,
}: PlayFooterProps) {
  const sound = useSound()
  return (
    <div className="mt-auto flex items-center justify-between gap-4">
      <span className={`text-lg leading-tight font-extrabold text-ink-soft ${clearCorner ? 'pl-[76px]' : ''}`}>{message}</span>
      <div className="flex shrink-0 gap-3">
        {!revealed && onReveal && (
          <button
            type="button"
            onClick={() => {
              sound.play('reveal')
              onReveal()
            }}
            className={`${playButtonClass} bg-sun-soft text-ink`}
          >
            <EyeIcon size={22} />
            Hiện đáp án
          </button>
        )}
        <button type="button" onClick={onFinish} className={`${playButtonClass} bg-white text-ink`}>
          Kết thúc
        </button>
        <button type="button" disabled={nextDisabled} onClick={onNext} className={`${playButtonClass} bg-primary text-white hover:brightness-110`}>
          {nextLabel}
          <ChevronRightIcon size={20} />
        </button>
      </div>
    </div>
  )
}
