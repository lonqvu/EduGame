import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { drawCard, MAX_CARDS, parseCards } from '@/game-engine/tools/moreTools2'
import { ToolFrame, toolButtonClass } from '@/game-engine/tools/ToolFrame'
import { useSound } from '@/sound/useSound'

/** The cards are kept on this computer for the next lesson (a convenience, not a record). */
const STORAGE_KEY = 'edugame.cardDraw'
const SAMPLE = 'Kể về gia đình em\nGiới thiệu một con vật em yêu thích\nKể về một ngày ở trường\nNói về món ăn em thích nhất\nKể về một người bạn thân'

function loadText(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? SAMPLE
  } catch {
    return SAMPLE
  }
}

/** Projector: the teacher writes the cards (one per line); each draw turns over one not drawn yet. */
export function CardDrawScreen() {
  const [text, setText] = useState(loadText)
  const [editing, setEditing] = useState(false)
  const [drawn, setDrawn] = useState<string[]>([])
  const [flipping, setFlipping] = useState(false)
  const sound = useSound()
  const cards = parseCards(text)
  const current = drawn.at(-1)
  const left = cards.length - drawn.length

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, text)
    } catch {
      // Private window: the cards last until the page closes.
    }
  }, [text])

  const draw = () => {
    const card = drawCard(cards, drawn)
    if (!card || flipping) return
    sound.play('shuffle')
    setFlipping(true)
    setTimeout(() => {
      setDrawn((d) => [...d, card])
      setFlipping(false)
      sound.play('flip')
    }, 700)
  }

  return (
    <ToolFrame
      title="Bốc thăm"
      subtitle={`${cards.length} lá thăm · còn ${left} lá`}
      actions={
        <>
          <button type="button" onClick={() => setEditing((e) => !e)} className={`${toolButtonClass} h-12 bg-white text-ink`}>
            {editing ? 'Xong' : '✎ Sửa lá thăm'}
          </button>
          <button type="button" disabled={drawn.length === 0} onClick={() => setDrawn([])} className={`${toolButtonClass} h-12 bg-white text-ink`}>
            Xáo lại
          </button>
        </>
      }
    >
      {editing ? (
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-lg font-bold text-ink-soft">Mỗi dòng một lá thăm (tối đa {MAX_CARDS} lá).</span>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setDrawn([])
            }}
            aria-label="Các lá thăm"
            className="flex-1 resize-none rounded-[24px] border-2 border-line bg-white p-5 font-[inherit] text-[22px] leading-relaxed text-ink"
          />
        </label>
      ) : (
        <div className="flex flex-1 items-center gap-10">
          <div className="flex flex-1 flex-col items-center gap-7">
            <div className="relative h-[330px] w-[560px] [perspective:1200px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={flipping ? 'flipping' : (current ?? 'none')}
                  initial={{ rotateY: 90, opacity: 0.4 }}
                  animate={{ rotateY: 0, opacity: 1, y: flipping ? [0, -10, 0] : 0 }}
                  exit={{ rotateY: -90, opacity: 0.4 }}
                  transition={{ duration: 0.3 }}
                  role="status"
                  className={`absolute inset-0 flex items-center justify-center rounded-[32px] border-[6px] px-10 text-center font-display font-extrabold ${
                    current && !flipping
                      ? 'border-[#FFD15C] bg-white text-[44px] leading-tight text-ink'
                      : 'border-white bg-[repeating-linear-gradient(45deg,#3563E9_0_18px,#4A75F0_18px_36px)] text-[64px] text-white'
                  }`}
                >
                  {current && !flipping ? current : '?'}
                </motion.div>
              </AnimatePresence>
            </div>
            {left === 0 && cards.length > 0 ? (
              <span className="text-xl font-extrabold text-ink-soft">Đã bốc hết lá thăm. Bấm "Xáo lại" để bốc lại từ đầu.</span>
            ) : (
              <button type="button" onClick={draw} disabled={flipping || cards.length === 0} className={`${toolButtonClass} h-16 w-[300px] bg-primary text-[22px] text-white hover:brightness-110`}>
                🎴 Bốc thăm
              </button>
            )}
          </div>
          {drawn.length > 0 && (
            <ol aria-label="Các lá đã bốc" className="m-0 flex w-[340px] list-none flex-col gap-2 self-stretch overflow-y-auto rounded-[28px] bg-white p-5">
              {drawn.map((card, i) => (
                <li key={card} className={`rounded-2xl px-4 py-2.5 text-lg font-bold ${i === drawn.length - 1 ? 'bg-sun-soft' : 'bg-surface-soft text-ink-soft'}`}>
                  {i + 1}. {card}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </ToolFrame>
  )
}
