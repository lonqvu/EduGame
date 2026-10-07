import { motion } from 'motion/react'
import { useState } from 'react'
import { Cloud, Countdown, Crown } from '@/game-engine/name-picker/effects'
import { fontFor, LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'

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
              <Horse name={student.name} lane={i} galloping={gallop} />
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
          className="absolute rounded-full bg-[#F3DDB8]"
          style={{ left: d.left, top: d.top, width: d.size, height: d.size }}
          animate={{ x: [0, -46], y: [0, -8], scale: [0.4, 1.5], opacity: [0.85, 0] }}
          transition={{ duration: 0.55, delay: d.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

interface Coat {
  body: string
  /** Flat darker tone for the belly and the far-side legs. */
  shade: string
  mane: string
  muzzle: string
  blaze?: boolean
  dapples?: boolean
  /** White socks: [far back, near back, far front, near front]. */
  socks?: [boolean, boolean, boolean, boolean]
}

/** Chestnut, palomino, bay, grey, black. */
const COATS: Coat[] = [
  { body: '#C27A4A', shade: '#A4613A', mane: '#5A3320', muzzle: '#E2B08A', blaze: true },
  { body: '#E9B96E', shade: '#D29E52', mane: '#FFF3D6', muzzle: '#F6DDB0', socks: [false, false, true, true] },
  { body: '#8A5A3C', shade: '#6F4630', mane: '#2B1D16', muzzle: '#B48463', socks: [true, true, false, false] },
  { body: '#D9D2C8', shade: '#BDB4A8', mane: '#7E776F', muzzle: '#F2EEE8', dapples: true },
  { body: '#4A3C36', shade: '#372C28', mane: '#1E1714', muzzle: '#6E5B52', blaze: true, socks: [true, true, true, true] },
]

/** Saddle-cloth colour per lane. */
const CLOTHS = ['#E5484D', '#3563E9', '#2E9E6A', '#8B5CF6', '#E07A12']

const INK = '#2B1D16'
const LEG_ORIGIN = { transformBox: 'fill-box' as const, originX: 0.5, originY: 0.08 }

function Leg({ x, fill, sock }: { x: number; fill: string; sock: boolean }) {
  return (
    <>
      <path d={`M${x} 54 H${x + 13} L${x + 11} 70 L${x + 11} 84 H${x + 2} L${x + 2} 70 Z`} fill={fill} />
      {sock && <rect x={x + 2} y="74" width="9" height="10" fill="#FFFFFF" />}
      <path d={`M${x + 1} 83 H${x + 12} L${x + 13} 90 H${x} Z`} fill={INK} />
    </>
  )
}

function Horse({ name, lane, galloping }: { name: string; lane: number; galloping: boolean }) {
  const coat = COATS[lane % COATS.length]
  const cloth = CLOTHS[lane % CLOTHS.length]
  const socks = coat.socks ?? [false, false, false, false]
  const swing = (reverse: boolean) =>
    galloping
      ? { animate: { rotate: reverse ? [-32, 32] : [32, -32] }, transition: { duration: 0.28, ...LOOP } }
      : { animate: { rotate: 0 }, transition: { duration: 0.2 } }

  return (
    <svg width="136" height="91" viewBox="-12 -14 162 108" className="overflow-visible" aria-hidden="true">
      {/* Tail */}
      <motion.path
        d="M26 32 C10 26 -2 36 -6 56 C0 50 5 48 9 48 C5 55 5 63 8 68 C12 59 17 52 26 44 Z"
        fill={coat.mane}
        style={{ transformBox: 'fill-box', originX: 1, originY: 0.1 }}
        animate={{ rotate: [-10, 16] }}
        transition={{ duration: galloping ? 0.28 : 1.3, ...LOOP }}
      />
      {/* Far-side legs */}
      {[22, 80].map((x, i) => (
        <motion.g key={x} style={LEG_ORIGIN} {...swing(true)}>
          <Leg x={x} fill={coat.shade} sock={socks[i * 2]} />
        </motion.g>
      ))}
      {/* Near-side legs */}
      {[34, 92].map((x, i) => (
        <motion.g key={x} style={LEG_ORIGIN} {...swing(false)}>
          <Leg x={x} fill={coat.body} sock={socks[i * 2 + 1]} />
        </motion.g>
      ))}
      {/* Body, belly and chest */}
      <path d="M20 40 C20 26 34 20 52 21 L88 21 C102 21 112 28 113 41 C114 55 104 64 88 64 L44 64 C28 64 20 54 20 40 Z" fill={coat.body} />
      <path d="M28 56 C42 64 92 66 108 52 C105 60 98 64 88 64 L44 64 C36 64 31 61 28 56 Z" fill={coat.shade} />
      {coat.dapples &&
        [
          [34, 34, 4],
          [44, 46, 3],
          [30, 48, 3],
          [100, 44, 3.5],
          [106, 34, 2.5],
        ].map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ECE7E0" />)}
      {/* Neck and head */}
      <path d="M90 30 C94 16 102 5 113 2 L125 9 C119 20 113 34 110 48 C104 44 96 38 90 30 Z" fill={coat.body} />
      <path d="M109 1 C117 -5 130 -1 136 9 L146 23 C149 30 145 36 138 36 C132 36 127 32 123 27 L111 15 Z" fill={coat.body} />
      <ellipse cx="140" cy="29" rx="8.5" ry="7" transform="rotate(32 140 29)" fill={coat.muzzle} />
      {coat.blaze && <path d="M125 5 C130 10 135 17 139 23 L136 25 C132 19 127 12 123 7 Z" fill="#FFFFFF" />}
      <circle cx="143" cy="28" r="1.7" fill={INK} />
      <path d="M134 34 Q138 36 142 34" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Ears */}
      <path d="M106 4 L104 -9 L113 1 Z" fill={coat.shade} />
      <path d="M111 1 L112 -13 L120 -1 Z" fill={coat.body} />
      <path d="M113 -1 L113.5 -8 L117 -1 Z" fill="#F2A7A0" />
      {/* Eye */}
      <ellipse cx="124" cy="12" rx="3.4" ry="3.8" fill={INK} />
      <circle cx="125.2" cy="10.6" r="1.2" fill="#FFFFFF" />
      <path d="M120.5 9 L118.5 7" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      {/* Mane and forelock */}
      <path
        d="M112 -1 C103 1 97 8 93 16 C90 22 89 29 88 37 L93 34 C93 29 95 25 98 22 C97 28 97 33 98 37 L102 31 C102 25 104 19 108 13 C108 18 108 22 109 25 L112 18 C112 11 113 6 116 2 Z"
        fill={coat.mane}
      />
      <path d="M114 1 C120 2 123 6 121 11 C119 8 116 6 112 5 Z" fill={coat.mane} />
      {/* Bridle and rein */}
      <path d="M119 5 L135 26 M131 20 L144 22" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M135 27 C122 38 104 32 92 25" stroke={INK} strokeWidth="1.6" fill="none" />
      {/* Saddle cloth carrying the name, saddle on top */}
      <path d="M34 22 H100 L98 50 C98 53 96 55 93 55 H41 C38 55 36 53 36 50 Z" fill={cloth} />
      <path d="M36 48 H98 L97.6 51 H36.3 Z" fill="#FFFFFF" opacity="0.9" />
      <path d="M46 22 C50 14 82 14 88 22 Z" fill="#5B3A24" />
      <rect x="62" y="16" width="12" height="4" rx="2" fill="#8A5A3C" />
      <text
        x="67"
        y="35"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Nunito, sans-serif"
        fontWeight={900}
        fontSize={fontFor(name, 17, 14)}
        fill="#FFFFFF"
      >
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

/** Deterministic pseudo-random sequence so the scenery is the same every round. */
function scatter(count: number, seed: number) {
  let v = seed
  return Array.from({ length: count }, () => {
    v = (v * 9301 + 49297) % 233280
    return v / 233280
  })
}

const STAND = { left: 336, right: 772, top: 62 }
const SKIN = ['#F5CBA7', '#E0A97E', '#C68B5E', '#8D5A3B', '#F7D7BC']
const HAIR = ['#2B1D16', '#5A3320', '#1F2A44', '#7A4A1E', '#E5484D', '#3563E9', '#FFD15C', '#2E9E6A']

const CROWD = (() => {
  const r = scatter(90, 7)
  const people: { x: number; y: number; skin: string; top: string; delay: number }[] = []
  ;[96, 116, 136].forEach((y, row) => {
    for (let x = STAND.left + 20 + row * 9; x < STAND.right - 14; x += 19) {
      const k = people.length
      people.push({ x, y, skin: SKIN[Math.floor(r[k % 90] * SKIN.length)], top: HAIR[(k * 5 + row) % HAIR.length], delay: r[(k + 31) % 90] * 1.2 })
    }
  })
  return people
})()

const PEBBLES = (() => {
  const r = scatter(160, 3)
  return Array.from({ length: 80 }, (_, i) => ({ x: r[i * 2] * 1280, y: 184 + r[i * 2 + 1] * 394, w: 3 + (i % 3) * 2 }))
})()

const TREES = [
  { x: 60, y: 120, s: 1 },
  { x: 140, y: 112, s: 0.8 },
  { x: 236, y: 122, s: 1.1 },
  { x: 860, y: 118, s: 0.9 },
  { x: 940, y: 110, s: 1.15 },
  { x: 1236, y: 116, s: 0.85 },
]

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-4" y="-6" width="8" height="34" rx="2" fill="#8A5A3C" />
      <circle cx="0" cy="-22" r="22" fill="#4FA55E" />
      <circle cx="-14" cy="-10" r="15" fill="#4FA55E" />
      <circle cx="14" cy="-8" r="16" fill="#4FA55E" />
      <circle cx="6" cy="-28" r="12" fill="#6CBF6E" />
      <circle cx="-10" cy="-16" r="7" fill="#6CBF6E" />
    </g>
  )
}

function GrassTuft({ x, y, color = '#8FCB7E' }: { x: number; y: number; color?: string }) {
  return <path d={`M${x} ${y} L${x + 4} ${y - 14} L${x + 7} ${y} L${x + 11} ${y - 18} L${x + 13} ${y} L${x + 18} ${y - 11} L${x + 20} ${y} Z`} fill={color} />
}

function Grandstand() {
  const { left, right, top } = STAND
  const width = right - left
  const scallops = Math.round(width / 31)
  return (
    <g>
      {/* Back wall and tiers */}
      <rect x={left} y={top + 18} width={width} height={88} fill="#F4E6CF" />
      {[0, 1, 2].map((row) => (
        <rect key={row} x={left + 6} y={top + 44 + row * 20} width={width - 12} height={8} fill="#D9C3A0" />
      ))}
      {/* Crowd: heads bob a little out of step */}
      {CROWD.map((p, i) => (
        <motion.g key={i} animate={{ y: [0, -3] }} transition={{ duration: 0.5 + (i % 4) * 0.12, delay: p.delay, ...LOOP }}>
          <rect x={p.x - 7} y={p.y + 4} width={14} height={12} rx={5} fill={HAIR[(i + 3) % HAIR.length]} />
          <circle cx={p.x} cy={p.y} r={6.5} fill={p.skin} />
          <path d={`M${p.x - 6.5} ${p.y - 1} A6.5 6.5 0 0 1 ${p.x + 6.5} ${p.y - 1} Z`} fill={p.top} />
        </motion.g>
      ))}
      {/* Pillars */}
      {[left, left + width / 2 - 4, right - 8].map((x) => (
        <rect key={x} x={x} y={top + 18} width={8} height={88} fill="#B9533F" />
      ))}
      {/* Striped awning with scalloped edge */}
      <path d={`M${left - 14} ${top + 22} L${left + 10} ${top} H${right - 10} L${right + 14} ${top + 22} Z`} fill="#FFFFFF" />
      {Array.from({ length: scallops }, (_, i) => {
        const x0 = left - 14 + (i * (width + 28)) / scallops
        const w = (width + 28) / scallops
        return (
          <g key={i}>
            {i % 2 === 0 && <path d={`M${x0} ${top + 22} L${x0 + w} ${top + 22} L${x0 + w - 2} ${top} L${x0 + 2} ${top} Z`} fill="#E5484D" />}
            <path d={`M${x0} ${top + 22} A${w / 2} ${w / 2.6} 0 0 0 ${x0 + w} ${top + 22} Z`} fill={i % 2 === 0 ? '#E5484D' : '#FFFFFF'} />
          </g>
        )
      })}
      {/* Little flags on the roof */}
      {[left + 30, left + width / 2, right - 30].map((x, i) => (
        <g key={x}>
          <rect x={x - 1.5} y={top - 26} width={3} height={28} fill="#5B3A24" />
          <motion.path
            d={`M${x + 1.5} ${top - 26} L${x + 24} ${top - 19} L${x + 1.5} ${top - 12} Z`}
            fill={['#FFD15C', '#3563E9', '#2E9E6A'][i]}
            style={{ transformBox: 'fill-box', originX: 0, originY: 0.5 }}
            animate={{ scaleX: [1, 0.75] }}
            transition={{ duration: 0.9, delay: i * 0.2, ...LOOP }}
          />
        </g>
      ))}
    </g>
  )
}

function Fence({ y, from = 0, to = 1280 }: { y: number; from?: number; to?: number }) {
  return (
    <g fill="#FFFFFF">
      <rect x={from} y={y} width={to - from} height={5} rx={2} />
      <rect x={from} y={y + 12} width={to - from} height={5} rx={2} />
      {Array.from({ length: Math.ceil((to - from) / 46) + 1 }, (_, i) => (
        <rect key={i} x={from + i * 46} y={y - 6} width={7} height={30} rx={2} />
      ))}
    </g>
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

      {/* Sky */}
      <rect width="1280" height="720" fill="#CFE8FF" />
      <rect y="70" width="1280" height="110" fill="#DDF0FF" />
      <motion.circle
        cx="1150" cy="100" r="64" fill="#FFE59A"
        style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
        animate={{ scale: [1, 1.12] }}
        transition={{ duration: 1.5, ...LOOP }}
      />
      <circle cx="1150" cy="100" r="46" fill="#FFD15C" />
      <Cloud x={130} y={40} scale={0.8} duration={18} />
      <Cloud x={880} y={30} scale={0.7} duration={24} drift={-30} />

      {/* Rolling hills and trees */}
      <path d="M0 132 Q 160 86 330 120 T 700 118 T 1040 110 T 1280 116 V 200 H0 Z" fill="#A9D99A" />
      <path d="M0 150 Q 240 118 520 146 T 1000 140 T 1280 146 V 200 H0 Z" fill="#94CC85" />
      {TREES.map((t) => (
        <Tree key={t.x} {...t} />
      ))}

      <Grandstand />

      {/* Track */}
      <rect x="0" y="168" width="1280" height="420" fill="#E3BF8E" />
      <rect x="0" y="168" width="1280" height="14" fill="#D3AB76" />
      {PEBBLES.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={p.w * 0.6} rx={1} fill={i % 3 === 0 ? '#CFA46D' : '#EDCFA3'} />
      ))}
      {[258, 340, 422, 504].map((y) => (
        <line key={y} x1="0" y1={y} x2="1280" y2={y} stroke="#FFFFFF" strokeWidth="3" strokeDasharray="18 14" opacity="0.85" />
      ))}
      <rect x="0" y="582" width="1280" height="8" fill="#C99C62" />

      {/* Starting gate: one stall per lane, numbered */}
      <rect x="6" y="172" width="34" height="414" fill="#2E9E6A" />
      {[0, 1, 2, 3, 4].map((lane) => {
        const y = 176 + lane * 82
        return (
          <g key={lane}>
            <rect x="10" y={y + 4} width="26" height="74" fill="#3DB27C" />
            <rect x="6" y={y} width="34" height="6" fill="#1F7A52" />
            <circle cx="23" cy={y + 41} r="11" fill="#FFFFFF" />
            <text x="23" y={y + 42} textAnchor="middle" dominantBaseline="middle" fontFamily="'Baloo 2', Nunito, sans-serif" fontWeight={800} fontSize="15" fill="#1F7A52">
              {lane + 1}
            </text>
          </g>
        )
      })}

      {/* Finish line */}
      <rect x="1118" y="172" width="24" height="414" fill="url(#hrChk)" />
      <rect x="1110" y="96" width="8" height="80" fill="#FFFFFF" />
      <rect x="1142" y="96" width="8" height="80" fill="#FFFFFF" />
      <motion.g style={wave} animate={{ rotate: [-6, 6] }} transition={{ duration: 1.4, ...LOOP }}>
        <rect x="1084" y="82" width="92" height="34" rx="10" fill="#E5484D" />
        <text x="1130" y="100" textAnchor="middle" dominantBaseline="middle" fontFamily="'Baloo 2', Nunito, sans-serif" fontWeight={800} fontSize="20" fill="#FFFFFF">
          Đích
        </text>
      </motion.g>

      {/* Rails */}
      <Fence y={150} />

      {/* Infield */}
      <rect x="0" y="590" width="1280" height="130" fill="#B9E4A8" />
      <path d="M0 640 Q 200 618 420 640 T 860 636 T 1280 632 V 720 H0 Z" fill="#A9D99A" />
      <Fence y={600} />
      {[
        [30, 680], [210, 664], [330, 704], [470, 676], [800, 684], [930, 664], [1090, 704], [1240, 672],
      ].map(([x, y]) => (
        <GrassTuft key={x} x={x} y={y} />
      ))}
      {[
        [380, 714, 30], [880, 716, 24],
      ].map(([cx, cy, r]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r={r} fill="#6CBF6E" />
          <circle cx={cx + r * 0.9} cy={cy + 4} r={r * 0.75} fill="#4FA55E" />
          <circle cx={cx - r * 0.2} cy={cy - r * 0.45} r={4} fill="#FF8FB1" />
          <circle cx={cx + r} cy={cy - r * 0.2} r={3.5} fill="#FFFFFF" />
        </g>
      ))}
      <Flower x={90} y={660} petal="#FF8FB1" spin />
      <Flower x={260} y={700} petal="#FFD15C" />
      <Flower x={160} y={684} petal="#FFFFFF" spin />
      <Flower x={1030} y={670} petal="#FFFFFF" spin />
      <Flower x={1210} y={700} petal="#FF8FB1" />
      <Flower x={1150} y={652} petal="#FFD15C" spin />
    </svg>
  )
}
