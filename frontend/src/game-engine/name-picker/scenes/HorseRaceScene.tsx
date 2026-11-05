import i18n from 'i18next'
import { motion } from 'motion/react'
import { useState, useEffect } from 'react'
import { BLEED, BLEED_W, BLEED_X, Countdown, Crown, SceneSvg } from '@/game-engine/name-picker/effects'
import { horseRacePlan, RACE_STRETCHES } from '@/game-engine/name-picker/horseRace'
import { HORSE_H, HORSE_W, raceLayout, TRACK } from '@/game-engine/name-picker/raceLayout'
import { fontFor, LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'
import { useSound } from '@/sound/useSound'

const ART = '/assets/games/horse-race'
/** Horses take these coats in turn, each with its own saddle, so a class can tell them apart. */
const COATS = ['golden', 'brown', 'white', 'chestnut', 'black']
/** The race plan runs to this; each horse's own run is scaled to the distance from its place to the finish. */
const PLAN_X = 1000
const COUNT_MS = 750
const GO_AT = COUNT_MS * 3
const RACE_S = 7
/** When each stretch of the race ends, 0 to 1. */
const STRETCH_TIMES = Array.from({ length: RACE_STRETCHES + 1 }, (_, i) => i / RACE_STRETCHES)

/** The bunting picture is drawn 300 wide, strung across the stage and its side bleed. */
const BUNTING_W = 300
/** The bunting picture is 600 × 137. */
const BUNTING_H = Math.round((BUNTING_W * 137) / 600)
const BUNTING_X = -BUNTING_W * Math.ceil(BLEED / BUNTING_W)
const BUNTINGS = Math.ceil((1280 + BLEED - BUNTING_X) / BUNTING_W)
/** Hills behind the track and the grass along its lower edge repeat the same way, keeping their shape (700 × 196, 900 × 73). */
const HILLS_W = 320
const HILLS_H = Math.round((HILLS_W * 196) / 700)
const GRASS_W = 560
const GRASS_H = Math.round((GRASS_W * 73) / 900)
const repeatAcross = (width: number) => {
  const first = -width * Math.ceil(BLEED / width)
  return Array.from({ length: Math.ceil((1280 + BLEED - first) / width) }, (_, i) => first + i * width)
}

export function HorseRaceScene({ slots, winnerSlot, phase, onFinish }: PickSceneProps) {
  const running = phase === 'run'
  const done = phase === 'done'
  const [go, setGo] = useState(false)
  // Every horse speeds up and slows down at random along the way; the winner crosses the line at the very end.
  // One horse per student; smaller horses, a few deep in each lane, when the class is big.
  const [field] = useState(() => raceLayout(slots.length))
  const [plan] = useState(() =>
    horseRacePlan(slots.length, winnerSlot, PLAN_X).map((xs, i) => xs.map((x) => Math.round((x * (field.spots[i]?.distance ?? PLAN_X)) / PLAN_X))),
  )

  useSceneTimeline(running, [
    [GO_AT, () => setGo(true)],
    [GO_AT + RACE_S * 1000 + 150, onFinish],
  ])

  // Hooves while the horses run.
  const sound = useSound()
  const galloping = go && running
  useEffect(() => (galloping ? sound.loop('gallop') : undefined), [galloping, sound])

  const moving = go || done

  return (
    <>
      <HorseBackground lanes={field.lanes} />
      {/* Lane by lane from the back of the track, so the horses nearer the front are drawn over the ones behind. */}
      {slots
        .map((student, i) => ({ student, i, spot: field.spots[i] }))
        .filter((h) => h.spot)
        .sort((a, b) => a.spot.lane - b.spot.lane || a.spot.left - b.spot.left)
        .map(({ student, i, spot }) => {
        const isWinner = done && i === winnerSlot
        const gallop = running && go
        return (
          <motion.div
            key={student.id}
            className="absolute"
            style={{ left: spot.left, top: spot.top, width: HORSE_W * field.scale, height: HORSE_H * field.scale }}
            initial={{ x: 0 }}
            animate={{ x: moving ? plan[i] : 0 }}
            transition={{ duration: RACE_S, times: STRETCH_TIMES, ease: 'linear' }}
          >
          <div className="absolute top-0 left-0" style={{ width: HORSE_W, height: HORSE_H, transform: `scale(${field.scale})`, transformOrigin: '0 0' }}>
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
              <Horse name={student.name} coat={COATS[i % COATS.length]} scale={field.scale} />
            </motion.div>
            {isWinner && <Crown width={46} left={64} top={-22} />}
            {isWinner && <WinnerStars />}
          </div>
          </motion.div>
        )
      })}
      {running && <Countdown steps={['3', '2', '1', i18n.t('play.picker.run')]} stepMs={COUNT_MS} left={540} top={260} accent="#FFD15C" ink="#E5484D" />}
    </>
  )
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

/** The painted horse with the student's name on its side, the name kept readable however small the horse. */
function Horse({ name, coat, scale }: { name: string; coat: string; scale: number }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <img src={`${ART}/horse-${coat}.webp`} alt="" draggable={false} className="block h-full w-full select-none" />
      <span
        className="absolute top-[47%] left-[4%] max-w-[110%] -translate-y-1/2 truncate rounded-lg bg-white px-2 py-0.5 font-extrabold leading-tight text-[#1F2A44] shadow-[0_2px_0_rgba(31,42,68,0.18)]"
        style={{ fontSize: Math.max(fontFor(name, 17, 14), 12 / scale) }}
      >
        {name}
      </span>
    </div>
  )
}

/** Gold stars popping around the winning horse. */
function WinnerStars() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {[
        { x: -26, y: -10, size: 30, delay: 0 },
        { x: 112, y: -18, size: 26, delay: 0.25 },
        { x: 118, y: 52, size: 22, delay: 0.5 },
        { x: -18, y: 60, size: 20, delay: 0.75 },
      ].map((star, i) => (
        <motion.img
          key={i}
          src={`${ART}/star.webp`}
          alt=""
          className="absolute"
          style={{ left: star.x, top: star.y, width: star.size }}
          animate={{ scale: [0.6, 1.15], rotate: [-12, 12], opacity: [0.7, 1] }}
          transition={{ duration: 0.7, delay: star.delay, ...LOOP }}
        />
      ))}
    </div>
  )
}

