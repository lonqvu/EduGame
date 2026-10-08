import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronLeftIcon } from '@/components/ui/icons'

interface PlayFrameProps {
  title: string
  /** "Câu 2 / 6", "Bộ 1 / 2" */
  progress: string
  /** Extra chips on the right of the header (timer...). */
  extra?: ReactNode
  /** Where "back" leads: the editor of this game. */
  backTo: string
  children: ReactNode
}

/** Projector layout of the question games: header, then the game. */
export function PlayFrame({ title, progress, extra, backTo, children }: PlayFrameProps) {
  return (
    <div className="flex h-full flex-col gap-4 px-9 py-6">
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={backTo}
            aria-label="Quay lại soạn câu hỏi"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ink hover:text-primary-ink"
          >
            <ChevronLeftIcon size={22} />
          </Link>
          <h1 className="m-0 truncate font-display text-[26px] font-extrabold">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {extra}
          <span className="rounded-full bg-white px-4 py-1.5 text-lg font-extrabold">{progress}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

/** Projector message when a game has nothing playable yet. */
export function NothingToPlay({ message, backTo }: { message: string; backTo: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-12 text-center">
      <span className="font-display text-[44px] leading-tight font-extrabold">{message}</span>
      <Link
        to={backTo}
        className="flex h-[60px] items-center rounded-full bg-primary px-8 text-[20px] font-extrabold text-white hover:text-white hover:brightness-110"
      >
        Mở trình soạn
      </Link>
    </div>
  )
}

export const playButtonClass =
  'flex h-14 cursor-pointer items-center gap-2 rounded-full border-0 px-6 font-[inherit] text-lg font-extrabold disabled:cursor-not-allowed disabled:opacity-50'
