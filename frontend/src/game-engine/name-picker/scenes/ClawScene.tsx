import { motion } from 'motion/react'
import { useState } from 'react'
import { Twinkle } from '@/game-engine/name-picker/effects'
import { EASE_IN_OUT, fontFor, LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'

/** Capsule centres inside the glass box (top row last so the claw can reach them). */
const SPOTS = [
  { x: 220, y: 456 }, { x: 300, y: 470 }, { x: 380, y: 462 }, { x: 460, y: 470 }, { x: 540, y: 458 }, { x: 600, y: 474 },
  { x: 260, y: 404 }, { x: 345, y: 410 }, { x: 430, y: 404 }, { x: 515, y: 408 }, { x: 596, y: 404 },
]
const CAP_COLORS = ['#7FB2FF', '#8BD3A8', '#C5A8FF', '#FF9C86', '#7FD3E0', '#FF8FB1', '#FFE6A3', '#BDEBD3', '#CFE3FF', '#FFD0D8', '#FFD15C']
const HOME_X = 430
/** Rope length at rest; head top sits at 228 + rope. */
const REST_ROPE = 40
const ARM_OPEN = 22
const ARM_IDLE = 10
const ARM_CLOSED = -6

export function ClawScene({ slots, winnerSlot, phase, onFinish }: PickSceneProps) {
  const running = phase === 'run'
  const done = phase === 'done'
  const target = SPOTS[winnerSlot] ?? SPOTS[0]
  const offset = target.x - HOME_X
  const dir = offset >= 0 ? 1 : -1

  const [cx, setCx] = useState({ x: 0, s: 1.3 })
  const [rope, setRope] = useState({ y: REST_ROPE, s: 1, ease: 'easeIn' as 'easeIn' | 'easeOut' })
  const [arms, setArms] = useState(running ? ARM_OPEN : ARM_IDLE)
  const [joy, setJoy] = useState(0)
  const [pressed, setPressed] = useState(running)
  const [shake, setShake] = useState(false)
  const [holding, setHolding] = useState(false)
  const [flying, setFlying] = useState(false)

  useSceneTimeline(running, [
    [150, () => setPressed(false)],
    [300, () => { setCx({ x: offset, s: 1.3 }); setJoy(18 * dir) }],
    [1650, () => { setJoy(0); setRope({ y: target.y - 286, s: 1, ease: 'easeIn' }) }],
    [2700, () => { setArms(ARM_CLOSED); setShake(true) }],
    [3050, () => { setHolding(true); setShake(false); setRope({ y: REST_ROPE, s: 1.1, ease: 'easeOut' }) }],
    [4200, () => { setCx({ x: 0, s: 1.2 }); setJoy(-18 * dir) }],
    [5450, () => { setJoy(0); setArms(ARM_OPEN); setHolding(false); setFlying(true) }],
    [6400, () => { setArms(ARM_IDLE); onFinish() }],
  ])

  const winner = slots[winnerSlot]
  const taken = holding || flying || done
  const screen = running ? 'ĐANG GẮP' : done ? 'TRÚNG!' : 'SẴN SÀNG'

  return (
    <>
      <MachineBackground />
      {slots.map((student, i) =>
        i === winnerSlot && taken ? null : (
          <motion.div
            key={student.id}
            className="absolute size-20"
            style={{ left: SPOTS[i].x - 40, top: SPOTS[i].y - 40 }}
            animate={shake ? { x: [-3, 3], rotate: [-4, 4] } : { x: 0, y: [0, -3], rotate: [0, 3] }}
            transition={shake ? { duration: 0.08, ...LOOP } : { duration: 1.1, delay: (i % 5) * 0.2, ...LOOP }}
          >
            <Capsule name={student.name} color={CAP_COLORS[i % CAP_COLORS.length]} />
          </motion.div>
        ),
      )}

      <motion.div
        className="absolute h-[300px] w-20"
        style={{ left: HOME_X - 40, top: 212 }}
        animate={{ x: cx.x }}
        transition={{ duration: cx.s, ease: EASE_IN_OUT }}
      >
        <div className="absolute top-0 left-0 h-4 w-20 rounded-md bg-[#8A94AD]" />
        <motion.div
          className="absolute top-4 left-[38px] w-1 bg-ink-soft"
          initial={{ height: REST_ROPE }}
          animate={{ height: rope.y }}
          transition={{ duration: rope.s, ease: rope.ease }}
        />
        <motion.div
          className="absolute top-4 left-0 h-[100px] w-20"
          initial={{ y: REST_ROPE }}
          animate={{ y: rope.y }}
          transition={{ duration: rope.s, ease: rope.ease }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ originX: 0.5, originY: 0 }}
            animate={running ? { rotate: 0 } : { rotate: [-3, 3] }}
            transition={running ? { duration: 0.3 } : { duration: 1.3, ...LOOP }}
          >
            {holding && winner && (
              <div className="absolute top-[18px] left-0 size-20">
                <Capsule name={winner.name} color={CAP_COLORS[winnerSlot % CAP_COLORS.length]} />
              </div>
            )}
            <ClawArm side="left" angle={arms} />
            <ClawArm side="right" angle={-arms} />
            <svg width="80" height="24" viewBox="0 0 80 24" className="absolute top-0 left-0" aria-hidden="true">
              <rect x="14" y="0" width="52" height="22" rx="8" fill="#4A5470" />
              <circle cx="40" cy="11" r="4" fill="#FFD15C" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>

      {flying && winner && (
        <motion.div
          className="absolute size-20"
          style={{ left: HOME_X - 40, top: 286 }}
          initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
          animate={{ x: [0, 300, 420], y: [0, -140, -40], scale: [1, 1.5, 0.4], rotate: [0, 200, 360], opacity: [1, 1, 0] }}
          transition={{ duration: 1, times: [0, 0.6, 1], ease: 'easeInOut' }}
        >
          <Capsule name={winner.name} color={CAP_COLORS[winnerSlot % CAP_COLORS.length]} />
        </motion.div>
      )}

      <svg width="1280" height="720" viewBox="0 0 1280 720" className="pointer-events-none absolute inset-0" aria-hidden="true">
        {[204, 324, 564].map((x) => (
          <line key={x} x1={x} y1="246" x2={x + 40} y2="326" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" opacity="0.5" />
        ))}
      </svg>

      <div className="absolute top-[552px] left-[192px] flex h-10 w-24 items-center justify-center text-sm font-extrabold tracking-wider" style={{ color: done ? '#FFD15C' : '#8BD3A8' }}>
        <motion.span animate={running || done ? { opacity: [1, 0.2] } : { opacity: 1 }} transition={{ duration: 0.3, ...LOOP }}>
          {screen}
        </motion.span>
      </div>

      <motion.div
        className="absolute top-[512px] left-[426px] h-20 w-12"
        style={{ transformOrigin: '24px 78px' }}
        animate={{ rotate: joy }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <svg width="48" height="80" viewBox="0 0 48 80" aria-hidden="true">
          <rect x="18" y="28" width="12" height="50" rx="6" fill="#4A5470" />
          <circle cx="24" cy="24" r="18" fill="#E5484D" />
          <circle cx="18" cy="18" r="5" fill="#FFFFFF" opacity="0.6" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute top-[544px] left-[528px] size-16 rounded-full border-[5px] border-[#E0A800] bg-sun"
        animate={{ y: pressed ? 6 : 0 }}
        transition={{ duration: 0.12 }}
        aria-hidden="true"
      />
    </>
  )
}

function ClawArm({ side, angle }: { side: 'left' | 'right'; angle: number }) {
  const left = side === 'left'
  return (
    <motion.div
      className="absolute top-0 left-0 h-[100px] w-20"
      style={{ transformOrigin: left ? '18px 18px' : '62px 18px' }}
      animate={{ rotate: angle }}
      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
    >
      <svg width="80" height="100" viewBox="0 0 80 100" className="overflow-visible" aria-hidden="true">
        <path
          d={left ? 'M18 18 C-22 34 -20 74 0 90' : 'M62 18 C102 34 100 74 80 90'}
          fill="none"
          stroke="#4A5470"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  )
}

function Capsule({ name, color }: { name: string; color: string }) {
  return (
    <svg width="80" height="80" viewBox="-40 -40 80 80" aria-hidden="true">
      <circle r="38" fill="#FFFFFF" stroke="#1F2A44" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M-38 0 A38 38 0 0 1 38 0Z" fill={color} />
      <ellipse cx="-15" cy="-19" rx="7" ry="5" fill="#FFFFFF" opacity="0.6" />
      <circle cx="-8" cy="-10" r="2.6" fill="#1F2A44" />
      <circle cx="8" cy="-10" r="2.6" fill="#1F2A44" />
      <text x="0" y="17" textAnchor="middle" dominantBaseline="middle" fontFamily="Nunito, sans-serif" fontWeight={800} fontSize={fontFor(name, 15, 12)} fill="#1F2A44">
        {name}
      </text>
    </svg>
  )
}

function MachineBackground() {
  const blink = (delay: number) => ({ animate: { opacity: [1, 0.25] }, transition: { duration: 0.5, delay, repeat: Infinity, repeatType: 'reverse' as const, ease: 'linear' as const } })
  const lights = Array.from({ length: 11 }, (_, i) => 180 + i * 46)
  return (
    <svg width="1280" height="720" viewBox="0 0 1280 720" className="absolute inset-0" aria-hidden="true">
      <defs>
        <pattern id="clDots" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="#F3E9FF" />
          <circle cx="12" cy="12" r="4" fill="#E6D8FF" />
          <circle cx="36" cy="36" r="4" fill="#E6D8FF" />
        </pattern>
      </defs>
      <rect width="1280" height="720" fill="url(#clDots)" />
      <rect y="610" width="1280" height="110" fill="#E3D5FF" />
      <rect x="140" y="96" width="540" height="560" rx="34" fill="#E9719A" />
      <rect x="150" y="86" width="520" height="100" rx="30" fill="#FF8FB1" />
      <text x="410" y="138" textAnchor="middle" dominantBaseline="middle" fontFamily="'Baloo 2', Nunito, sans-serif" fontWeight={800} fontSize="40" fill="#FFFFFF" stroke="#C2456F" strokeWidth="2" paintOrder="stroke">
        Máy gắp tên
      </text>
      <motion.g fill="#FFD15C" {...blink(0)}>
        {lights.map((x, i) => (i % 2 === 0 ? <circle key={`t${x}`} cx={x} cy="100" r="8" /> : <circle key={`b${x}`} cx={x} cy="174" r="8" />))}
      </motion.g>
      <motion.g fill="#FFFFFF" {...blink(0.5)}>
        {lights.map((x, i) => (i % 2 === 1 ? <circle key={`t${x}`} cx={x} cy="100" r="8" /> : <circle key={`b${x}`} cx={x} cy="174" r="8" />))}
      </motion.g>
      <rect x="174" y="206" width="472" height="300" rx="18" fill="#E8F4FF" />
      <rect x="174" y="206" width="472" height="14" fill="#C9D9F0" />
      <rect x="150" y="520" width="520" height="120" rx="20" fill="#FF8FB1" />
      <rect x="180" y="540" width="120" height="80" rx="14" fill="#1F2A44" />
      <rect x="192" y="552" width="96" height="40" rx="8" fill="#3B4766" />
      <circle cx="450" cy="590" r="26" fill="#C2456F" />
      <circle cx="560" cy="580" r="38" fill="#E0A800" />
      <rect x="190" y="640" width="40" height="30" rx="8" fill="#C2456F" />
      <rect x="590" y="640" width="40" height="30" rx="8" fill="#C2456F" />
      <Twinkle x={760} y={140} size={32} fill="#FFD15C" />
      <Twinkle x={110} y={300} size={24} fill="#FFFFFF" delay={0.7} />
      <Twinkle x={730} y={560} size={20} fill="#FFFFFF" delay={1.2} />
    </svg>
  )
}
