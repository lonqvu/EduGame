import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { drawNumber, MAX_NUMBER } from '@/game-engine/tools/classTools'
import { ToolFrame, toolButtonClass } from '@/game-engine/tools/ToolFrame'
import { useSound } from '@/sound/useSound'

const ROLL_MS = 1100
const FLICKER_MS = 70

/**
 * Projector: a random number between two bounds (by default 1-30, a class's roll numbers). With "Không lặp lại" each
 * number comes out once, until every one of the range has.
 */
export function RandomNumberScreen() {
  const [min, setMin] = useState(1)
  const [max, setMax] = useState(30)
  const [noRepeat, setNoRepeat] = useState(true)
  const [drawn, setDrawn] = useState<number[]>([])
  const [shown, setShown] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const sound = useSound()

  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const usedUp = noRepeat && drawNumber(min, max, drawn) === null

  useEffect(() => {
    if (!rolling) return
    const flicker = setInterval(() => {
      setShown(drawNumber(min, max))
      sound.play('wheelTick')
    }, FLICKER_MS)
    const stop = setTimeout(() => {
      clearInterval(flicker)
      const result = drawNumber(min, max, noRepeat ? drawn : [])
      setShown(result)
      if (result !== null) setDrawn((d) => [result, ...d])
      setRolling(false)
      sound.play('reveal')
    }, ROLL_MS)
    return () => {
      clearInterval(flicker)
      clearTimeout(stop)
    }
  }, [rolling, min, max, noRepeat, drawn, sound])

  const bound = (label: string, value: number, set: (n: number) => void) => (
    <label className="flex items-center gap-2 text-lg font-bold text-ink-soft">
      {label}
      <input
        type="number"
        min={0}
        max={MAX_NUMBER}
        value={value}
        disabled={rolling}
        aria-label={`${label} số`}
        onChange={(e) => {
          set(Math.min(MAX_NUMBER, Math.max(0, Math.round(Number(e.target.value)) || 0)))
          setDrawn([])
        }}
        className="h-12 w-24 rounded-2xl border-2 border-line bg-white px-3 text-center font-[inherit] text-xl font-extrabold text-ink"
      />
    </label>
  )

  return (
    <ToolFrame
      title="Chọn số ngẫu nhiên"
      subtitle={`Từ ${lo} đến ${hi}${noRepeat ? ', không lặp lại' : ''}`}
      actions={
        <>
          {bound('Từ', min, setMin)}
          {bound('Đến', max, setMax)}
          <button
            type="button"
            aria-pressed={noRepeat}
            onClick={() => setNoRepeat((v) => !v)}
            className={`h-12 cursor-pointer rounded-full border-0 px-5 font-[inherit] text-lg font-extrabold ${noRepeat ? 'bg-primary text-white' : 'bg-white text-ink'}`}
          >
            Không lặp lại
          </button>
        </>
      }
    >
      <div className="flex flex-1 items-center gap-10">
        <div className="flex flex-1 flex-col items-center gap-8">
          <motion.div
            key={rolling ? 'rolling' : `n-${shown}`}
            initial={rolling ? false : { scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.55 }}
            role="status"
            aria-label={shown === null ? 'Chưa chọn số' : `Số ${shown}`}
            className="flex size-[320px] items-center justify-center rounded-full border-[12px] border-white bg-[radial-gradient(circle_at_35%_30%,#6E95FF,#3563E9)] font-display text-[150px] leading-none font-extrabold text-white shadow-[0_18px_40px_rgba(53,99,233,0.35)]"
          >
            {shown ?? '?'}
          </motion.div>
          {usedUp ? (
            <div className="flex items-center gap-4">
              <span className="text-xl font-extrabold text-ink-soft">Đã chọn hết các số!</span>
              <button type="button" onClick={() => setDrawn([])} className={`${toolButtonClass} bg-white text-ink`}>
                Làm lại từ đầu
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setRolling(true)} disabled={rolling} className={`${toolButtonClass} h-16 w-[300px] bg-primary text-[22px] text-white hover:brightness-110`}>
              🎲 Chọn số
            </button>
          )}
        </div>

        {noRepeat && (
          <div className="flex w-[330px] flex-col gap-3 self-stretch rounded-[28px] bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold">Đã chọn ({drawn.length})</span>
              {drawn.length > 0 && (
                <button type="button" onClick={() => setDrawn([])} disabled={rolling} className="cursor-pointer border-0 bg-transparent font-[inherit] text-base font-bold text-primary">
                  Xóa hết
                </button>
              )}
            </div>
            <ol aria-label="Các số đã chọn" className="m-0 flex list-none flex-wrap content-start gap-2 overflow-y-auto p-0">
              {drawn.map((n) => (
                <li key={n} className="flex h-11 min-w-11 items-center justify-center rounded-full bg-primary-soft px-2 text-lg font-extrabold text-primary-ink">
                  {n}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </ToolFrame>
  )
}
