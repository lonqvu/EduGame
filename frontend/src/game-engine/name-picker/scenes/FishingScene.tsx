import { animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls, type MotionValue, type ValueAnimationTransition } from 'motion/react'
import { useEffect, useState } from 'react'
import { SceneSvg } from '@/game-engine/name-picker/effects'
import { pondLayout, randomSpot, type FishSpot } from '@/game-engine/name-picker/pondLayout'
import { LOOP, type PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { useSceneTimeline } from '@/game-engine/name-picker/useSceneTimeline'
import { useSound } from '@/sound/useSound'

const ART = '/assets/games/fishing'
const FISH_COLORS = ['orange', 'blue', 'green', 'pink', 'purple', 'teal', 'yellow']
/**
 * The bear with its rod (bear-rod.webp, 453 × 370, drawn 320 wide) stands on the dock's deck. In the picture the rod's
 * tip is at (405, 46) and the paws at (200, 225); the line is drawn here, from the tip, so it can be cast and reeled.
 */
const BEAR = { left: 150, top: 235, width: 320 }
const BEAR_SCALE = BEAR.width / 453
const HAND = { x: BEAR.left + 200 * BEAR_SCALE, y: BEAR.top + 225 * BEAR_SCALE }
const TIP = { x: BEAR.left + 405 * BEAR_SCALE, y: BEAR.top + 46 * BEAR_SCALE }
/** Top of the water in the pond picture. */
const WATER_Y = 350
/** Where the bobber floats: by the dock before the cast, far out once cast, and where the catch is reeled up to. */
const BOBBER_REST = { x: TIP.x + 14, y: WATER_Y + 14 }
const BOBBER_CAST = { x: 800, y: WATER_Y + 18 }
const REELED = { x: TIP.x + 30, y: TIP.y + 34 }
/** How far the hook hangs under the bobber: a little at rest, deep where the fish are once it has sunk. */
const HOOK_REST = 34
const HOOK_DEEP = 130
/** The hook once it has sunk: where the chosen fish bites. */
const HOOK_CAST: FishSpot = { x: BOBBER_CAST.x, y: BOBBER_CAST.y + HOOK_DEEP }
/** The bear leans back with the rod before the cast (a little: the rod is part of its picture). */
const WIND_UP = -10

type Step = 'windup' | 'flying' | 'sinking' | 'approach' | 'bite' | 'reel'

/** The rod's tip once bear and rod lean by `deg` (they turn around the paws). */
function tipAt(deg: number): FishSpot {
  const a = (deg * Math.PI) / 180
  const dx = TIP.x - HAND.x
  const dy = TIP.y - HAND.y
  return { x: HAND.x + dx * Math.cos(a) - dy * Math.sin(a), y: HAND.y + dx * Math.sin(a) + dy * Math.cos(a) }
}

export function FishingScene({ slots, winnerSlot, phase, onFinish }: PickSceneProps) {
  const sound = useSound()
  const running = phase === 'run'
  const done = phase === 'done'
  const [step, setStep] = useState<Step | null>(null)
  const [splash, setSplash] = useState(false)
  // One fish per student; smaller fish when the class is big.
  const [pond] = useState(() => pondLayout(slots.length))
  const { fishW, fishH } = pond
  /** From a fish's centre to its mouth (the pictures face left; the mouth is a little in from the frame). */
  const mouth = fishW / 2 - fishW * 0.08

  // The rod's angle, the bobber, how deep the hook hangs under it and how slack the line is: all animated.
  const rod = useMotionValue(0)
  const bx = useMotionValue(BOBBER_REST.x)
  const by = useMotionValue(BOBBER_REST.y)
  const depth = useMotionValue(HOOK_REST)
  const sag = useMotionValue(24)
  const hookY = useTransform([by, depth], ([b, d]: number[]) => b + d)
  // From the rod's tip to the bobber, sagging when slack; then straight down to the hook.
  const line = useTransform([rod, bx, by, sag], ([deg, x, y, s]: number[]) => {
    const tip = tipAt(deg)
    return `M${tip.x} ${tip.y} Q ${(tip.x + x) / 2} ${(tip.y + y) / 2 + s} ${x} ${y}`
  })
  const leader = useTransform([bx, by, hookY], ([x, y, h]: number[]) => `M${x} ${y} L${x} ${h}`)

  const to = (value: MotionValue<number>, target: number | number[], options: ValueAnimationTransition<number>) => animate(value, target, options)

  useSceneTimeline(running, [
    // Wind up: the rod goes back over the shoulder, the bobber swings up out of the water behind it.
    [150, () => {
      setStep('windup')
      const back = tipAt(WIND_UP)
      to(rod, WIND_UP, { duration: 0.5, ease: 'easeOut' })
      to(bx, back.x - 24, { duration: 0.5, ease: 'easeOut' })
      to(by, back.y + 46, { duration: 0.5, ease: 'easeOut' })
      to(depth, 14, { duration: 0.4 })
      to(sag, 0, { duration: 0.3 })
    }],
    // The cast: the rod whips forward, the bobber flies up and out in an arc, the line trailing behind it.
    [750, () => {
      setStep('flying')
      sound.play('whoosh')
      to(rod, 7, { duration: 0.16, ease: 'easeIn' })
      to(bx, BOBBER_CAST.x, { duration: 1, ease: [0.3, 0.6, 0.6, 1] })
      to(by, [by.get(), 120, BOBBER_CAST.y], { duration: 1, times: [0, 0.42, 1], ease: ['easeOut', 'easeIn'] })
      to(sag, [0, -14, 10], { duration: 1 })
    }],
    [920, () => to(rod, 0, { duration: 0.7, ease: 'easeOut' })],
    // It lands: ripples, a little bob, the line goes slack and the hook sinks under the bobber.
    [1750, () => {
      setStep('sinking')
      sound.play('drop')
      to(by, [BOBBER_CAST.y, BOBBER_CAST.y + 10, BOBBER_CAST.y - 2, BOBBER_CAST.y], { duration: 0.8 })
      to(depth, HOOK_DEEP, { duration: 1, ease: 'easeOut' })
      to(sag, 46, { duration: 0.8, ease: 'easeOut' })
    }],
    [2500, () => setStep('approach')],
    // The bite: the bobber is pulled under, the bear jerks the rod.
    [4300, () => {
      setStep('bite')
      sound.play('pop')
      to(rod, 5, { duration: 0.12 })
      const y = BOBBER_CAST.y
      to(by, [y, y + 16, y + 4, y + 18, y + 8], { duration: 0.4 })
      to(sag, 6, { duration: 0.2 })
    }],
    // Reeled in: the rod lifts, bobber and catch come up out of the water to the dock.
    [4700, () => {
      setStep('reel')
      to(rod, -8, { duration: 1, ease: 'easeOut' })
      to(bx, REELED.x, { duration: 1.2, ease: 'easeIn' })
      to(by, REELED.y, { duration: 1.2, ease: 'easeIn' })
      to(depth, 24, { duration: 0.9 })
      to(sag, 0, { duration: 0.3 })
    }],
    [4850, () => { sound.play('splash'); setSplash(true) }],
    [6100, () => { setSplash(false); to(rod, -2, { duration: 0.4 }); onFinish() }],
  ])

  const hooked = step === 'reel' || done
  const toHook = step === 'approach' || step === 'bite'
  const floating = !running || step === 'sinking' || step === 'approach' || step === 'bite'
  const winnerColor = FISH_COLORS[winnerSlot % FISH_COLORS.length]

  return (
    <>
      <PondBackground />

      {slots.map((student, i) => {
        const start = pond.spots[i]
        if (!start || (i === winnerSlot && hooked)) return null
        return (
          <PondFish
            key={student.id}
            id={student.id}
            start={start}
            w={fishW}
            h={fishH}
            speed={pond.speed}
            mouth={mouth}
            labelW={pond.labelW}
            color={FISH_COLORS[i % FISH_COLORS.length]}
            name={student.name}
            hook={i === winnerSlot && toHook ? HOOK_CAST : undefined}
            biting={i === winnerSlot && step === 'bite'}
          />
        )
      })}

      {/* The fisher: the bear on the dock with its rod, then hugging its catch. */}
      {done ? (
        <motion.img
          src={`${ART}/bear-hug.webp`}
          alt=""
          className="pointer-events-none absolute"
          style={{ left: BEAR.left + 20, top: 290, width: 160 }}
          initial={{ scale: 0.6, y: 20 }}
          animate={{ scale: 1, y: [0, -14] }}
          transition={{ scale: { type: 'spring', bounce: 0.5 }, y: { duration: 0.45, ...LOOP } }}
        />
      ) : (
        <>
          <motion.div className="pointer-events-none absolute inset-0" style={{ rotate: rod, transformOrigin: `${HAND.x}px ${HAND.y}px` }}>
            <img src={`${ART}/bear-rod.webp`} alt="" className="absolute max-w-none" style={{ left: BEAR.left, top: BEAR.top, width: BEAR.width }} />
          </motion.div>

          <svg width="1280" height="720" viewBox="0 0 1280 720" className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
            <motion.path d={line} fill="none" stroke="#4A5470" strokeWidth="2.2" />
            <motion.path d={leader} fill="none" stroke="#4A5470" strokeWidth="1.6" opacity="0.8" />
          </svg>

          {/* The hook, hanging under the bobber; the catch hangs on it once reeled. */}
          <motion.div className="pointer-events-none absolute top-0 left-0 size-0" style={{ x: bx, y: hookY }}>
            <svg width="24" height="28" viewBox="0 0 24 28" className="absolute -left-1.5 -top-0.5" aria-hidden="true">
              <path d="M6 0 V16 a6 6 0 0 0 12 0 V12" fill="none" stroke="#4A5470" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {hooked && (
              // Head up by the mouth, swinging on the hook.
              <motion.div className="absolute top-0 left-0 size-0" animate={{ rotate: [-12, 12] }} transition={{ duration: 0.22, ...LOOP }}>
                <img
                  src={`${ART}/fish-${winnerColor}.webp`}
                  alt=""
                  className="absolute max-w-none object-contain"
                  style={{ width: fishW, height: fishH, left: -6, top: -fishH * 0.55, transform: 'rotate(90deg)', transformOrigin: `6px ${fishH * 0.55}px` }}
                />
              </motion.div>
            )}
          </motion.div>

          {/* The bobber, with rings on the water while it floats. */}
          <motion.div className="pointer-events-none absolute top-0 left-0 size-0" style={{ x: bx, y: by }}>
            {floating && (
              <motion.svg
                width="120" height="30" viewBox="-60 -15 120 30" className="absolute -left-[60px] -top-[10px]"
                animate={{ scale: [0.4, 1.6], opacity: [0.9, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                aria-hidden="true"
              >
                <ellipse rx="56" ry="10" fill="none" stroke="#FFFFFF" strokeWidth="4" />
              </motion.svg>
            )}
            <svg width="24" height="32" viewBox="-12 -16 24 32" className="absolute -left-3 -top-4" aria-hidden="true">
              <circle r="11" fill="#FFFFFF" />
              <path d="M-11 0 A11 11 0 0 1 11 0Z" fill="#E5484D" />
              <circle r="11" fill="none" stroke="#1F2A44" strokeOpacity="0.25" strokeWidth="1.5" />
            </svg>
          </motion.div>
        </>
      )}

      {/* Rings where the bobber lands. */}
      {step === 'sinking' && (
        <svg width="240" height="80" viewBox="-120 -40 240 80" className="pointer-events-none absolute overflow-visible" style={{ left: BOBBER_CAST.x - 120, top: BOBBER_CAST.y - 40 }} aria-hidden="true">
          {[0, 0.25, 0.5].map((delay) => (
            <motion.ellipse
              key={delay}
              rx="60" ry="14" fill="none" stroke="#FFFFFF" strokeWidth="4"
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1, delay, ease: 'easeOut' }}
            />
          ))}
        </svg>
      )}

      {splash && (
        <motion.svg
          width="220" height="120" viewBox="-110 -100 220 120"
          className="absolute overflow-visible"
          style={{ left: BOBBER_CAST.x - 110, top: WATER_Y + 40 }}
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

interface PondFishProps {
  id: string
  start: FishSpot
  w: number
  h: number
  speed: number
  mouth: number
  labelW: number
  color: string
  name: string
  /** Swim to this hook and bite it (the chosen fish), from wherever it is. */
  hook?: FishSpot
  biting: boolean
}

/**
 * A fish wandering the pond: it swims to a random place, turns, pauses a moment, swims on. The chosen fish leaves off
 * from where it is and swims to the hook, mouth first.
 */
function PondFish({ id, start, w, h, speed, mouth, labelW, color, name, hook, biting }: PondFishProps) {
  // A new round starts where the fish swam to in the last one.
  const [from] = useState(() => lastSeen.get(id) ?? { ...start, face: firstFace() })
  const x = useMotionValue(from.x)
  const y = useMotionValue(from.y)
  /** 1: facing right. The pictures face left, so the picture is mirrored by -face. */
  const face = from.face
  const faceValue = useMotionValue(face)
  const mirror = useTransform(faceValue, (f) => -f)

  useEffect(() => {
    let current: AnimationPlaybackControls[] = []
    let alive = true
    const stop = () => current.forEach((c) => c.stop())
    const turnTo = (dx: number) => {
      const f = dx >= 0 ? 1 : -1
      return f === faceValue.get() ? [] : [animate(faceValue, f, { duration: 0.28 })]
    }

    if (hook) {
      const f = hook.x >= x.get() ? 1 : -1
      current = [
        ...turnTo(hook.x - x.get()),
        animate(x, hook.x - mouth * f, { duration: 1.8, ease: 'easeInOut' }),
        animate(y, hook.y, { duration: 1.8, ease: 'easeInOut' }),
      ]
      return stop
    }

    const swim = (pause: number) => {
      if (!alive) return
      const next = randomSpot(w, h)
      const dx = next.x - x.get()
      const dist = Math.hypot(dx, next.y - y.get())
      const duration = Math.max(0.9, (dist / speed) * (0.7 + Math.random() * 0.6))
      stop()
      current = [
        ...turnTo(dx),
        animate(y, next.y, { duration, delay: pause, ease: 'easeInOut' }),
        animate(x, next.x, { duration, delay: pause, ease: 'easeInOut', onComplete: () => swim(Math.random() * 0.8) }),
      ]
    }
    swim(Math.random() * 0.6)
    return () => {
      alive = false
      stop()
    }
  }, [hook, w, h, speed, mouth, x, y, faceValue])

  // Kept up to date while it swims: the next round's scene is made before this one is gone.
  useEffect(() => {
    const save = () => lastSeen.set(id, { x: x.get(), y: y.get(), face: faceValue.get() >= 0 ? 1 : -1 })
    const stops = [x.on('change', save), y.on('change', save), faceValue.on('change', save)]
    return () => stops.forEach((stop) => stop())
  }, [id, x, y, faceValue])

  return (
    <motion.div className="pointer-events-none absolute top-0 left-0" style={{ x, y, width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2 }}>
      <motion.div
        className="absolute inset-0"
        animate={biting ? { x: [0, 4], y: [0, 3] } : { x: 0, y: 0 }}
        transition={biting ? { duration: 0.06, ...LOOP } : { duration: 0.1 }}
      >
        <motion.div className="absolute inset-0" style={{ scaleX: mirror }}>
          <Fish color={color} fast={biting} />
        </motion.div>
        <FishName name={name} w={w} labelW={labelW} />
      </motion.div>
    </motion.div>
  )
}

/** Where each student's fish was when its scene closed, so the next round goes on from there. */
const lastSeen = new Map<string, FishSpot & { face: number }>()

/** Which way a fish faces at first: half of them each way. */
const firstFace = () => (Math.random() < 0.5 ? 1 : -1)

function Fish({ color, fast }: { color: string; fast?: boolean }) {
  return (
    <motion.img
      src={`${ART}/fish-${color}.webp`}
      alt=""
      draggable={false}
      className="block size-full select-none object-contain"
      animate={{ rotate: [-3, 3] }}
      transition={{ duration: fast ? 0.15 : 0.6, ...LOOP }}
    />
  )
}

/** Name label under the fish's eye, sized to the fish; it stays readable while the body flips direction. */
function FishName({ name, w, labelW }: { name: string; w: number; labelW: number }) {
  const fontSize = Math.round(Math.max(11, Math.min(16, w * 0.11)))
  return (
    <span className="absolute top-[66%] flex justify-center" style={{ left: (w - labelW) / 2, width: labelW }}>
      <span
        className="max-w-full truncate rounded-full bg-white/90 px-1.5 py-px leading-tight font-extrabold shadow-[0_2px_0_rgba(31,42,68,0.15)]"
        style={{ fontSize }}
      >
        {name}
      </span>
    </span>
  )
}

/** The painted pond, mirrored into the side bleed so wide screens have no bare edges; a frog on the right bank. */
function PondBackground() {
  return (
    <>
      <SceneSvg>
        <image href={`${ART}/pond.webp`} x="0" y="0" width="1280" height="720" preserveAspectRatio="none" transform="scale(-1 1)" />
        <image href={`${ART}/pond.webp`} x="0" y="0" width="1280" height="720" preserveAspectRatio="none" />
        <image href={`${ART}/pond.webp`} x="0" y="0" width="1280" height="720" preserveAspectRatio="none" transform="translate(2560 0) scale(-1 1)" />
        <g fill="none" stroke="#FFFFFF" strokeWidth="2.5">
          {[
            { x: 470, y: 600, r: 6, d: 0 },
            { x: 482, y: 640, r: 4, d: 1 },
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
      </SceneSvg>
      <motion.img
        src={`${ART}/frog.webp`}
        alt=""
        className="pointer-events-none absolute w-[78px]"
        style={{ left: 1196, top: 392, originX: 0.5, originY: 1 }}
        animate={{ y: [0, -6], scaleY: [1, 0.96] }}
        transition={{ duration: 1, ...LOOP }}
      />
    </>
  )
}
