import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ToolFrame } from '@/game-engine/tools/ToolFrame'
import { useSound } from '@/sound/useSound'

type Light = 'RED' | 'YELLOW' | 'GREEN'

/** `ink`: the light's color dark enough to read on the light board. */
const LIGHTS: { id: Light; key: string; color: string; ink: string; dim: string; title: string; text: string; icon: string }[] = [
  { id: 'RED', key: '1', color: '#E5484D', ink: '#C93035', dim: '#5A2224', title: 'Im lặng', text: 'Cả lớp giữ trật tự, lắng nghe cô.', icon: '🤫' },
  { id: 'YELLOW', key: '2', color: '#FFC93C', ink: '#A86B00', dim: '#5A4A1C', title: 'Nói nhỏ', text: 'Trao đổi thì thầm với bạn bên cạnh.', icon: '🗣️' },
  { id: 'GREEN', key: '3', color: '#2E9E6A', ink: '#1B7A50', dim: '#1D3B2D', title: 'Thảo luận', text: 'Các nhóm được thảo luận, làm việc cùng nhau.', icon: '💬' },
]

/** Projector: a traffic light telling the class how to work now. Click a light or press 1, 2, 3. */
export function TrafficLightScreen() {
  const [light, setLight] = useState<Light | null>(null)
  const sound = useSound()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const found = LIGHTS.find((l) => l.key === event.key)
      if (!found) return
      sound.play('pop')
      setLight(found.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sound])

  const active = LIGHTS.find((l) => l.id === light)
  return (
    <ToolFrame title="Đèn tín hiệu" subtitle="Bấm vào đèn, hoặc nhấn phím 1, 2, 3">
      <div className="flex flex-1 items-center justify-center gap-16">
        <div className="flex flex-col gap-5 rounded-[48px] bg-[#1F2A44] p-6 shadow-[0_18px_40px_rgba(31,42,68,0.35)]" role="radiogroup" aria-label="Đèn tín hiệu">
          {LIGHTS.map((l) => {
            const on = l.id === light
            return (
              <motion.button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${l.title} (phím ${l.key})`}
                onClick={() => {
                  sound.play('pop')
                  setLight(l.id)
                }}
                animate={{ backgroundColor: on ? l.color : l.dim, boxShadow: on ? `0 0 60px ${l.color}` : '0 0 0 rgba(0,0,0,0)' }}
                className="size-[150px] cursor-pointer rounded-full border-[6px] border-[#121A30]"
              />
            )
          })}
        </div>
        <div className="flex w-[520px] flex-col gap-4">
          {active ? (
            <motion.div key={active.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col gap-4">
              <span className="text-[100px] leading-none" aria-hidden="true">
                {active.icon}
              </span>
              <span role="status" className="font-display text-[84px] leading-none font-extrabold" style={{ color: active.ink }}>
                {active.title}
              </span>
              <span className="text-[30px] leading-snug font-bold text-ink-soft">{active.text}</span>
            </motion.div>
          ) : (
            <span role="status" className="font-display text-[48px] leading-tight font-extrabold text-ink-soft">
              Cô chọn một đèn cho lớp nhé!
            </span>
          )}
        </div>
      </div>
    </ToolFrame>
  )
}
