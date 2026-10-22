import { useEffect, useState } from 'react'
import { formatStopwatch } from '@/game-engine/tools/moreTools2'
import { ToolFrame, toolButtonClass } from '@/game-engine/tools/ToolFrame'
import { useSound } from '@/sound/useSound'

/** Running: since when (ms), plus the time counted before the last pause. */
interface Clock {
  startedAt: number | null
  before: number
}

const elapsed = (clock: Clock, now: number) => clock.before + (clock.startedAt === null ? 0 : now - clock.startedAt)

/**
 * Projector: a stopwatch counting up, from the clock (it never drifts), with laps: "Ghi thời gian" notes the time a
 * group finished. Space starts and pauses.
 */
export function StopwatchScreen() {
  const [clock, setClock] = useState<Clock>({ startedAt: null, before: 0 })
  const [now, setNow] = useState(() => performance.now())
  const [laps, setLaps] = useState<number[]>([])
  const sound = useSound()
  const running = clock.startedAt !== null

  useEffect(() => {
    if (!running) return
    let frame = requestAnimationFrame(function tick() {
      setNow(performance.now())
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [running])

  const toggle = () => {
    const t = performance.now()
    sound.play('pop')
    setNow(t)
    setClock((c) => (c.startedAt === null ? { startedAt: t, before: c.before } : { startedAt: null, before: elapsed(c, t) }))
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      event.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const time = elapsed(clock, now)
  return (
    <ToolFrame title="Bấm giờ" subtitle="Nhấn phím cách để bắt đầu hoặc tạm dừng">
      <div className="flex flex-1 items-center gap-10">
        <div className="flex flex-1 flex-col items-center gap-8">
          <span role="timer" aria-label={`Đã trôi qua ${formatStopwatch(time)}`} className="font-display text-[150px] leading-none font-extrabold tabular-nums">
            {formatStopwatch(time)}
          </span>
          <div className="flex gap-4">
            <button type="button" onClick={toggle} className={`${toolButtonClass} h-16 w-[220px] text-[22px] text-white ${running ? 'bg-[#F28C28]' : 'bg-primary'}`}>
              {running ? '⏸ Tạm dừng' : time > 0 ? '▶ Tiếp tục' : '▶ Bắt đầu'}
            </button>
            <button
              type="button"
              disabled={time === 0}
              onClick={() => {
                sound.play('bell')
                setLaps((l) => [...l, time])
              }}
              className={`${toolButtonClass} h-16 bg-sun text-[20px] text-ink`}
            >
              🏁 Ghi thời gian
            </button>
            <button
              type="button"
              disabled={time === 0}
              onClick={() => {
                setClock({ startedAt: null, before: 0 })
                setLaps([])
              }}
              className={`${toolButtonClass} h-16 bg-white text-[20px] text-ink`}
            >
              Về 0
            </button>
          </div>
        </div>
        {laps.length > 0 && (
          <ol aria-label="Thời gian đã ghi" className="m-0 flex w-[320px] list-none flex-col gap-2 self-stretch overflow-y-auto rounded-[28px] bg-white p-5">
            {laps.map((lap, i) => (
              <li key={i} className="flex items-center justify-between rounded-2xl bg-surface-soft px-4 py-2.5 text-xl font-extrabold">
                <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} Lần {i + 1}</span>
                <span className="tabular-nums">{formatStopwatch(lap)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </ToolFrame>
  )
}
