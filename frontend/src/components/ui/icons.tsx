import type { ReactNode, SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number }

function StrokeIcon({ size = 24, strokeWidth = 2.2, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

const STAR_PATH = 'M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z'

export const StarIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2} {...p}>
    <path d={STAR_PATH} />
  </StrokeIcon>
)

/** Star filled with the brand yellow, used for awarded stars. */
export const FilledStarIcon = ({ size = 20, stroke = '#B7860B', fill = '#FFD15C' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
    <path d={STAR_PATH} />
  </svg>
)

export const PlayIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M7 4.5v15l12-7.5z" />
  </StrokeIcon>
)

export const PlusIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2.4} {...p}>
    <path d="M12 5v14M5 12h14" />
  </StrokeIcon>
)

export const UsersIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <circle cx="17.5" cy="9" r="2.5" />
    <path d="M17 14c2.6.2 4.5 2.3 4.5 5" />
  </StrokeIcon>
)

export const ChevronLeftIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </StrokeIcon>
)

export const ChevronRightIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2.4} {...p}>
    <path d="M9 5l7 7-7 7" />
  </StrokeIcon>
)

export const CheckIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2.8} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </StrokeIcon>
)

export const CloseIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2.8} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </StrokeIcon>
)

export const UndoIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </StrokeIcon>
)

export const RefreshIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2.4} {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
    <path d="M20 4v5h-5" />
  </StrokeIcon>
)

export const BoltIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2} {...p}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
  </StrokeIcon>
)

export const MedalIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2} {...p}>
    <circle cx="12" cy="9" r="6" />
    <path d="M8.5 14l-1.5 8 5-3 5 3-1.5-8" />
  </StrokeIcon>
)

export const BulbIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2} {...p}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </StrokeIcon>
)

export const GripIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2.4} {...p}>
    <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" />
  </StrokeIcon>
)

export const EyeIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2} {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </StrokeIcon>
)
