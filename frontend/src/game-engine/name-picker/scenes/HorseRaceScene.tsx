import { motion } from 'motion/react'
import { useState } from 'react'
import { Cloud, Countdown, Crown } from '@/game-engine/name-picker/effects'
import { fontFor, LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'

const COAT_COLORS = ['#C98B5A', '#F2C27A', '#8C6A55', '#E8E1D6', '#B5643C']
const LANE_TOP = 166
const LANE_GAP = 82
const START_LEFT = 56
/** Horse nose crosses the finish line (x = 1118). */
const WIN_X = 960
const COUNT_MS = 750
const GO_AT = COUNT_MS * 3
const RACE_S = 4

const LOSER_EASES: [number, number, number, number][] = [
  [0.15, 0.75, 0.35, 1],
  [0.25, 0.6, 0.4, 1],
  [0.2, 0.9, 0.5, 1],
  [0.55, 0.2, 0.45, 1],
]

const BUNTING = ['#F28C28', '#3563E9', '#2E9E6A', '#8B5CF6', '#E5484D', '#FFD15C']

export function HorseRaceScene({ slots, winnerSlot, phase, onFinish }: PickSceneProps) {
  const running = phase === 'run'
  const done = phase === 'done'
  const [go, setGo] = useState(false)
  // Losers stop short of the line; some sprint early and fade, so the winner overtakes late.
  const [plan] = useState(() =>
    slots.map((_, i) =>
      i === winnerSlot
        ? { x: WIN_X, ease: [0.55, 0.05, 0.3, 1] as [number, number, number, number] }
        : { x: 560 + Math.round(Math.random() * 320), ease: randomLoserEase() },
    ),
  )

  useSceneTimeline(running, [
    [GO_AT, () => setGo(true)],
    [GO_AT + RACE_S * 1000 + 150, onFinish],
  ])

  const moving = go || done

  return (
    <>
      <HorseBackground />
      {slots.map((student, i) => {
        const isWinner = done && i === winnerSlot
        const gallop = running && go
        return (
          <motion.div
            key={student.id}
            className="absolute h-[91px] w-[136px]"
            style={{ left: START_LEFT, top: LANE_TOP + i * LANE_GAP }}
            initial={{ x: 0 }}
            animate={{ x: moving ? plan[i].x : 0 }}
            transition={{ duration: RACE_S, ease: plan[i].ease }}
          >
            {gallop && <Dust />}
            <motion.div
              className="absolute inset-0"
              animate={
                isWinner
                  ? { y: [0, -24], rotate: [0, -7] }
                  : gallop
                    ? { y: [0, -8], rotate: [0, -3] }
                    : done
                      ? { y: 0, rotate: 0 }
                      : { y: [0, -3] }
              }
              transition={isWinner ? { duration: 0.45, ...LOOP } : gallop ? { duration: 0.28, ...LOOP } : { duration: 0.8, ...LOOP }}
            >
              <Horse name={student.name} color={COAT_COLORS[i % COAT_COLORS.length]} galloping={gallop} />
            </motion.div>
            {isWinner && <Crown width={54} left={84} top={-40} />}
          </motion.div>
        )
      })}
      {running && <Countdown steps={['3', '2', '1', 'Chạy!']} stepMs={COUNT_MS} left={540} top={260} accent="#FFD15C" ink="#E5484D" />}
    </>
  )
}

function randomLoserEase() {
  return LOSER_EASES[Math.floor(Math.random() * LOSER_EASES.length)]
}

function Dust() {
  return (
    <div className="absolute -left-[30px] top-14 h-[30px] w-[60px]" aria-hidden="true">
      {[
        { left: 30, top: 8, size: 18, delay: 0 },
        { left: 22, top: 2, size: 14, delay: 0.18 },
        { left: 34, top: 14, size: 12, delay: 0.36 },
      ].map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: d.left, top: d.top, width: d.size, height: d.size }}
          animate={{ x: [0, -46], y: [0, -8], scale: [0.4, 1.5], opacity: [0.85, 0] }}
          transition={{ duration: 0.55, delay: d.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

const LEG_ORIGIN = { transformBox: 'fill-box' as const, originX: 0.5, originY: 0.08 }

function Horse({ name, color, galloping }: { name: string; color: string; galloping: boolean }) {
  const swing = (reverse: boolean) =>
    galloping
      ? { animate: { rotate: reverse ? [-32, 32] : [32, -32] }, transition: { duration: 0.28, ...LOOP } }
      : { animate: { rotate: 0 }, transition: { duration: 0.2 } }

  return (
    <svg width="136" height="91" viewBox="-12 -14 162 108" className="overflow-visible" style={{ color }} aria-hidden="true">
      <motion.path
        d="M20 36 C2 30 -6 52 6 66 C10 54 14 48 24 46Z"
        fill="#3B2A1E"
        style={{ transformBox: 'fill-box', originX: 1, originY: 0.1 }}
        animate={{ rotate: [-10, 16] }}
        transition={{ duration: galloping ? 0.28 : 1.3, ...LOOP }}
      />
      {[24, 76].map((x) => (
        <motion.g key={x} style={LEG_ORIGIN} {...swing(true)}>
          <rect x={x} y="52" width="11" height="34" rx="5" fill="currentColor" opacity="0.8" />
          <rect x={x} y="80" width="11" height="7" rx="3" fill="#3B2A1E" />
        </motion.g>
      ))}
      {[36, 88].map((x) => (
        <motion.g key={x} style={LEG_ORIGIN} {...swing(false)}>
          <rect x={x} y="54" width="11" height="34" rx="5" fill="currentColor" />
          <rect x={x} y="82" width="11" height="7" rx="3" fill="#3B2A1E" />
        </motion.g>
      ))}
      <ellipse cx="62" cy="44" rx="46" ry="23" fill="currentColor" />
      <path d="M90 42 L106 8 L126 16 L108 54Z" fill="currentColor" />
      <ellipse cx="124" cy="22" rx="21" ry="13" transform="rotate(22 124 22)" fill="currentColor" />
      <ellipse cx="138" cy="30" rx="9" ry="7.5" fill="#FFFFFF" opacity="0.35" />
      <path d="M108 6 L111 -8 L118 6Z" fill="currentColor" />
      <path d="M104 2 C94 12 90 26 88 40 L97 37 C99 24 103 14 110 7Z" fill="#3B2A1E" />
      <circle cx="121" cy="16" r="3.4" fill="#1F2A44" />
      <circle cx="122" cy="15" r="1.1" fill="#FFFFFF" />
      <rect x="30" y="26" width="68" height="28" rx="8" fill="#FFFFFF" />
      <text x="64" y="41" textAnchor="middle" dominantBaseline="middle" fontFamily="Nunito, sans-serif" fontWeight={800} fontSize={fontFor(name, 17, 14)} fill="#1F2A44">
        {name}
      </text>
    </svg>
  )
}

function Flower({ x, y, petal, spin }: { x: number; y: number; petal: string; spin?: boolean }) {
  return (
    <motion.g
      style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
      animate={spin ? { rotate: 360 } : undefined}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    >
      <g transform={`translate(${x} ${y})`}>
        <circle cx="0" cy="-7" r="5" fill={petal} />
        <circle cx="7" cy="0" r="5" fill={petal} />
        <circle cx="0" cy="7" r="5" fill={petal} />
        <circle cx="-7" cy="0" r="5" fill={petal} />
        <circle cx="0" cy="0" r="4" fill="#F28C28" />
      </g>
    </motion.g>
  )
}

function HorseBackground() {
  const wave = { transformBox: 'fill-box' as const, originX: 0.5, originY: 0 }
  return (
    <svg width="1280" height="720" viewBox="0 0 1280 720" className="absolute inset-0" aria-hidden="true">
      <defs>
        <pattern id="hrChk" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#FFFFFF" />
          <rect width="12" height="12" fill="#1F2A44" />
          <rect x="12" y="12" width="12" height="12" fill="#1F2A44" />
        </pattern>
      </defs>
      <rect width="1280" height="720" fill="#CFE8FF" />
      <motion.circle
        cx="1150" cy="120" r="64" fill="#FFD15C" opacity="0.25"
        style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
        animate={{ scale: [1, 1.12] }}
        transition={{ duration: 1.5, ...LOOP }}
      />
      <circle cx="1150" cy="120" r="46" fill="#FFD15C" />
      <Cloud x={170} y={96} scale={1.1} duration={18} />
      <Cloud x={560} y={70} scale={0.8} duration={24} drift={-30} />
      <Cloud x={880} y={104} scale={0.9} duration={20} />
      <path d="M0 170 Q 220 110 470 160 T 920 150 T 1280 140 V 720 H0Z" fill="#B9E4A8" />
      <rect x="0" y="176" width="1280" height="410" fill="#E9CFA6" />
      <rect x="0" y="170" width="1280" height="8" fill="#FFFFFF" />
      <rect x="0" y="584" width="1280" height="8" fill="#FFFFFF" />
      {[258, 340, 422, 504].map((y) => (
        <line key={y} x1="0" y1={y} x2="1280" y2={y} stroke="#FFFFFF" strokeWidth="3" strokeDasharray="18 14" opacity="0.8" />
      ))}
      <rect x="1118" y="176" width="24" height="410" fill="url(#hrChk)" />
      <rect x="1112" y="120" width="8" height="64" fill="#FFFFFF" />
      <rect x="1140" y="120" width="8" height="64" fill="#FFFFFF" />
      <motion.g style={wave} animate={{ rotate: [-6, 6] }} transition={{ duration: 1.4, ...LOOP }}>
        <rect x="1084" y="104" width="92" height="34" rx="10" fill="#E5484D" />
        <text x="1130" y="122" textAnchor="middle" dominantBaseline="middle" fontFamily="'Baloo 2', Nunito, sans-serif" fontWeight={800} fontSize="20" fill="#FFFFFF">
          Đích
        </text>
      </motion.g>
      <line x1="0" y1="144" x2="1280" y2="144" stroke="#FFFFFF" strokeWidth="3" />
      {Array.from({ length: 22 }, (_, i) => (
        <motion.path
          key={i}
          d={`M${i * 58} 144 L${i * 58 + 58} 144 L${i * 58 + 29} 168Z`}
          fill={BUNTING[i % BUNTING.length]}
          style={wave}
          animate={{ rotate: [-8, 8] }}
          transition={{ duration: 1.2, delay: (i % 4) * 0.15, ...LOOP }}
        />
      ))}
      <rect x="40" y="176" width="28" height="410" fill="#FFFFFF" opacity="0.6" />
      <Flower x={90} y={640} petal="#FF8FB1" spin />
      <Flower x={260} y={700} petal="#FFD15C" />
      <Flower x={160} y={612} petal="#FFFFFF" spin />
      <Flower x={1030} y={650} petal="#FFFFFF" spin />
      <Flower x={1210} y={690} petal="#FF8FB1" />
      <Flower x={1150} y={620} petal="#FFD15C" spin />
    </svg>
  )
}
