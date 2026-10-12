import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { MAX_DICE, rollDice } from '@/game-engine/tools/classTools'
import { ToolFrame, toolButtonClass } from '@/game-engine/tools/ToolFrame'

const ROLL_MS = 900
const FLICKER_MS = 80
const HISTORY = 8
const DIE_COLORS = ['#E5484D', '#3563E9', '#2E9E6A']

/** Pip positions of each face on a 100×100 die. */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
}

function Die({ value, color, size }: { value: number; color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Mặt ${value}`}>
      <rect x="4" y="4" width="92" height="92" rx="20" fill="#FFFFFF" stroke={color} strokeWidth="5" />
      {PIPS[value].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill={color} />
      ))}
    </svg>
  )
}

/** Projector: roll one to three dice. */
export function DiceScreen() {
  const [count, setCount] = useState(1)
  const [faces, setFaces] = useState<number[]>([6])
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState<number[][]>([])

  useEffect(() => {
    if (!rolling) return
    const flicker = setInterval(() => setFaces(rollDice(count)), FLICKER_MS)
    const stop = setTimeout(() => {
      clearInterval(flicker)
      const result = rollDice(count)
      setFaces(result)
      setHistory((h) => [result, ...h].slice(0, HISTORY))
      setRolling(false)
    }, ROLL_MS)
    return () => {
      clearInterval(flicker)
      clearTimeout(stop)
    }
  }, [rolling, count])

  const choose = (n: number) => {
    setCount(n)
    setFaces(Array.from({ length: n }, (_, i) => faces[i] ?? 6))
  }

  const size = count === 1 ? 260 : count === 2 ? 220 : 190
  const total = faces.reduce((a, b) => a + b, 0)

  return (
    <ToolFrame
      title="Xúc xắc"
      subtitle="Gieo để chọn số câu, số bước đi hay đội đi trước"
      actions={Array.from({ length: MAX_DICE }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={count === n}
          disabled={rolling}
          onClick={() => choose(n)}
          className={`h-12 cursor-pointer rounded-full border-0 px-5 font-[inherit] text-lg font-extrabold ${
            count === n ? 'bg-primary text-white' : 'bg-white text-ink hover:text-primary-ink'
          }`}
        >
          {n} xúc xắc
        </button>
      ))}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7">
        <div className="flex items-center gap-10" aria-live="polite" aria-label="Kết quả">
          {faces.map((value, i) => (
            <motion.div
              key={i}
              animate={rolling ? { rotate: [0, -18, 14, -10, 8, 0], y: [0, -26, 0, -12, 0] } : { rotate: 0, y: 0 }}
              transition={rolling ? { repeat: Infinity, duration: 0.45 } : { type: 'spring', bounce: 0.5 }}
            >
              <Die value={value} color={DIE_COLORS[i % DIE_COLORS.length]} size={size} />
            </motion.div>
          ))}
        </div>
        <span className="h-12 font-display text-[40px] leading-none font-extrabold">
          {!rolling && count > 1 && history.length > 0 ? `Tổng: ${total}` : ''}
        </span>
        <button type="button" disabled={rolling} onClick={() => setRolling(true)} className={`${toolButtonClass} h-16 bg-primary px-10 text-xl text-white`}>
          {rolling ? 'Đang gieo…' : 'Gieo xúc xắc'}
        </button>
        {history.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Các lần gieo trước">
            <span className="text-lg font-bold text-ink-soft">Các lần trước:</span>
            {history.map((roll, i) => (
              <span key={i} className={`rounded-full px-3.5 py-1 text-lg font-extrabold ${i === 0 ? 'bg-sun' : 'bg-white'}`}>
                {roll.join(' + ')}
                {roll.length > 1 && ` = ${roll.reduce((a, b) => a + b, 0)}`}
              </span>
            ))}
          </div>
        )}
      </div>
    </ToolFrame>
  )
}
