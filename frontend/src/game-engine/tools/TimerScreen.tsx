import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { formatClock, MAX_TIMER_SECONDS, secondsLeft } from '@/game-engine/tools/classTools'
import { ToolFrame, toolButtonClass } from '@/game-engine/tools/ToolFrame'

const PRESETS = [1, 2, 3, 5, 10, 15]
const RING = 2 * Math.PI * 200

/** Short school-bell chime with the Web Audio API (silently skipped where audio is not available). */
function ring() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    ;[0, 0.35, 0.7].forEach((at, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = i === 2 ? 1046 : 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at)
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.32)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + at)
      osc.stop(ctx.currentTime + at + 0.34)
    })
    setTimeout(() => void ctx.close(), 1500)
  } catch {
    // No sound: the screen still says time is up.
  }
}

/** Projector: a big countdown for work or group time; it rings at zero. */
export function TimerScreen() {
  const [duration, setDuration] = useState(5 * 60)
  /** When it ends (ms since epoch) while running; null when stopped. */
  const [endsAt, setEndsAt] = useState<number | null>(null)
  /** Seconds left while paused or stopped. */
  const [left, setLeft] = useState(duration)
  const [now, setNow] = useState(() => Date.now())
  /** Started since the last reset (so a paused countdown reads "Chạy tiếp"). */
  const [started, setStarted] = useState(false)
  const rang = useRef(false)

  const running = endsAt !== null
  const remaining = running ? secondsLeft(endsAt, now) : left
  const done = remaining <= 0

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (running && done && !rang.current) {
      rang.current = true
      ring()
      setEndsAt(null)
      setLeft(0)
    }
  }, [running, done])

  const choose = (seconds: number) => {
    const s = Math.min(Math.max(seconds, 10), MAX_TIMER_SECONDS)
    setDuration(s)
    setLeft(s)
    setEndsAt(null)
    setStarted(false)
    rang.current = false
  }
  const start = () => {
    const from = done ? duration : left
    rang.current = false
    setLeft(from)
    setNow(Date.now())
    setStarted(true)
    setEndsAt(Date.now() + from * 1000)
  }
  const pause = () => {
    if (endsAt === null) return
    setLeft(secondsLeft(endsAt, Date.now()))
    setEndsAt(null)
  }
  const adjust = (delta: number) => {
    if (running && endsAt !== null) {
      setEndsAt(Math.max(Date.now(), endsAt + delta * 1000))
    } else {
      // Never down to zero while stopped: that would read "Hết giờ!" before it ever ran.
      setLeft(Math.min(Math.max(left + delta, 10), MAX_TIMER_SECONDS))
    }
  }

  const fraction = duration > 0 ? Math.min(remaining / duration, 1) : 0
  const urgent = remaining > 0 && remaining <= 10

  return (
    <ToolFrame
      title="Đồng hồ đếm ngược"
      subtitle={done ? 'Hết giờ!' : running ? 'Đang chạy' : 'Chọn thời gian rồi bấm “Bắt đầu”'}
      actions={PRESETS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => choose(m * 60)}
          aria-pressed={!running && duration === m * 60}
          className={`h-12 cursor-pointer rounded-full border-0 px-5 font-[inherit] text-lg font-extrabold ${
            duration === m * 60 ? 'bg-primary text-white' : 'bg-white text-ink hover:text-primary-ink'
          }`}
        >
          {m} phút
        </button>
      ))}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center gap-12">
        <motion.div
          className="relative flex size-[440px] shrink-0 items-center justify-center rounded-full"
          animate={done ? { backgroundColor: ['#FFFFFF', '#FBE6E1', '#FFFFFF'] } : { backgroundColor: '#FFFFFF' }}
          transition={done ? { repeat: Infinity, duration: 1 } : {}}
        >
          <svg width="440" height="440" viewBox="-220 -220 440 440" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle r="200" fill="none" stroke="#EEF1F6" strokeWidth="22" />
            <circle
              r="200"
              fill="none"
              stroke={done || urgent ? '#E5484D' : '#3563E9'}
              strokeWidth="22"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - fraction)}
              style={{ transition: 'stroke-dashoffset 0.25s linear' }}
            />
          </svg>
          <span
            role="timer"
            aria-label="Thời gian còn lại"
            className={`relative font-display leading-none font-extrabold tabular-nums ${done || urgent ? 'text-danger' : 'text-ink'}`}
            style={{ fontSize: formatClock(remaining).length > 5 ? 84 : 112 }}
          >
            {done ? 'Hết giờ!' : formatClock(remaining)}
          </span>
        </motion.div>

        <div className="flex w-[300px] flex-col gap-3.5">
          {running ? (
            <button type="button" onClick={pause} className={`${toolButtonClass} h-16 bg-sun text-ink`}>
              Tạm dừng
            </button>
          ) : (
            <button type="button" onClick={start} className={`${toolButtonClass} h-16 bg-success text-white`}>
              {done ? 'Chạy lại' : started ? 'Chạy tiếp' : 'Bắt đầu'}
            </button>
          )}
          <button type="button" onClick={() => choose(duration)} className={`${toolButtonClass} bg-white text-ink`}>
            Đặt lại
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => adjust(-30)} className={`${toolButtonClass} bg-white text-ink`}>
              − 30 giây
            </button>
            <button type="button" onClick={() => adjust(60)} className={`${toolButtonClass} bg-white text-ink`}>
              + 1 phút
            </button>
          </div>
        </div>
      </div>
    </ToolFrame>
  )
}
