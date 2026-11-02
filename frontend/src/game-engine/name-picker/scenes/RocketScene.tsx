import i18n from 'i18next'
import { motion } from 'motion/react'
import { useState } from 'react'
import { BLEED, BLEED_W, BLEED_X, Countdown, SceneSvg, Twinkle } from '@/game-engine/name-picker/effects'
import { EASE_IN, EASE_OUT, fontFor, LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'
import { useSound } from '@/sound/useSound'

const PADS = [560, 760, 960, 1160]
const ART = '/assets/games/rocket'
/** One rocket per pad, each its own colour. */
const COLORS = ['blue', 'yellow', 'green', 'purple']
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
  const sound = useSound()
  const running = phase === 'run'
  const done = phase === 'done'
  const [step, setStep] = useState<Step | null>(running ? 'count' : null)
  const [heights] = useState(() => slots.map(() => 200 + Math.round(Math.random() * 110)))

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

  return (
    <>
      <SpaceBackground happy={arrived} names={slots.map((s) => s.name)} />

      {reached && (
        <>
          {PADS.slice(0, slots.length).map((x) => (
            <motion.img
              key={x}
              src={`${ART}/smoke.webp`}
              alt=""
              className="pointer-events-none absolute w-[180px]"
              style={{ left: x - 90, top: 590 }}
              initial={{ scale: 0.3, opacity: 0.95 }}
              animate={{ scale: 1.5, opacity: 0, y: -10 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            />
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
                  {flame && <Flame small={step === 'ignite'} />}
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

      {running && <Countdown steps={['3', '2', '1', i18n.t('play.picker.launch')]} stepMs={COUNT_MS} left={660} top={220} accent="#FFD15C" ink="#2449B8" />}
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
      <motion.image href={`${ART}/sparkles.webp`} x="330" y="400" width="170" height="59" animate={{ opacity: [0.7, 0.3] }} transition={{ duration: 1.6, ...LOOP }} />
      <path d={`M${BLEED_X} 600 H0 Q 320 560 640 590 T 1280 580 H${1280 + BLEED} V 720 H${BLEED_X}Z`} fill="#2B3566" />
      <path d={`M${BLEED_X} 640 H0 Q 320 610 640 636 T 1280 628 H${1280 + BLEED} V 720 H${BLEED_X}Z`} fill="#232C57" />
      <image href={`${ART}/ground.webp`} x="400" y="600" width="920" height="133" preserveAspectRatio="none" />
      {PADS.slice(0, names.length).map((x, i) => (
        <g key={x}>
          <image href={`${ART}/pad.webp`} x={x - 58} y="630" width="116" height="59" />
          <rect x={x - 58} y="680" width="116" height="34" rx="12" fill="#FFFFFF" />
          <text x={x} y="698" textAnchor="middle" dominantBaseline="middle" fontFamily="Nunito, sans-serif" fontWeight={800} fontSize={fontFor(names[i], 17, 15)} fill="#1F2A44">
            {names[i]}
          </text>
        </g>
      ))}
    </SceneSvg>
  )
}
