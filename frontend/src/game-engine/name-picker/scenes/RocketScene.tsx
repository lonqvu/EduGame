import i18n from 'i18next'
import { motion } from 'motion/react'
import { useState } from 'react'
import { BLEED_W, BLEED_X, Countdown, SceneSvg, Twinkle } from '@/game-engine/name-picker/effects'
import { launchLayout, UNIT_H, UNIT_W } from '@/game-engine/name-picker/launchLayout'
import { EASE_IN, EASE_OUT, LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'
import { useSound } from '@/sound/useSound'

const ART = '/assets/games/rocket'
/** Rockets take these colours in turn. */
const COLORS = ['blue', 'yellow', 'green', 'purple']
/** Where the winning rocket parks, beside the moon. */
const MOON_SPOT = { x: 1010, y: 215 }
const COUNT_MS = 800

type Step = 'count' | 'ignite' | 'fly' | 'chute' | 'arrived'

/** A seeded random (the same sky every round): stars scattered by a formula line up in rows and diagonals. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/**
 * The star field over the stage and its side bleed, split in three twinkle groups: mostly faint specks, a few bright
 * ones, thicker high in the sky and thinning towards the ground.
 */
const STARS = (() => {
  const random = seeded(7)
  return Array.from({ length: 190 }, (_, i) => {
    const big = random() < 0.12
    return {
      x: Math.round(BLEED_X + random() * BLEED_W),
      y: Math.round(Math.pow(random(), 1.5) * 580),
      r: big ? 2.2 + random() * 0.8 : 0.8 + random() * 1.1,
      opacity: big ? 1 : 0.45 + random() * 0.45,
      group: i % 3,
    }
  })
})()

export function RocketScene({ slots, winnerSlot, phase, onFinish }: PickSceneProps) {
  const sound = useSound()
  const running = phase === 'run'
  const done = phase === 'done'
  const [step, setStep] = useState<Step | null>(running ? 'count' : null)
  // One rocket per student; smaller rockets in more rows when the class is big.
  const [field] = useState(() => launchLayout(slots.length))
  const [heights] = useState(() => slots.map(() => 160 + Math.round(Math.random() * 150)))

  useSceneTimeline(running, [
    [COUNT_MS * 2, () => setStep('ignite')],
    [COUNT_MS * 3, () => { sound.play('whoosh'); setStep('fly') }],
    [4000, () => { sound.play('pop'); setStep('chute') }],
    [5400, () => setStep('arrived')],
    [5700, onFinish],
  ])

  const reached = step === 'fly' || step === 'chute' || step === 'arrived'
  const arrived = step === 'arrived' || done
  const ignited = step === 'ignite' || reached
  const { scale, labelW } = field
  const winner = slots[winnerSlot]

  return (
    <>
      <SpaceBackground happy={arrived} ground={field.ground} />

      {slots.map((student, i) => {
        const pad = field.pads[i]
        if (!pad) return null
        const isWinner = i === winnerSlot && (running || done)
        // The others open a parachute and float back down onto their pads.
        const falling = !isWinner && step === 'chute'
        const landed = !isWinner && (step === 'arrived' || done)
        const flame = ignited && !falling && !landed && !(isWinner && done)
        // Inside the rocket's box, moves are in its own (unscaled) units.
        const dx = (MOON_SPOT.x - pad.x) / scale

        // Winner: x eases in while y eases out, so the path curves toward the moon.
        const xAnim = isWinner && reached ? { x: dx } : { x: 0 }
        const xTrans = { duration: 3, ease: EASE_IN }
        let yAnim = { y: 0, scale: 1 }
        let yTrans: object = { duration: 2, ease: 'easeInOut' }
        if (isWinner && (reached || done)) {
          yAnim = { y: (MOON_SPOT.y - 80 - pad.top) / scale, scale: 0.6 / scale }
          yTrans = { duration: 3, ease: EASE_OUT }
        } else if (falling) {
          yAnim = { y: 0, scale: 1 }
          yTrans = { duration: 1.3, ease: 'easeInOut' }
        } else if (step === 'fly') {
          // Up into the sky, never off the top of the stage.
          yAnim = { y: -Math.min(heights[i], pad.top - 40) / scale, scale: 1 }
          yTrans = { duration: 1.6, ease: EASE_OUT }
        }

        const body = falling
          ? { animate: { rotate: [-8, 8], x: 0 }, transition: { duration: 1.2, ...LOOP } }
          : step === 'ignite'
            ? { animate: { x: [-2, 2], rotate: 0 }, transition: { duration: 0.06, ...LOOP } }
            : ignited || done
              ? { animate: { x: 0, rotate: 0, y: 0 }, transition: { duration: 0.2 } }
              : { animate: { y: [0, -4] }, transition: { duration: 1, delay: (i % 7) * 0.15, ...LOOP } }

        return (
          <div key={student.id}>
            {/* Pad, smoke and rocket in a 120 × 210 box, scaled to the rocket's cell. */}
            <div
              className="absolute"
              style={{ left: pad.x - (UNIT_W / 2) * scale, top: pad.top, width: UNIT_W, height: UNIT_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}
            >
              <img src={`${ART}/pad.webp`} alt="" className="absolute top-[150px] left-[2px] h-[59px] w-[116px] max-w-none" />
              {reached && (
                <motion.img
                  src={`${ART}/smoke.webp`}
                  alt=""
                  className="pointer-events-none absolute top-[150px] -left-[30px] w-[180px] max-w-none"
                  initial={{ scale: 0.3, opacity: 0.95 }}
                  animate={{ scale: 1.5, opacity: 0, y: -10 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                />
              )}
              <motion.div className="absolute top-0 left-0 h-[220px] w-[120px]" animate={xAnim} transition={xTrans}>
                <motion.div className="absolute inset-0" animate={yAnim} transition={yTrans}>
                  <motion.div className="absolute inset-0" animate={{ rotate: isWinner && reached ? (dx >= 0 ? 25 : -25) : 0 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
                    <motion.div className="absolute inset-0" style={{ originX: 0.5, originY: 0 }} {...body}>
                      {falling && <Parachute />}
                      {flame && <Flame small={step === 'ignite'} />}
                      <Rocket color={COLORS[i % COLORS.length]} />
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
            {/* The name under the pad keeps a readable size, whatever the rocket's. */}
            <span
              className="absolute flex justify-center"
              style={{ left: pad.x - labelW / 2, top: pad.top + UNIT_H * scale - 4 * scale, width: labelW }}
            >
              <span
                className="max-w-full truncate rounded-[10px] bg-white px-2 py-px leading-snug font-extrabold text-[#1F2A44]"
                style={{ fontSize: Math.round(Math.max(11, Math.min(17, 17 * scale + 4))) }}
              >
                {student.name}
              </span>
            </span>
          </div>
        )
      })}

      {/* The winner's name, beside the moon once the rocket has landed there. */}
      {running && reached && winner && (
        <motion.div
          className="absolute rounded-[18px] bg-sun px-[18px] py-1.5 font-display text-[38px] font-extrabold whitespace-nowrap"
          style={{ right: 1280 - MOON_SPOT.x + 40, top: MOON_SPOT.y + 10 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 2.6 }}
        >
          {winner.name}
        </motion.div>
      )}

      {running && <Countdown steps={['3', '2', '1', i18n.t('play.picker.launch')]} stepMs={COUNT_MS} left={660} top={150} accent="#FFD15C" ink="#2449B8" />}
    </>
  )
}

function Rocket({ color }: { color: string }) {
  return <img src={`${ART}/rocket-${color}.webp`} alt="" draggable={false} className="absolute top-[6px] left-[12px] h-[150px] w-[96px] select-none" aria-hidden="true" />
}

/** The engine fire: a small flicker while the rocket sits on its pad, full flames once it lifts off. */
function Flame({ small }: { small: boolean }) {
  return (
    <motion.img
      src={`${ART}/flame.webp`}
      alt=""
      className="absolute top-[146px] left-[33px] h-[96px] w-[54px]"
      style={{ originX: 0.5, originY: 0 }}
      initial={{ scaleY: 0 }}
      animate={small ? { scaleY: [0.3, 0.42], scaleX: [0.7, 0.6] } : { scaleY: [0.85, 1.2], scaleX: [1.05, 0.9] }}
      transition={{ duration: 0.12, ...LOOP }}
      aria-hidden="true"
    />
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

function SpaceBackground({ happy, ground }: { happy: boolean; ground: number }) {
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
            <circle key={`${s.x}-${s.y}`} cx={s.x} cy={s.y} r={s.r} opacity={s.opacity} />
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
      <Twinkle x={760} y={70} size={20} fill="#FFF3C4" />
      <Twinkle x={930} y={360} size={14} fill="#FFFFFF" delay={0.9} />
      <motion.g
        style={center}
        animate={happy ? { scale: [1, 1.08], rotate: [-4, 4] } : { y: [0, -6] }}
        transition={{ duration: happy ? 0.5 : 2, ...LOOP }}
      >
        <circle cx="1110" cy="140" r="118" fill="#FFF3C4" opacity={happy ? 0.3 : 0.15} />
        <image href={`${ART}/moon.webp`} x="1012" y="42" width="196" height="196" />
        <circle cx="1060" cy="158" r="10" fill="#FF8FB1" opacity={happy ? 0.8 : 0} />
        <circle cx="1146" cy="158" r="10" fill="#FF8FB1" opacity={happy ? 0.8 : 0} />
      </motion.g>
      <motion.g style={center} animate={{ y: [-8, 8], rotate: [-6, 6] }} transition={{ duration: 6, ...LOOP }}>
        <image href={`${ART}/planet-pink.webp`} x="448" y="155" width="146" height="90" />
      </motion.g>
      <motion.g style={center} animate={{ y: [6, -6], rotate: [4, -4] }} transition={{ duration: 7, ...LOOP }}>
        <image href={`${ART}/planet-blue.webp`} x="190" y="430" width="110" height="71" />
      </motion.g>
      <MoonSurface top={ground} />
    </SceneSvg>
  )
}

/** The dome of the moon's surface (centre and radii): wide and gently curved, its top at the given height. */
const DOME = { cx: 870, rx: 1500, ry: 1100 }

/** Craters on the surface, the same every round; placed relative to its top. */
const CRATERS = (() => {
  const random = seeded(11)
  return Array.from({ length: 26 }, () => {
    const rx = 10 + random() * 30
    return { x: Math.round(BLEED_X + 200 + random() * (BLEED_W - 400)), depth: 18 + random() * 420, rx, ry: rx * 0.34 }
  })
})()

/** Height of the dome's edge at `x`, for a dome whose top is at `top`. */
const domeY = (x: number, top: number) => {
  const t = (x - DOME.cx) / DOME.rx
  return top + DOME.ry * (1 - Math.sqrt(Math.max(0, 1 - t * t)))
}

/** The moon the rockets stand on: a dome with a lit rim, two shades of ground and craters. */
function MoonSurface({ top }: { top: number }) {
  const cy = top + DOME.ry
  return (
    <g>
      <defs>
        <linearGradient id="rkGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34478F" />
          <stop offset="0.12" stopColor="#2A3C84" />
          <stop offset="1" stopColor="#1B2A6B" />
        </linearGradient>
      </defs>
      <ellipse cx={DOME.cx} cy={cy} rx={DOME.rx} ry={DOME.ry} fill="url(#rkGround)" />
      <ellipse cx={DOME.cx} cy={cy} rx={DOME.rx} ry={DOME.ry} fill="none" stroke="#5A6FC0" strokeWidth="6" opacity="0.6" />
      <ellipse cx={DOME.cx} cy={cy + 34} rx={DOME.rx - 40} ry={DOME.ry} fill="#24357A" opacity="0.55" />
      {CRATERS.map((c) => {
        const y = domeY(c.x, top) + c.depth
        if (y > 712) return null
        return (
          <g key={`${c.x}-${c.depth}`}>
            <ellipse cx={c.x} cy={y} rx={c.rx} ry={c.ry} fill="#16225A" opacity="0.75" />
            <ellipse cx={c.x} cy={y + c.ry * 0.25} rx={c.rx * 0.9} ry={c.ry * 0.75} fill="none" stroke="#4C61B2" strokeWidth="2" opacity="0.5" />
          </g>
        )
      })}
    </g>
  )
}
