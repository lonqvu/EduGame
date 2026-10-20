/** Star logo + "Lớp vui". */
export function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <span className="flex items-center gap-3 text-ink">
      <img src="/assets/logo/logo-192.png" alt="" width={size} height={size} className="shrink-0" />
      <span className="font-black tracking-[-0.01em]" style={{ fontSize: Math.round(size * 0.56) }}>
        Lớp vui
      </span>
    </span>
  )
}
