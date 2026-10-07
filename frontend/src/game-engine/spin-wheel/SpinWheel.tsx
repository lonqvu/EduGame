import { motion } from 'motion/react'

const SEGMENT_COLORS = ['#FFD15C', '#BFD3FF', '#FFC3A8', '#BDEBD3', '#E3D5FF', '#FFE6A3', '#CFE3FF', '#FFD0D8']
const C = 250
const R = 236
const SPIN_DURATION_S = 4.2

interface SpinWheelProps {
  labels: string[]
  /** Clockwise rotation in degrees; animate by increasing it. */
  rotation: number
  onSpinEnd: () => void
}

/** Point on the wheel at `deg` clockwise from 12 o'clock. */
function point(deg: number, radius = R) {
  const rad = (deg * Math.PI) / 180
  return `${(C + radius * Math.sin(rad)).toFixed(1)} ${(C - radius * Math.cos(rad)).toFixed(1)}`
}

export function SpinWheel({ labels, rotation, onSpinEnd }: SpinWheelProps) {
  const count = Math.max(labels.length, 1)
  const seg = 360 / count
  const fontSize = count <= 8 ? 22 : Math.max(11, Math.round((22 * 8) / count))

  return (
    <div className="relative h-[600px] w-[560px] shrink-0">
      <motion.div
        className="absolute top-10 left-2.5 size-[540px]"
        initial={false}
        animate={{ rotate: rotation }}
        transition={{ duration: SPIN_DURATION_S, ease: [0.12, 0.8, 0.2, 1] }}
        onAnimationComplete={onSpinEnd}
      >
        <svg width="540" height="540" viewBox="0 0 500 500" aria-hidden="true">
          <circle cx={C} cy={C} r={246} fill="#FFFFFF" />
          {labels.length <= 1 ? (
            <circle cx={C} cy={C} r={R} fill={SEGMENT_COLORS[0]} />
          ) : (
            labels.map((_, i) => (
              <path
                key={i}
                d={`M${C} ${C} L${point(i * seg)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${point((i + 1) * seg)} Z`}
                fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                stroke="#FFFFFF"
                strokeWidth={count > 16 ? 2 : 4}
              />
            ))
          )}
          {labels.map((label, i) => {
            const mid = (i + 0.5) * seg
            // Names on the left half are flipped so they never read upside down.
            const flip = mid > 180
            const offset = labels.length <= 1 ? 0 : flip ? -145 : 145
            return (
              <text
                key={i}
                x={C}
                y={C}
                transform={`rotate(${mid + (flip ? 90 : -90)} ${C} ${C}) translate(${offset} 0)`}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="Nunito, sans-serif"
                fontWeight={800}
                fontSize={fontSize}
                fill="#1F2A44"
              >
                {label}
              </text>
            )
          })}
          <circle cx={C} cy={C} r={42} fill="#1F2A44" />
          <circle cx={C} cy={C} r={16} fill="#FFD15C" />
        </svg>
      </motion.div>
      <svg width="56" height="64" viewBox="0 0 56 64" className="absolute top-0 left-[252px]" aria-hidden="true">
        <path d="M28 60L6 10h44z" fill="#1F2A44" stroke="#FFFFFF" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