function Flower({ x, y, size = 30, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return (
    <motion.image
      href={`${ART}/flower.webp`}
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      style={{ transformBox: 'fill-box', originX: 0.5, originY: 1 }}
      animate={{ rotate: [-8, 8] }}
      transition={{ duration: 1.6, delay, ...LOOP }}
    />
  )
}

function HorseBackground({ lanes }: { lanes: number }) {
  const wave = { transformBox: 'fill-box' as const, originX: 0.5, originY: 0 }
  return (
    <SceneSvg>
      <defs>
        <pattern id="hrChk" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#FFFFFF" />
          <rect width="12" height="12" fill="#1F2A44" />
          <rect x="12" y="12" width="12" height="12" fill="#1F2A44" />
        </pattern>
      </defs>
      <rect x={BLEED_X} width={BLEED_W} height="720" fill="#CFE8FF" />
      <motion.circle
        cx="1150" cy="120" r="64" fill="#FFD15C" opacity="0.25"
        style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
        animate={{ scale: [1, 1.12] }}
        transition={{ duration: 1.5, ...LOOP }}
      />
      <circle cx="1150" cy="120" r="46" fill="#FFD15C" />
      <rect x={BLEED_X} y="160" width={BLEED_W} height="560" fill="#B9E4A8" />
      {repeatAcross(HILLS_W).map((x) => (
        <image key={x} href={`${ART}/hills.webp`} x={x} y={178 - HILLS_H} width={HILLS_W + 1} height={HILLS_H} preserveAspectRatio="none" />
      ))}
      {/* In the open sky between the buttons, in front of the hills so none is cut off. */}
      <SpriteCloud src="cloud-1" x={350} y={14} width={140} duration={18} drift={24} />
      <SpriteCloud src="cloud-2" x={545} y={4} width={104} duration={24} drift={-20} />
      <SpriteCloud src="cloud-3" x={690} y={26} width={104} duration={20} drift={16} />
      <rect x={BLEED_X} y="176" width={BLEED_W} height="410" fill="#E9CFA6" />
      <rect x={BLEED_X} y="170" width={BLEED_W} height="8" fill="#FFFFFF" />
      <rect x={BLEED_X} y="584" width={BLEED_W} height="8" fill="#FFFFFF" />
      {Array.from({ length: lanes - 1 }, (_, k) => TRACK.top + ((TRACK.bottom - TRACK.top) * (k + 1)) / lanes).map((y) => (
        <line key={y} x1={BLEED_X} y1={y} x2={1280 + BLEED} y2={y} stroke="#FFFFFF" strokeWidth={lanes > 8 ? 2 : 3} strokeDasharray="18 14" opacity="0.8" />
      ))}
      <rect x="1118" y="176" width="24" height="410" fill="url(#hrChk)" />
      <rect x="1112" y="120" width="8" height="64" fill="#FFFFFF" />
      <rect x="1140" y="120" width="8" height="64" fill="#FFFFFF" />
      <motion.g style={wave} animate={{ rotate: [-6, 6] }} transition={{ duration: 1.4, ...LOOP }}>
        <rect x="1084" y="104" width="92" height="34" rx="10" fill="#E5484D" />
        <text x="1130" y="122" textAnchor="middle" dominantBaseline="middle" fontFamily="'Baloo 2', Nunito, sans-serif" fontWeight={800} fontSize="20" fill="#FFFFFF">
          {i18n.t('play.picker.finishLine')}
        </text>
      </motion.g>
      {Array.from({ length: BUNTINGS }, (_, i) => (
        <motion.image
          key={i}
          href={`${ART}/bunting.webp`}
          x={BUNTING_X + i * BUNTING_W}
          y="112"
          width={BUNTING_W + 4}
          height={BUNTING_H}
          preserveAspectRatio="none"
          style={wave}
          animate={{ rotate: [-2, 2] }}
          transition={{ duration: 1.4, delay: (i % 3) * 0.2, ...LOOP }}
        />
      ))}
      <rect x="40" y="176" width="28" height="410" fill="#FFFFFF" opacity="0.6" />
      {repeatAcross(GRASS_W).map((x) => (
        <image key={x} href={`${ART}/grass.webp`} x={x} y="580" width={GRASS_W + 1} height={GRASS_H} preserveAspectRatio="none" />
      ))}
      <Flower x={90} y={650} />
      <Flower x={260} y={696} size={26} delay={0.4} />
      <Flower x={170} y={672} size={22} delay={0.8} />
      <Flower x={1040} y={660} delay={0.2} />
      <Flower x={1210} y={694} size={26} delay={0.6} />
      <Flower x={1140} y={676} size={22} delay={1} />
    </SceneSvg>
  )
}

function SpriteCloud({ src, x, y, width, drift = 40, duration = 20 }: { src: string; x: number; y: number; width: number; drift?: number; duration?: number }) {
  return (
    <motion.image
      href={`${ART}/${src}.webp`}
      x={x}
      y={y}
      width={width}
      animate={{ x: [-drift, drift] }}
      transition={{ duration, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
    />
  )
}
