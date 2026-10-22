import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { flipCoin, type CoinSide } from '@/game-engine/tools/classTools'
import { ToolFrame, toolButtonClass } from '@/game-engine/tools/ToolFrame'
import { useSound } from '@/sound/useSound'

const FLIP_S = 1.4
const HISTORY = 12
const LABEL: Record<CoinSide, string> = { HEADS: 'Sấp', TAILS: 'Ngửa' }

/** Projector: toss a big coin (Space tosses too), with the tally of both sides and the last tosses. */
export function CoinFlipScreen() {
  const [side, setSide] = useState<CoinSide>('HEADS')
  const [turns, setTurns] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [history, setHistory] = useState<CoinSide[]>([])
  const sound = useSound()

  const toss = useCallback(() => {
    if (flipping) return
    const next = flipCoin()
    sound.play('whoosh')
    setFlipping(true)
    setSide(next)
    // Several whole turns, ending on the side that came up (tails is the back, half a turn more).
    setTurns((t) => (Math.floor(t / 360) + 5) * 360 + (next === 'TAILS' ? 180 : 0))
  }, [flipping, sound])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.target instanceof HTMLInputElement) return
      event.preventDefault()
      toss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toss])

  const heads = history.filter((s) => s === 'HEADS').length
  return (
    <ToolFrame title="Tung đồng xu" subtitle="Chọn đội đi trước, chia phe hay quyết định nhanh">
      <div className="flex flex-1 items-center justify-center gap-20">
        <div className="flex flex-col items-center gap-6">
          <div className="[perspective:1200px]">
            <motion.div
              className="relative size-[300px] [transform-style:preserve-3d]"
              initial={false}
              animate={{ rotateY: turns, y: flipping ? [0, -120, 0] : 0 }}
              transition={{ rotateY: { duration: FLIP_S, ease: [0.2, 0.7, 0.3, 1] }, y: { duration: FLIP_S, ease: 'easeOut' } }}
              onAnimationComplete={() => {
                if (!flipping) return
                setFlipping(false)
                setHistory((h) => [side, ...h].slice(0, HISTORY))
                sound.play('reveal')
              }}
            >
              <Face side="HEADS" />
              <Face side="TAILS" />
            </motion.div>
          </div>
          <span role="status" className="font-display text-[56px] leading-none font-extrabold">
            {flipping ? '…' : history.length ? `Mặt ${LABEL[side].toLowerCase()}!` : 'Sẵn sàng'}
          </span>
        </div>

        <div className="flex w-[340px] flex-col gap-4">
          <button type="button" onClick={toss} disabled={flipping} className={`${toolButtonClass} h-16 bg-primary text-[22px] text-white hover:brightness-110`}>
            🪙 Tung đồng xu
          </button>
          <span className="text-center text-base font-bold text-ink-soft">hoặc nhấn phím cách</span>
          <div className="grid grid-cols-2 gap-3">
            {(['HEADS', 'TAILS'] as const).map((s) => (
              <div key={s} className="flex flex-col items-center rounded-3xl bg-white py-4">
                <span className="text-lg font-bold text-ink-soft">{LABEL[s]}</span>
                <span className="font-display text-[48px] leading-none font-extrabold">{s === 'HEADS' ? heads : history.length - heads}</span>
              </div>
            ))}
          </div>
          {history.length > 0 && (
            <ol aria-label="Các lần tung gần đây" className="m-0 flex list-none flex-wrap gap-2 p-0">
              {history.map((s, i) => (
                <li
                  key={i}
                  className={`flex size-10 items-center justify-center rounded-full text-[13px] font-extrabold ${
                    s === 'HEADS' ? 'bg-[#FFD15C] text-[#6B4E00]' : 'bg-[#D5DEEE] text-[#3F4B68]'
                  }`}
                >
                  {LABEL[s]}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </ToolFrame>
  )
}

function Face({ side }: { side: CoinSide }) {
  const heads = side === 'HEADS'
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center rounded-full border-[14px] [backface-visibility:hidden] ${
        heads ? 'border-[#E0A800] bg-[radial-gradient(circle_at_35%_30%,#FFF1B0,#FFC93C_60%,#E9A800)]' : 'border-[#9AA6BF] bg-[radial-gradient(circle_at_35%_30%,#FFFFFF,#D5DEEE_60%,#AEB8CC)]'
      }`}
      style={{ transform: heads ? undefined : 'rotateY(180deg)' }}
      aria-hidden="true"
    >
      <span className="text-[96px] leading-none">{heads ? '⭐' : '🌙'}</span>
      <span className={`font-display text-[40px] font-extrabold ${heads ? 'text-[#7A5300]' : 'text-[#3F4B68]'}`}>{LABEL[side]}</span>
    </div>
  )
}
