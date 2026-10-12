import { PauseIcon } from '@/components/ui/icons'
import type { ClassroomStatus } from '@/types/api'
import { AVATAR_NAMES, avatarSrc, STATUS_LABELS, type ClassAvatar } from '@/utils/classrooms'

/** Illustrations of the class pages (scripts/make_class_art.py). */
export const CLASS_ASSETS = '/assets/classes'

/** The animal of a class, on its pastel tile. Decorative: the class name is always next to it. */
export function AnimalAvatar({ avatar, size = 56, className = '' }: { avatar: ClassAvatar; size?: number; className?: string }) {
  return (
    <img
      src={avatarSrc(avatar)}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`block shrink-0 rounded-[16px] select-none ${className}`}
    />
  )
}

/** "Đang hoạt động" (green dot) or "Tạm ngưng" (grey, pause sign). */
export function StatusChip({ status }: { status: ClassroomStatus }) {
  return status === 'ACTIVE' ? (
    <span className="inline-flex h-7 w-fit items-center gap-1.5 rounded-full bg-[#E3F6EA] px-3 text-[13px] font-bold whitespace-nowrap text-success">
      <span aria-hidden="true" className="size-2 rounded-full bg-[#2E9E6A]" />
      {STATUS_LABELS.ACTIVE}
    </span>
  ) : (
    <span className="inline-flex h-7 w-fit items-center gap-1 rounded-full bg-chip px-3 text-[13px] font-bold whitespace-nowrap text-ink-muted">
      <PauseIcon size={13} />
      {STATUS_LABELS.PAUSED}
    </span>
  )
}

/** Avatars to pick from, as radio buttons with the animals' names. */
export function AvatarPicker({
  value,
  onChange,
  options,
}: {
  value?: ClassAvatar
  onChange?: (avatar: ClassAvatar) => void
  options: readonly ClassAvatar[]
}) {
  return (
    <div role="radiogroup" aria-label="Biểu tượng lớp" className="flex flex-wrap gap-2.5">
      {options.map((avatar) => {
        const checked = avatar === value
        return (
          <button
            key={avatar}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={AVATAR_NAMES[avatar]}
            title={AVATAR_NAMES[avatar]}
            onClick={() => onChange?.(avatar)}
            className={`cursor-pointer rounded-[18px] border-[3px] bg-transparent p-0.5 transition ${
              checked ? 'border-primary' : 'border-transparent hover:border-line'
            }`}
          >
            <AnimalAvatar avatar={avatar} size={48} className="rounded-[13px]" />
          </button>
        )
      })}
    </div>
  )
}
