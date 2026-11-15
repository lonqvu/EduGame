/**
 * The background of a game screen that paints its own scenery, drawn past the 1280×720 stage (the stage does not
 * clip) so a screen wider or taller than 16:9 has no bars: `band` (a vertical gradient class) across the stage's
 * height and far to both sides, plain `above` over it and plain `below` under it. Put first in a `relative isolate`
 * screen.
 */
export function StageBackdrop({ band, above, below }: { band: string; above: string; below: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className={`absolute inset-y-0 -right-[3000px] -left-[3000px] ${band}`} />
      {/* 2 px under the band, so no seam shows once the stage is scaled. */}
      <div className="absolute -right-[3000px] bottom-[calc(100%-2px)] -left-[3000px] h-[3000px]" style={{ background: above }} />
      <div className="absolute top-[calc(100%-2px)] -right-[3000px] -left-[3000px] h-[3000px]" style={{ background: below }} />
    </div>
  )
}
