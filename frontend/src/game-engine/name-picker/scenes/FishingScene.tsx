import { motion } from 'motion/react'
import { useState } from 'react'
import { BLEED, BLEED_W, BLEED_X, Cloud, SceneSvg } from '@/game-engine/name-picker/effects'
import { fontFor, LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'

/** Where each fish swims (centre of its 260px lane) and which way it faces first. */
const SCHOOL = [
  { x: 300, y: 430, face: 1, dur: 11 },
  { x: 520, y: 560, face: -1, dur: 13 },
  { x: 820, y: 450, face: -1, dur: 10 },
  { x: 1020, y: 600, face: 1, dur: 12 },
  { x: 240, y: 620, face: -1, dur: 14 },
  { x: 760, y: 640, face: 1, dur: 9 },
  { x: 960, y: 350, face: 1, dur: 12 },
]
const FISH_COLORS = ['#FF9C86', '#C5A8FF', '#8BD3A8', '#FF8FB1', '#7FB2FF', '#FFE6A3', '#FFD15C']
const SWIM = 260
const HOOK_X = 600
const ROD_TIP_Y = 70
const LINE_IDLE = 230
const LINE_DEEP = 380
const LINE_REELED = 100
/** Plank seams of the dock, which runs from the left bleed out to x = 300. */
const DOCK_PLANKS = Array.from({ length: (300 + BLEED) / 50 - 1 }, (_, i) => BLEED_X + 50 * (i + 1))

type Step = 'cast' | 'approach' | 'bite' | 'reel'

export function FishingScene({ slots, winnerSlot, phase, onFinish }: PickSceneProps) {
  const running = phase === 'run'
  const done = phase === 'done'
  const [step, setStep] = useState<Step | null>(running ? 'cast' : null)
  const [line, setLine] = useState({ len: LINE_IDLE, s: 0.6 })
  const [rod, setRod] = useState({ deg: running ? 8 : 0, s: 0.35 })
  const [splash, setSplash] = useState(false)

  const target = SCHOOL[winnerSlot] ?? SCHOOL[0]
  const face = target.x < HOOK_X ? 1 : -1
  const mouthX = face === 1 ? HOOK_X - 60 : HOOK_X + 60

  useSceneTimeline(running, [
    [350, () => { setRod({ deg: 0, s: 0.5 }); setLine({ len: LINE_DEEP, s: 1 }) }],
    [900, () => setStep('approach')],
    [3150, () => { setStep('bite'); setRod({ deg: 14, s: 0.15 }) }],
    [3550, () => { setStep('reel'); setLine({ len: LINE_REELED, s: 1.2 }); setRod({ deg: -10, s: 1 }) }],
    [4150, () => setSplash(true)],
    [5000, () => { setSplash(false); setRod({ deg: -6, s: 0.4 }); onFinish() }],
  ])

  const winner = slots[winnerSlot]
  const hooked = step === 'reel' || done
  const approaching = step === 'approach' || step === 'bite'
  const winnerOut = running || done

  return (
    <>
      <PondBackground happy={done} />

      {slots.map((student, i) => {
        if (i === winnerSlot && winnerOut) return null
        const f = SCHOOL[i]
        // Start mid-lane facing `face`, swim to one end, turn, cross to the other end, turn, come back.
        const half = SWIM / 2
        const xs = f.face === 1 ? [half, SWIM, SWIM, 0, 0, half] : [half, 0, 0, SWIM, SWIM, half]
        const flips = f.face === 1 ? [1, 1, -1, -1, 1, 1] : [-1, -1, 1, 1, -1, -1]
        const swim = { duration: f.dur, repeat: Infinity, ease: 'linear' as const, times: [0, 0.23, 0.27, 0.73, 0.77, 1] }
        return (
          <motion.div
            key={student.id}
            className="absolute h-[76px] w-[170px]"
            style={{ left: f.x - half - 85, top: f.y - 38 }}
            initial={{ x: half }}
            animate={{ x: xs }}
            transition={swim}
          >
            <motion.div className="absolute inset-0" initial={{ scaleX: f.face }} animate={{ scaleX: flips }} transition={swim}>
              <Fish color={FISH_COLORS[i % FISH_COLORS.length]} />
            </motion.div>
            <FishName name={student.name} />
          </motion.div>
        )
      })}

      {approaching && winner && (
        <motion.div
          className="absolute h-[76px] w-[170px]"
          style={{ left: target.x - 85, top: target.y - 38 }}
          initial={{ x: 0, y: 0 }}
          animate={{ x: mouthX - target.x, y: ROD_TIP_Y + LINE_DEEP + 2 - target.y }}
          transition={{ duration: 2.2, ease: 'easeInOut' }}
        >
          <motion.div
            className="absolute inset-0"
            animate={step === 'bite' ? { x: [0, 4], y: [0, 3] } : { x: 0 }}
            transition={step === 'bite' ? { duration: 0.06, ...LOOP } : undefined}
          >
            <div className="absolute inset-0" style={{ transform: `scaleX(${face})` }}>
              <Fish color={FISH_COLORS[winnerSlot % FISH_COLORS.length]} fast />
            </div>
            <FishName name={winner.name} />
          </motion.div>
        </motion.div>
      )}

      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ transformOrigin: '236px 196px' }}
        animate={{ rotate: rod.deg }}
        transition={{ duration: rod.s, ease: 'easeOut' }}
      >
        <svg width="1280" height="720" viewBox="0 0 1280 720" className="absolute inset-0" aria-hidden="true">
          <path d="M230 200 Q 380 40 600 70" fill="none" stroke="#5A3A22" strokeWidth="7" strokeLinecap="round" />
          <circle cx="236" cy="196" r="10" fill="#4A5470" />
        </svg>
        <motion.div
          className="absolute w-[2.5px] bg-ink-soft"
          style={{ left: HOOK_X - 1, top: ROD_TIP_Y }}
          initial={{ height: LINE_IDLE }}
          animate={{ height: line.len }}
          transition={{ duration: line.s, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute size-0"
          style={{ left: HOOK_X, top: ROD_TIP_Y }}
          initial={{ y: LINE_IDLE }}
          animate={{ y: line.len }}
          transition={{ duration: line.s, ease: 'easeInOut' }}
        >
          {!hooked && (
            <>
              <motion.svg
                width="120" height="30" viewBox="-60 -15 120 30" className="absolute -left-[60px] -top-12"
                animate={{ scale: [0.4, 1.6], opacity: [0.9, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                aria-hidden="true"
              >
                <ellipse rx="56" ry="10" fill="none" stroke="#FFFFFF" strokeWidth="4" />
              </motion.svg>
              <motion.svg
                width="24" height="32" viewBox="-12 -16 24 32" className="absolute -left-3 -top-14"
                animate={{ y: [0, 5] }}
                transition={{ duration: 0.8, ...LOOP }}
                aria-hidden="true"
              >
                <circle r="11" fill="#FFFFFF" />
                <path d="M-11 0 A11 11 0 0 1 11 0Z" fill="#E5484D" />
              </motion.svg>
            </>
          )}
          <svg width="24" height="28" viewBox="0 0 24 28" className="absolute -left-1.5 -top-0.5" aria-hidden="true">
            <path d="M6 0 V16 a6 6 0 0 0 12 0 V12" fill="none" stroke="#4A5470" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {hooked && (
            <motion.div
              className="absolute top-0 -left-[85px] h-[150px] w-[170px]"
              style={{ originX: 0.5, originY: 0.1 }}
              animate={{ rotate: [-12, 12] }}
              transition={{ duration: 0.22, ...LOOP }}
            >
              <svg width="170" height="150" viewBox="-85 -10 170 150" className="overflow-visible" aria-hidden="true">
                <g transform="translate(-4 70) rotate(-70) scale(1.1)">
                  <FishShape color={FISH_COLORS[winnerSlot % FISH_COLORS.length]} />
                </g>
              </svg>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {splash && (
        <motion.svg
          width="220" height="120" viewBox="-110 -100 220 120"
          className="absolute overflow-visible"
          style={{ left: HOOK_X - 110, top: 172 }}
          initial={{ scale: 0.2, opacity: 1, y: 0 }}
          animate={{ scale: 1.3, opacity: 0, y: -20 }}
          transition={{ duration: 0.9, ease: [0.2, 1, 0.4, 1] }}
          aria-hidden="true"
        >
          <g fill="#FFFFFF">
            {['M-40 0 q-6 -30 0 -44 q6 14 0 44z', 'M40 0 q-6 -30 0 -44 q6 14 0 44z', 'M-10 -10 q-6 -40 0 -60 q6 20 0 60z', 'M14 -6 q-6 -30 0 -48 q6 18 0 48z', 'M-70 4 q-4 -20 0 -30 q4 10 0 30z', 'M70 4 q-4 -20 0 -30 q4 10 0 30z'].map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <ellipse cx="0" cy="10" rx="90" ry="14" fill="none" stroke="#FFFFFF" strokeWidth="5" />
        </motion.svg>
      )}
    </>
  )
}

function FishShape({ color, fast }: { color: string; fast?: boolean }) {
  return (
    <>
      <motion.path
        d="M-58 0 L-86 -24 L-80 0 L-86 24Z"
        fill={color}
        style={{ transformBox: 'fill-box', originX: 1, originY: 0.5 }}
        animate={{ scaleY: [1, 0.6] }}
        transition={{ duration: fast ? 0.15 : 0.35, ...LOOP }}
      />
      <ellipse cx="0" cy="0" rx="62" ry="34" fill={color} />
      <path d="M-6 -30 Q8 -50 26 -30Z" fill={color} />
      <ellipse cx="-4" cy="-12" rx="40" ry="10" fill="#FFFFFF" opacity="0.3" />
      <circle cx="38" cy="-8" r="6" fill="#FFFFFF" />
      <circle cx="40" cy="-8" r="3.4" fill="#1F2A44" />
      <path d="M50 8 Q56 12 60 8" fill="none" stroke="#1F2A44" strokeWidth="2.5" strokeLinecap="round" />
    </>
  )
}

function Fish({ color, fast }: { color: string; fast?: boolean }) {
  return (
    <svg width="170" height="76" viewBox="-90 -38 180 76" aria-hidden="true">
      <FishShape color={color} fast={fast} />
    </svg>
  )
}

/** Name label stays readable while the fish body flips direction. */
function FishName({ name }: { name: string }) {
  return (
    <span className="absolute inset-x-0 top-9 text-center leading-none font-extrabold" style={{ fontSize: fontFor(name, 17, 15) }}>
      {name}
    </span>
  )
}

function PondBackground({ happy }: { happy: boolean }) {
  const sway = { transformBox: 'fill-box' as const, originX: 0.5, originY: 1 }
  const trees = [60, 170, 1210]
  return (
    <SceneSvg>
      <rect x={BLEED_X} width={BLEED_W} height="720" fill="#D9F2F7" />
      <Cloud x={380} y={70} scale={0.8} duration={22} />
      <Cloud x={760} y={40} scale={0.6} duration={26} drift={-40} />
      <path d={`M${BLEED_X} 250 H0 Q 160 200 330 240 T 700 230 T 1280 236 H${1280 + BLEED} V 270 H${BLEED_X}Z`} fill="#9BD67A" />
      {trees.map((x, i) => (
        <motion.g key={x} style={sway} animate={{ rotate: [-2, 2] }} transition={{ duration: 3, delay: i * 0.4, ...LOOP }}>
          <rect x={x - 6} y="180" width="12" height="60" fill="#8A5A3B" />
          <circle cx={x} cy="170" r="34" fill="#6FBF5A" />
          <circle cx={x - 20} cy="186" r="22" fill="#6FBF5A" />
          <circle cx={x + 22} cy="188" r="22" fill="#5DAE49" />
        </motion.g>
      ))}
      <rect x={BLEED_X} y="262" width={BLEED_W} height="458" fill="#7FC8E8" />
      <motion.g fill="none" stroke="#B5E2F4" strokeWidth="4" strokeLinecap="round" animate={{ x: [-18, 18] }} transition={{ duration: 4, ...LOOP }}>
        {[320, 400, 480, 560, 640].flatMap((y, row) =>
          [0, 1, 2, 3, 4, 5, 6].map((col) => <path key={`${y}-${col}`} d={`M${(row % 2 ? 130 : 40) + col * 180} ${y} q15 -10 30 0 q15 10 30 0`} />),
        )}
      </motion.g>
      <g fill="none" stroke="#FFFFFF" strokeWidth="2.5">
        {[
          { x: 360, y: 560, r: 6, d: 0 },
          { x: 372, y: 600, r: 4, d: 1 },
          { x: 870, y: 610, r: 6, d: 0.6 },
          { x: 884, y: 650, r: 4, d: 1.8 },
          { x: 1120, y: 680, r: 5, d: 1.3 },
        ].map((b) => (
          <motion.circle
            key={`${b.x}-${b.y}`}
            cx={b.x} cy={b.y} r={b.r}
            animate={{ y: [0, -120], opacity: [0, 1, 0] }}
            transition={{ duration: 3, delay: b.d, repeat: Infinity, ease: 'easeIn' }}
          />
        ))}
      </g>
      <rect x={BLEED_X} y="236" width={300 + BLEED} height="40" fill="#C98B5A" />
      <g stroke="#A86F45" strokeWidth="3">
        {DOCK_PLANKS.map((x) => <line key={x} x1={x} y1="236" x2={x} y2="276" />)}
      </g>
      <rect x="40" y="270" width="16" height="90" fill="#A86F45" />
      <rect x="140" y="270" width="16" height="90" fill="#A86F45" />
      <rect x="250" y="270" width="16" height="90" fill="#A86F45" />
      <motion.g
        style={sway}
        animate={happy ? { y: [0, -20], rotate: [0, 4] } : { rotate: [0, -3] }}
        transition={{ duration: happy ? 0.4 : 1.2, ...LOOP }}
      >
        <g transform="translate(200 160)">
          <circle cx="0" cy="40" r="44" fill="#C98B5A" />
          <circle cx="0" cy="-10" r="34" fill="#C98B5A" />
          <circle cx="-26" cy="-36" r="12" fill="#C98B5A" />
          <circle cx="26" cy="-36" r="12" fill="#C98B5A" />
          <circle cx="-26" cy="-36" r="6" fill="#F2C9A5" />
          <circle cx="26" cy="-36" r="6" fill="#F2C9A5" />
          <ellipse cx="0" cy="2" rx="16" ry="12" fill="#F2C9A5" />
          <circle cx="0" cy="-3" r="4" fill="#1F2A44" />
          <circle cx="-12" cy="-16" r="3.5" fill="#1F2A44" />
          <circle cx="12" cy="-16" r="3.5" fill="#1F2A44" />
          <path d={happy ? 'M-8 4 Q0 14 8 4' : 'M-6 6 Q0 11 6 6'} fill="none" stroke="#1F2A44" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M-30 -34 Q0 -64 30 -34Z" fill="#3563E9" />
          <rect x="-34" y="-38" width="68" height="8" rx="4" fill="#2449B8" />
        </g>
      </motion.g>
      <motion.g style={sway} animate={{ y: [0, -5] }} transition={{ duration: 1, ...LOOP }}>
        <g transform="translate(1150 490)">
          <path d="M0 0 L60 -8 A62 30 0 1 1 52 16Z" fill="#5DAE49" />
          <ellipse cx="-4" cy="-16" rx="26" ry="20" fill="#8BD36A" />
          <circle cx="-18" cy="-36" r="10" fill="#8BD36A" />
          <circle cx="10" cy="-36" r="10" fill="#8BD36A" />
          <circle cx="-18" cy="-37" r="5" fill="#FFFFFF" />
          <circle cx="10" cy="-37" r="5" fill="#FFFFFF" />
          <circle cx="-17" cy="-37" r="2.6" fill="#1F2A44" />
          <circle cx="11" cy="-37" r="2.6" fill="#1F2A44" />
          <path d="M-14 -16 Q-4 -8 6 -16" fill="none" stroke="#1F2A44" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </motion.g>
      <g transform="translate(980 660)">
        <path d="M0 0 L44 -6 A46 22 0 1 1 38 12Z" fill="#5DAE49" />
        <circle cx="-6" cy="-2" r="10" fill="#FF8FB1" />
        <circle cx="-6" cy="-2" r="4" fill="#FFD15C" />
      </g>
    </SceneSvg>
  )
}
