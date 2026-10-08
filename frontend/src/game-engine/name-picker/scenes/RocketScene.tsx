import { motion } from 'motion/react'
import { useState } from 'react'
import { BLEED, BLEED_W, BLEED_X, Countdown, SceneSvg, Twinkle } from '@/game-engine/name-picker/effects'
import { EASE_IN, EASE_OUT, fontFor, LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'

const PADS = [560, 760, 960, 1160]
const COLORS = ['#7FB2FF', '#FFD15C', '#8BD3A8', '#C5A8FF']
const PAD_Y = 560
/** Where the winning rocket parks, beside the moon. */
const MOON_SPOT = { x: 1010, y: 215 }
const COUNT_MS = 800

type Step = 'count' | 'ignite' | 'fly' | 'chute' | 'arrived'

/** Deterministic star field (x, y, r) split in three twinkle groups. */
const STARS = Array.from({ length: 66 }, (_, i) => ({
  x: (i * 211 + 37) % 1270,
  y: (i * 137 + 11) % 560,
  r: 1.5 + (i % 4) * 0.5,
  group: i % 3,
}))

export function RocketScene({ slots, winnerSlot, phase, onFinish }: PickSceneProps) {
  const running = phase === 'run'
  const done = phase === 'done'
  const [step, setStep] = useState<Step | null>(running ? 'count' : null)
  const [heights] = useState(() => slots.map(() => 200 + Math.round(Math.random() * 110)))

  useSceneTimeline(running, [
    [COUNT_MS * 2, () => setStep('ignite')],
    [COUNT_MS * 3, () => setStep('fly')],
    [4000, () => setStep('chute')],
    [5400, () => setStep('arrived')],
    [5700, onFinish],
  ])

  const reached = step === 'fly' || step === 'chute' || step === 'arrived'
  const arrived = step === 'arrived' || done
  const ignited = step === 'ignite' || reached

  return (
    <>
      <SpaceBackground happy={arrived} names={slots.map((s) => s.name)} />

      {reached && (
        <>
          {PADS.slice(0, slots.length).map((x) => (
            <motion.svg
              key={x}
              width="200" height="90" viewBox="-100 -45 200 90"
              className="pointer-events-none absolute"
              style={{ left: x - 100, top: 584 }}
              initial={{ scale: 0.3, opacity: 0.9 }}
              animate={{ scale: 1.6, opacity: 0, y: -10 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              aria-hidden="true"
            >
              <g fill="#FFFFFF" opacity="0.7">
                <circle cx="-50" cy="10" r="28" />
                <circle cx="0" cy="0" r="36" />
                <circle cx="52" cy="10" r="28" />
              </g>
            </motion.svg>
          ))}
        </>
      )}

      {slots.map((student, i) => {
        const x = PADS[i]
        const isWinner = i === winnerSlot && (running || done)
        const dx = MOON_SPOT.x - x
        const chute = !isWinner && (step === 'chute' || step === 'arrived' || done)
        const flame = ignited && !chute && !(isWinner && done)

        // Winner: x eases in while y eases out, so the path curves toward the moon.
        const xAnim = isWinner && reached ? { x: dx } : { x: 0 }
        const xTrans = { duration: 3, ease: EASE_IN }
        let yAnim = { y: 0, scale: 1 }
        let yTrans: object = { duration: 2, ease: 'easeInOut' }
        if (isWinner && (reached || done)) {
          yAnim = { y: MOON_SPOT.y - PAD_Y, scale: 0.6 }
          yTrans = { duration: 3, ease: EASE_OUT }
        } else if (step === 'fly') {
          yAnim = { y: -heights[i], scale: 1 }
          yTrans = { duration: 1.6, ease: EASE_OUT }
        }

        const body = chute
          ? { animate: { rotate: [-8, 8], x: 0 }, transition: { duration: 1.2, ...LOOP } }
          : step === 'ignite'
            ? { animate: { x: [-2, 2], rotate: 0 }, transition: { duration: 0.06, ...LOOP } }
            : ignited || done
              ? { animate: { x: 0, rotate: 0, y: 0 }, transition: { duration: 0.2 } }
              : { animate: { y: [0, -4] }, transition: { duration: 1, ...LOOP } }

        return (
          <motion.div key={student.id} className="absolute h-[220px] w-[120px]" style={{ left: x - 60, top: PAD_Y - 80 }} animate={xAnim} transition={xTrans}>
            <motion.div className="absolute inset-0" animate={yAnim} transition={yTrans}>
              <motion.div className="absolute inset-0" animate={{ rotate: isWinner && reached ? (dx >= 0 ? 25 : -25) : 0 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
                <motion.div className="absolute inset-0" style={{ originX: 0.5, originY: 0 }} {...body}>
                  {chute && <Parachute />}
                  {flame && <Flame />}
                  <Rocket color={COLORS[i % COLORS.length]} />
                </motion.div>
              </motion.div>
              {isWinner && reached && (
                <motion.div
                  className="absolute top-[60px] left-[100px] rounded-[18px] bg-sun px-[18px] py-1.5 font-display text-[38px] font-extrabold whitespace-nowrap"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
                >
                  {student.name}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )
      })}

      {arrived && (
        <motion.svg
          width="200" height="200" viewBox="-100 -100 200 200"
          className="pointer-events-none absolute"
          style={{ left: 1010, top: 40 }}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          aria-hidden="true"
        >
          <g fill="#FFD15C">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <path key={a} d="M0 -96 L8 -70 L0 -60 L-8 -70Z" transform={`rotate(${a})`} />
            ))}
          </g>
        </motion.svg>
      )}

      {running && <Countdown steps={['3', '2', '1', 'Phóng!']} stepMs={COUNT_MS} left={660} top={220} accent="#FFD15C" ink="#2449B8" />}
    </>
  )
}

function Rocket({ color }: { color: string }) {
  return (
    <svg width="120" height="220" viewBox="-60 -80 120 220" className="absolute inset-0 overflow-visible" aria-hidden="true">
      <path d="M-24 40 L-44 70 L-20 62Z" fill={color} />
      <path d="M24 40 L44 70 L20 62Z" fill={color} />
      <path d="M0 -70 C30 -40 28 20 22 62 H-22 C-28 20 -30 -40 0 -70Z" fill="#FFFFFF" />
      <path d="M0 -70 C14 -56 20 -44 23 -32 H-23 C-20 -44 -14 -56 0 -70Z" fill={color} />
      <circle cx="0" cy="-4" r="13" fill="#7FB2FF" stroke={color} strokeWidth="5" />
      <circle cx="-4" cy="-8" r="4" fill="#FFFFFF" opacity="0.7" />
      <rect x="-14" y="62" width="28" height="8" rx="3" fill="#8A94AD" />
    </svg>
  )
}

function Flame() {
  return (
    <svg width="120" height="220" viewBox="-60 -80 120 220" className="absolute inset-0 overflow-visible" aria-hidden="true">
      <motion.g
        style={{ transformBox: 'fill-box', originX: 0.5, originY: 0 }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: [0.8, 1.25], scaleX: [1.05, 0.9] }}
        transition={{ duration: 0.12, ...LOOP }}
      >
        <path d="M-16 66 Q0 150 16 66Z" fill="#FF9C3B" />
        <path d="M-9 66 Q0 120 9 66Z" fill="#FFE07A" />
      </motion.g>
    </svg>
  )
}

function Parachute() {
  return (
    <motion.svg
      width="120" height="220" viewBox="-60 -80 120 220"
      className="absolute inset-0 overflow-visible"
      style={{ originX: 0.5, originY: 0.05 }}
      initial={{ scale: 0.1 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', bounce: 0.55, duration: 0.5 }}
      aria-hidden="true"
    >
      <path d="M0 -70 L-46 -130 M0 -70 L46 -130 M0 -70 L0 -150" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M-56 -128 Q0 -200 56 -128 Q28 -138 0 -128 Q-28 -138 -56 -128Z" fill="#FFD15C" />
      <path d="M-20 -134 Q0 -196 20 -134 Q10 -138 0 -134 Q-10 -138 -20 -134Z" fill="#E5484D" />
    </motion.svg>
  )
}

function SpaceBackground({ happy, names }: { happy: boolean; names: string[] }) {
  const center = { transformBox: 'fill-box' as const, originX: 0.5, originY: 0.5 }
  return (
    <SceneSvg>
      <defs>
        <linearGradient id="rkSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B2550" />
          <stop offset="1" stopColor="#3A4688" />
        </linearGradient>
      </defs>
      <rect x={BLEED_X} width={BLEED_W} height="720" fill="url(#rkSky)" />
      {[0, 1, 2].map((g) => (
        <motion.g key={g} fill="#FFFFFF" animate={{ opacity: [1, 0.25] }} transition={{ duration: 1.1 + g * 0.4, delay: g * 0.7, ...LOOP }}>
          {STARS.filter((s) => s.group === g).map((s) => (
            <circle key={`${s.x}-${s.y}`} cx={s.x} cy={s.y} r={s.r} />
          ))}
        </motion.g>
      ))}
      <motion.g
        animate={{ x: [0, -420], y: [0, 220], opacity: [0, 1, 0, 0] }}
        transition={{ duration: 7, delay: 2, repeat: Infinity, times: [0, 0.02, 0.1, 1], ease: 'linear' }}
      >
        <path d="M900 40 L860 60" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <circle cx="900" cy="40" r="3" fill="#FFFFFF" />
      </motion.g>
      <Twinkle x={560} y={90} size={24} fill="#FFF3C4" />
      <Twinkle x={980} y={330} size={20} fill="#FFF3C4" delay={0.6} />
      <Twinkle x={470} y={300} size={16} fill="#FFFFFF" delay={1.1} />
      <motion.g
        style={center}
        animate={happy ? { scale: [1, 1.08], rotate: [-4, 4] } : { y: [0, -6] }}
        transition={{ duration: happy ? 0.5 : 2, ...LOOP }}
      >
        <circle cx="1110" cy="140" r="110" fill="#FFF3C4" opacity="0.15" />
        <circle cx="1110" cy="140" r="84" fill="#FFF3C4" />
        <circle cx="1080" cy="116" r="16" fill="#F2E3A6" />
        <circle cx="1140" cy="170" r="22" fill="#F2E3A6" />
        <circle cx="1130" cy="100" r="9" fill="#F2E3A6" />
        <circle cx="1072" cy="164" r="9" fill="#FF8FB1" opacity={happy ? 0.9 : 0} />
        <circle cx="1128" cy="164" r="9" fill="#FF8FB1" opacity={happy ? 0.9 : 0} />
        <circle cx="1084" cy="148" r="5" fill="#1F2A44" />
        <circle cx="1116" cy="148" r="5" fill="#1F2A44" />
        <path d={happy ? 'M1086 164 Q1100 180 1114 164' : 'M1088 166 Q1100 176 1112 166'} fill="none" stroke="#1F2A44" strokeWidth="3.5" strokeLinecap="round" />
      </motion.g>
      <motion.g style={center} animate={{ y: [-8, 8], rotate: [-6, 6] }} transition={{ duration: 6, ...LOOP }}>
        <g transform="translate(520 200)">
          <circle r="34" fill="#FF8FB1" />
          <ellipse rx="58" ry="14" fill="none" stroke="#FFD15C" strokeWidth="6" transform="rotate(-18)" />
        </g>
      </motion.g>
      <path d={`M${BLEED_X} 600 H0 Q 320 560 640 590 T 1280 580 H${1280 + BLEED} V 720 H${BLEED_X}Z`} fill="#2B3566" />
      <path d={`M${BLEED_X} 640 H0 Q 320 610 640 636 T 1280 628 H${1280 + BLEED} V 720 H${BLEED_X}Z`} fill="#232C57" />
      {PADS.slice(0, names.length).map((x, i) => (
        <g key={x}>
          <rect x={x - 56} y="634" width="112" height="22" rx="8" fill="#8A94AD" />
          <rect x={x - 46} y="656" width="10" height="40" fill="#5C6688" />
          <rect x={x + 36} y="656" width="10" height="40" fill="#5C6688" />
          <rect x={x - 58} y="664" width="116" height="34" rx="12" fill="#FFFFFF" />
          <text x={x} y="682" textAnchor="middle" dominantBaseline="middle" fontFamily="Nunito, sans-serif" fontWeight={800} fontSize={fontFor(names[i], 17, 15)} fill="#1F2A44">
            {names[i]}
          </text>
        </g>
      ))}
    </SceneSvg>
  )
}
