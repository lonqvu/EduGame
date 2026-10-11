import { StarIcon } from '@/components/ui/icons'

/** Yellow star badge + "EduGame". */
export function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <span className="flex items-center gap-3 text-ink">
      <span
        className="flex items-center justify-center rounded-[12px] bg-sun shadow-[0_2px_0_#E9B93C]"
        style={{ width: size, height: size }}
      >
        <StarIcon size={Math.round(size * 0.55)} strokeWidth={2.2} />
      </span>
      <span className="font-black tracking-[-0.01em]" style={{ fontSize: Math.round(size * 0.56) }}>
        EduGame
      </span>
    </span>
  )
}
