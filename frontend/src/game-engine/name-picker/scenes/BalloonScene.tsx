import { motion } from 'motion/react'
import { useState } from 'react'
import { Cloud, Countdown, Crown, Twinkle } from '@/game-engine/name-picker/effects'
import { EASE_IN_OUT, fontFor, LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'

const COLUMNS = [160, 300, 440, 640, 860, 1000, 1140]
const COLORS = ['#7FB2FF', '#FF9C86', '#8BD3A8', '#FFD15C', '#C5A8FF', '#FF8FB1', '#7FD3E0']
const PEG_Y = [626, 618, 618, 622, 618, 612, 606]
const COUNT_MS = 600
const GO_AT = COUNT_MS * 3
const WIN_S = 4.6

interface Flight {
  dx: number
  dy: number
  scale: number
  seconds: number
}

export function BalloonScene({ slots, winnerSlot, phase, onFinish }: PickSceneProps) {
  const running = phase === 'run'
  const done = phase === 'done'
  const [go, setGo] = useState(false)
  const [popped, setPopped] = useState<number[]>([])

  // Losers rise until their pop time and burst one by one; the winner floats to the middle.
  const [flights] = useState<Flight[]>(() => {
    const order = slots.map((_, i) => i).filter((i) => i !== winnerSlot).sort(() => Math.random() - 0.5)
    const result: Flight[] = slots.map((_, i) => ({ dx: 640 - COLUMNS[i], dy: -330, scale: 1.45, seconds: WIN_S }))
    order.forEach((i, k) => {
      const seconds = 1 + k * 0.55
      result[i] = { dx: Math.round((Math.random() - 0.5) * 80), dy: -Math.round(120 + seconds * 55), scale: 1, seconds }
    })
    return result
  })

  useSceneTimeline(running, [
    [GO_AT, () => setGo(true)],
    ...slots
      .map((_, i) => i)
      .filter((i) => i !== winnerSlot)
      .map((i): [number, () => void] => [GO_AT + flights[i].seconds * 1000, () => setPopped((p) => [...p, i])]),
    [GO_AT + (WIN_S + 0.3) * 1000, onFinish],
  ])

  const flying = go || done

  return (
    <>
      <BalloonBackground />
      {slots.map((student, i) => {
        const f = flights[i]
        const isWinner = done && i === winnerSlot
        const isPopped = popped.includes(i)
        return (
          <motion.div
            key={student.id}
            className="absolute h-[220px] w-[120px]"
            style={{ left: COLUMNS[i] - 60, top: 440 }}
            initial={{ x: 0, y: 0, scale: 1 }}
            animate={flying ? { x: f.dx, y: f.dy, scale: f.scale } : { x: 0, y: 0, scale: 1 }}
            transition={{ duration: f.seconds, ease: i === winnerSlot ? EASE_IN_OUT : [0.3, 0.6, 0.5, 1] }}
          >
            {isWinner && (
              <motion.div
                className="absolute -top-[30px] -left-[30px] size-[180px] rounded-full bg-[#FFF3C4]"
                animate={{ scale: [0.9, 1.15], opacity: [0.55, 0.9] }}
                transition={{ duration: 0.8, ...LOOP }}
              />
            )}
            {!isPopped && (
              <motion.div
                className="absolute inset-0"
                style={{ originX: 0.5, originY: isWinner || flying ? 0.4 : 0.92 }}
                animate={isWinner ? { y: [0, -14], rotate: [-3, 3] } : { rotate: [-5, 5] }}
                transition={{ duration: isWinner ? 1.4 : flying ? 0.9 : 2.4, ...LOOP }}
              >
                <Balloon name={student.name} color={COLORS[i % COLORS.length]} />
              </motion.div>
            )}
            {isPopped && <Pop color={COLORS[i % COLORS.length]} />}
            {isWinner && <Crown width={80} left={20} top={-46} />}
          </motion.div>
        )
      })}
      {running && <Countdown steps={['3', '2', '1', 'Thả!']} stepMs={COUNT_MS} left={540} top={180} accent="#FF8FB1" ink="#C2456F" />}
    </>
  )
}

function Balloon({ name, color }: { name: string; color: string }) {
  return (
    <svg width="120" height="220" viewBox="-60 -80 120 220" className="overflow-visible" aria-hidden="true">
      <path d="M0 74 C-18 112 18 150 -6 200" fill="none" stroke="#8A94AD" strokeWidth="2.5" />
      <ellipse cx="0" cy="0" rx="52" ry="64" fill={color} />
      <path d="M-8 74 L8 74 L0 62Z" fill={color} />
      <ellipse cx="-22" cy="-27" rx="8" ry="15" transform="rotate(25 -22 -27)" fill="#FFFFFF" opacity="0.55" />
      <text x="0" y="4" textAnchor="middle" dominantBaseline="middle" fontFamily="'Baloo 2', Nunito, sans-serif" fontWeight={800} fontSize={fontFor(name, 19, 17)} fill="#1F2A44">
        {name}
      </text>
    </svg>
  )
}

function Pop({ color }: { color: string }) {
  return (
    <>
      <motion.svg
        width="140" height="140" viewBox="-70 -70 140 140"
        className="absolute -left-2.5 top-2.5 overflow-visible"
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: [0.3, 1.25, 1.4], opacity: [1, 1, 0] }}
        transition={{ duration: 0.75, times: [0, 0.6, 1] }}
        aria-hidden="true"
      >
        <path d="M0 -50 L10 -18 L42 -28 L20 0 L46 22 L10 15 L0 50 L-10 15 L-46 22 L-20 0 L-42 -28 L-10 -18Z" fill="#FFFFFF" />
        <text x="0" y="6" textAnchor="middle" dominantBaseline="middle" fontFamily="'Baloo 2', Nunito, sans-serif" fontWeight={800} fontSize="24" fill="#E5484D">
          Bụp!
        </text>
      </motion.svg>
      <motion.svg
        width="140" height="140" viewBox="-70 -70 140 140"
        className="absolute -left-2.5 top-2.5 overflow-visible"
        initial={{ scale: 0.4, opacity: 1, y: 0 }}
        animate={{ scale: 1.8, opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        aria-hidden="true"
      >
        {['M-40 -30 l12 -5 l-3 12z', 'M38 -26 l12 -4 l-3 12z', 'M-30 34 l12 -4 l-3 12z', 'M30 38 l12 -4 l-3 12z', 'M0 -58 l10 -3 l-2 10z'].map((d) => (
          <path key={d} d={d} fill={color} />
        ))}
      </motion.svg>
    </>
  )
}

function Bird({ y, delay }: { y: number; delay: number }) {
  const wing = { transformBox: 'fill-box' as const, originX: 0.5, originY: 1 }
  return (
    <motion.g animate={{ x: [-120, 1400] }} transition={{ duration: 9, delay, repeat: Infinity, ease: 'linear' }}>
      <g transform={`translate(0 ${y})`} fill="none" stroke="#4A5470" strokeWidth="3" strokeLinecap="round">
        <motion.path d="M0 0 q8 -10 16 0" style={wing} animate={{ scaleY: [1, -0.6] }} transition={{ duration: 0.35, ...LOOP }} />
        <motion.path d="M16 0 q8 -10 16 0" style={wing} animate={{ scaleY: [1, -0.6] }} transition={{ duration: 0.35, ...LOOP }} />
      </g>
    </motion.g>
  )
}

function BalloonBackground() {
  return (
    <svg width="1280" height="720" viewBox="0 0 1280 720" className="absolute inset-0" aria-hidden="true">
      <defs>
        <linearGradient id="blSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DDEBFF" />
          <stop offset="1" stopColor="#FFEFF4" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#blSky)" />
      <Cloud x={80} y={150} scale={1} duration={20} />
      <Cloud x={1080} y={120} scale={1.1} duration={26} drift={-40} />
      <Cloud x={820} y={300} scale={0.7} duration={22} />
      <Cloud x={250} y={320} scale={0.6} duration={18} drift={-30} />
      <Bird y={120} delay={0} />
      <Bird y={250} delay={4} />
      <Twinkle x={520} y={110} size={36} fill="#FFD15C" />
      <Twinkle x={770} y={120} size={28} fill="#FFD15C" delay={0.6} />
      <Twinkle x={960} y={240} size={20} fill="#FFFFFF" delay={1.1} />
      <Twinkle x={330} y={262} size={24} fill="#FFFFFF" delay={0.3} />
      <path d="M0 640 Q 320 590 640 630 T 1280 610 V 720 H0Z" fill="#B9E4A8" />
      <g fill="#8A5A3B">
        {COLUMNS.map((x, i) => (
          <rect key={x} x={x - 5} y={PEG_Y[i]} width="10" height="26" rx="3" />
        ))}
      </g>
    </svg>
  )
}
