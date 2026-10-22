import type { ReactNode } from 'react'
import { playButtonClass } from '@/game-engine/shared/PlayFrame'

/** Bottom row of a turn board between two questions: whose turn it is, and "Kết thúc". */
export function BoardFooter({ message, onFinish, children }: { message: ReactNode; onFinish: () => void; children?: ReactNode }) {
  return (
    <div className="mt-auto flex items-center justify-between gap-4">
      {/* Room for the sound and rules buttons in the corner. */}
      <span className="pl-[76px] text-xl font-extrabold text-ink">{message}</span>
      <div className="flex shrink-0 gap-3">
        {children}
        <button type="button" onClick={onFinish} className={`${playButtonClass} bg-white text-ink`}>
          Kết thúc
        </button>
      </div>
    </div>
  )
}
