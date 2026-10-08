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

export const HomeIcon = ({ size = 24, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M11.3 2.7a1 1 0 0 1 1.4 0l8.6 8.2c.6.6.2 1.6-.7 1.6H19v7.5a1 1 0 0 1-1 1h-3.5v-6h-5v6H6a1 1 0 0 1-1-1v-7.5H3.4c-.9 0-1.3-1-.7-1.6z" />
  </svg>
)

export const GamepadIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={1.8} {...p}>
    <path d="M7 7h10a5 5 0 0 1 5 5.3l-.3 3.4a2.8 2.8 0 0 1-5 1.4L15 15H9l-1.7 2.1a2.8 2.8 0 0 1-5-1.4L2 12.3A5 5 0 0 1 7 7z" />
    <path d="M7 10v4M5 12h4" />
    <circle cx="15.5" cy="11" r=".6" fill="currentColor" />
    <circle cx="17.5" cy="13" r=".6" fill="currentColor" />
  </StrokeIcon>
)

export const FileTextIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={1.8} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6M9 9h2" />
  </StrokeIcon>
)

export const ChartIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={1.8} {...p}>
    <rect x="3" y="12" width="4" height="8" rx="1.5" />
    <rect x="10" y="4" width="4" height="16" rx="1.5" />
    <rect x="17" y="9" width="4" height="11" rx="1.5" />
  </StrokeIcon>
)

export const SettingsIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={1.8} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </StrokeIcon>
)

export const HelpIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={1.8} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.6-2.8 2.6M12 17h.01" />
  </StrokeIcon>
)

export const BellIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={1.8} {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </StrokeIcon>
)

export const CalendarIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={1.8} {...p}>
    <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
    <path d="M8 2.5v4M16 2.5v4M3 10h18M7.5 14h1M11.5 14h1M15.5 14h1M7.5 17.5h1M11.5 17.5h1" />
  </StrokeIcon>
)

export const ClockIcon = (p: IconProps) => (
  <StrokeIcon strokeWidth={2} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7v5l3.5 2" />
  </StrokeIcon>
)

export const ArrowRightIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </StrokeIcon>
)

export const ChevronDownIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M6 9l6 6 6-6" />
  </StrokeIcon>
)

export const MoreVerticalIcon = ({ size = 24, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
)

export const DocumentIcon = ({ size = 24, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>
    <path d="M6 2.5h8l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4A1.5 1.5 0 0 1 6.5 2.5z" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    <path d="M14 2.5v5h5M8.5 12.5h7M8.5 16h7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
)

export const MenuIcon = (p: IconProps) => (
  <StrokeIcon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </StrokeIcon>
)
