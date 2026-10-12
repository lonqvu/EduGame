import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ChevronLeftIcon } from '@/components/ui/icons'

interface ToolFrameProps {
  title: string
  subtitle?: string
  /** Controls on the right of the header. */
  actions?: ReactNode
  children: ReactNode
}

/** Projector layout of a classroom tool: title, back button, then the tool. */
export function ToolFrame({ title, subtitle, actions, children }: ToolFrameProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))
  return (
    <div className="flex h-full flex-col gap-5 px-10 py-7">
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            type="button"
            onClick={goBack}
            aria-label="Quay lại"
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-ink hover:text-primary-ink"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <div className="flex min-w-0 flex-col">
            <h1 className="m-0 truncate font-display text-[30px] leading-tight font-extrabold">{title}</h1>
            {subtitle && <span className="text-lg text-ink-soft">{subtitle}</span>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export const toolButtonClass =
  'flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-7 font-[inherit] text-lg font-extrabold disabled:cursor-not-allowed disabled:opacity-50'
