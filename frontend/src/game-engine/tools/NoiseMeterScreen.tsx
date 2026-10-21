import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { noiseLevel, noiseScore, type NoiseLevel } from '@/game-engine/tools/classTools'
import { ToolFrame, toolButtonClass } from '@/game-engine/tools/ToolFrame'
import { useSound } from '@/sound/useSound'

/** The class must stay over the limit this long before the screen says so (a single cough does not count). */
const LOUD_MS = 1200
/** The bell does not ring again sooner than this. */
const BELL_EVERY_MS = 4000

const LOOK: Record<NoiseLevel, { face: string; label: string; color: string }> = {
  QUIET: { face: '😊', label: 'Yên lặng', color: '#2E9E6A' },
  OK: { face: '😐', label: 'Hơi ồn', color: '#F2A93B' },
  LOUD: { face: '😫', label: 'Ồn quá!', color: '#E5484D' },
}

type MicState = { kind: 'off' } | { kind: 'on' } | { kind: 'error'; message: string }

/**
 * Projector: how loud the class is, from the computer's microphone, against a limit the teacher sets. Staying over
 * the limit turns the screen red with a bell. Nothing is recorded: the sound is only measured, on this computer.
 */
export function NoiseMeterScreen() {
  const [mic, setMic] = useState<MicState>({ kind: 'off' })
  const [score, setScore] = useState(0)
  const [limit, setLimit] = useState(60)
  const [loud, setLoud] = useState(false)
  const stopRef = useRef<() => void>(() => undefined)
  const limitRef = useRef(limit)
  const sound = useSound()

  useEffect(() => {
    limitRef.current = limit
  }, [limit])
  useEffect(() => () => stopRef.current(), [])

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMic({ kind: 'error', message: 'Trình duyệt này không dùng được micro. Cô thử mở bằng Chrome hoặc Edge nhé.' })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } })
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      context.createMediaStreamSource(stream).connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      let frame = 0
      let smooth = 0
      let loudSince = 0
      let lastBell = 0
      const tick = () => {
        analyser.getFloatTimeDomainData(samples)
        let sum = 0
        for (const s of samples) sum += s * s
        const value = noiseScore(Math.sqrt(sum / samples.length))
        // Rises fast, falls slowly: the needle does not shake.
        smooth = value > smooth ? smooth * 0.6 + value * 0.4 : smooth * 0.92 + value * 0.08
        const now = performance.now()
        const over = smooth > limitRef.current
        loudSince = over ? loudSince || now : 0
        const isLoud = over && now - loudSince > LOUD_MS
        if (isLoud && now - lastBell > BELL_EVERY_MS) {
          lastBell = now
          sound.play('bell')
        }
        setScore(Math.round(smooth))
        setLoud(isLoud)
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      stopRef.current = () => {
        cancelAnimationFrame(frame)
        stream.getTracks().forEach((t) => t.stop())
        void context.close()
      }
      setMic({ kind: 'on' })
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      setMic({
        kind: 'error',
        message: denied
          ? 'Trình duyệt chưa cho dùng micro. Cô bấm vào biểu tượng ổ khóa cạnh địa chỉ trang, cho phép Micro rồi thử lại.'
          : 'Không tìm thấy micro. Cô kiểm tra micro của máy tính rồi thử lại.',
      })
    }
  }

  const stop = () => {
    stopRef.current()
    stopRef.current = () => undefined
    setMic({ kind: 'off' })
    setScore(0)
    setLoud(false)
  }

  const level = mic.kind === 'on' ? (loud ? 'LOUD' : noiseLevel(score, limit) === 'LOUD' ? 'OK' : noiseLevel(score, limit)) : 'QUIET'
  const look = LOOK[level]

  return (
    <ToolFrame
      title="Đo tiếng ồn"
      subtitle="Micro chỉ đo độ ồn, không ghi âm"
      actions={
        <label className="flex items-center gap-3 rounded-full bg-white px-5 py-2.5 text-lg font-bold">
          Mức cho phép
          <input
            type="range"
            min={20}
            max={95}
            step={5}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="Mức ồn cho phép"
            className="w-44 accent-primary"
          />
          <span className="w-8 font-extrabold tabular-nums">{limit}</span>
        </label>
      }
    >
      <motion.div
        animate={{ backgroundColor: loud ? '#FDE2E1' : '#FFFFFF' }}
        className="relative flex flex-1 items-center gap-12 rounded-[32px] px-14 py-8"
      >
        <div className="flex w-[300px] flex-col items-center gap-3">
          <motion.span
            key={level}
            initial={{ scale: 0.6 }}
            animate={{ scale: loud ? [1, 1.15, 1] : 1 }}
            transition={loud ? { repeat: Infinity, duration: 0.7 } : { type: 'spring', bounce: 0.5 }}
            className="text-[150px] leading-none"
            aria-hidden="true"
          >
            {mic.kind === 'on' ? look.face : '🎤'}
          </motion.span>
          <span role="status" className="font-display text-[44px] font-extrabold" style={{ color: mic.kind === 'on' ? look.color : undefined }}>
            {mic.kind === 'on' ? look.label : 'Micro đang tắt'}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-6">
          <div className="relative h-[90px] overflow-hidden rounded-full bg-surface-soft" role="meter" aria-label="Độ ồn" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
            <motion.div className="absolute inset-y-0 left-0 rounded-full" animate={{ width: `${score}%`, backgroundColor: look.color }} transition={{ duration: 0.12 }} />
            <span className="absolute inset-y-0 w-[5px] bg-ink" style={{ left: `${limit}%` }} aria-hidden="true" />
            <span className="absolute -top-0 rounded-b-lg bg-ink px-2 text-[13px] font-extrabold text-white" style={{ left: `calc(${limit}% - 16px)` }} aria-hidden="true">
              {limit}
            </span>
          </div>
          {loud && (
            <motion.span initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-[52px] font-extrabold text-danger">
              Cả lớp trật tự nhé! 🤫
            </motion.span>
          )}
          {mic.kind === 'error' && <p className="m-0 text-xl font-bold text-danger">{mic.message}</p>}
          <div className="flex gap-4">
            {mic.kind === 'on' ? (
              <button type="button" onClick={stop} className={`${toolButtonClass} bg-surface-soft text-ink`}>
                Tắt micro
              </button>
            ) : (
              <button type="button" onClick={() => void start()} className={`${toolButtonClass} bg-primary text-white hover:brightness-110`}>
                🎤 Bật micro để đo
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </ToolFrame>
  )
}
