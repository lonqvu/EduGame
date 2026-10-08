import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'

/** How far scene backgrounds extend past each side of the 1280-wide stage, for screens wider than 16:9. */
export const BLEED = 640
/** x / width of a shape spanning the stage plus the bleed on both sides. */
export const BLEED_X = -BLEED
export const BLEED_W = 1280 + BLEED * 2

/** Scene background SVG in stage coordinates (0..1280 × 0..720), with room to paint into the side bleed. */
export function SceneSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      width={BLEED_W} height="720" viewBox={`${BLEED_X} 0 ${BLEED_W} 720`}
      className="absolute top-0" style={{ left: BLEED_X }}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const CONFETTI_COLORS = ['#3563E9', '#F28C28', '#2E9E6A', '#8B5CF6', '#FFD15C', '#E5484D', '#FF8FB1']
const CONFETTI = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 137) % 1260,
  w: 8 + (i % 3) * 4,
  h: 10 + (i % 4) * 3,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: ((i * 53) % 90) / 100,
  spin: 360 + ((i * 97) % 360),
}))

/** Paper confetti falling over the whole 1280×720 stage. */
export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {CONFETTI.map((c, i) => (
        <motion.span
          key={i}
          className="absolute -top-6 rounded-[3px]"
          style={{ left: c.x, width: c.w, height: c.h, background: c.color }}
          initial={{ y: 0, rotate: 0 }}
          animate={{ y: 780, rotate: c.spin }}
          transition={{ duration: 2.8, delay: c.delay, ease: [0.3, 0.6, 0.5, 1] }}
        />
      ))}
    </div>
  )
}

interface CountdownProps {
  steps: string[]
  stepMs: number
  left: number
  top: number
  accent: string
  ink: string
}

/** "3, 2, 1, Go!" bubble; each step pops in and shrinks away. */
export function Countdown({ steps, stepMs, left, top, accent, ink }: CountdownProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (index >= steps.length) return
    const t = window.setTimeout(() => setIndex((i) => i + 1), stepMs)
    return () => window.clearTimeout(t)
  }, [index, stepMs, steps.length])

  const label = steps[index]
  return (
    <div className="pointer-events-none absolute flex size-[200px] items-center justify-center" style={{ left, top }}>
      <AnimatePresence>
        {label && (
          <motion.div
            key={index}
            initial={{ scale: 2.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.45, duration: 0.45 }}
            className="absolute box-border flex h-[170px] min-w-[170px] items-center justify-center rounded-full border-8 bg-white px-8 font-display font-extrabold whitespace-nowrap shadow-[0_10px_0_rgba(31,42,68,0.15)]"
            style={{ borderColor: accent, color: ink, fontSize: label.length > 1 ? 64 : 104 }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Gold crown that drops onto the winner. */
export function Crown({ width, left, top }: { width: number; left: number; top: number }) {
  return (
    <motion.svg
      width={width}
      height={width * 0.6}
      viewBox="0 0 80 48"
      className="absolute"
      style={{ left, top }}
      initial={{ y: -60, scale: 0.4, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0.55 }}
      aria-hidden="true"
    >
      <path d="M4 44 L12 8 L28 26 L40 2 L52 26 L68 8 L76 44Z" fill="#F2A900" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" />
    </motion.svg>
  )
}

/** Four-point sparkle that twinkles forever. */
export function Twinkle({ x, y, size, fill, delay = 0 }: { x: number; y: number; size: number; fill: string; delay?: number }) {
  const s = size / 2
  return (
    <motion.path
      d={`M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3}Z`}
      fill={fill}
      style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
      animate={{ scale: [1, 0.5, 1], opacity: [1, 0.4, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  )
}

/** Puffy cartoon cloud drifting sideways. */
export function Cloud({ x, y, scale, drift = 40, duration = 20 }: { x: number; y: number; scale: number; drift?: number; duration?: number }) {
  return (
    <motion.g animate={{ x: [-drift, drift] }} transition={{ duration, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}>
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#FFFFFF">
        <circle cx="0" cy="20" r="26" />
        <circle cx="34" cy="8" r="34" />
        <circle cx="72" cy="20" r="26" />
        <rect x="-26" y="20" width="124" height="26" rx="13" />
      </g>
    </motion.g>
  )
}
