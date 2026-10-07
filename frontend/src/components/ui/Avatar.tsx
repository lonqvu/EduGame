import { avatarTint, initialOf } from '@/utils/gameAssets'

interface AvatarProps {
  name: string
  size?: number
  tint?: string
  className?: string
}

/** Round pastel avatar with the person's initial. */
export function Avatar({ name, size = 40, tint, className = '' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold text-ink ${className}`}
      style={{ width: size, height: size, background: tint ?? avatarTint(name), fontSize: size * 0.45 }}
    >
      {initialOf(name)}
    </span>
  )
}
