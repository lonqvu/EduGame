import i18n from 'i18next'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ToolFrame } from '@/game-engine/tools/ToolFrame'
import { useSound } from '@/sound/useSound'

type Light = 'RED' | 'YELLOW' | 'GREEN'

/** A light; its title and text are read in the current language (play.tools.light.*). */
function light(id: Light, key: string, color: string, ink: string, dim: string, name: 'red' | 'yellow' | 'green', icon: string) {
  return {
    id,
    key,
    color,
    ink,
    dim,
    icon,
    get title() {
      return i18n.t(`play.tools.light.${name}Title`)
    },
    get text() {
      return i18n.t(`play.tools.light.${name}Text`)
    },
  }
}

/** `ink`: the light's color dark enough to read on the light board. */
const LIGHTS: { id: Light; key: string; color: string; ink: string; dim: string; title: string; text: string; icon: string }[] = [
  light('RED', '1', '#E5484D', '#C93035', '#5A2224', 'red', '🤫'),
  light('YELLOW', '2', '#FFC93C', '#A86B00', '#5A4A1C', 'yellow', '🗣️'),
  light('GREEN', '3', '#2E9E6A', '#1B7A50', '#1D3B2D', 'green', '💬'),
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
    <ToolFrame title={i18n.t('play.tools.light.title')} subtitle={i18n.t('play.tools.light.subtitle')}>
      <div className="flex flex-1 items-center justify-center gap-16">
        <div className="flex flex-col gap-5 rounded-[48px] bg-[#1F2A44] p-6 shadow-[0_18px_40px_rgba(31,42,68,0.35)]" role="radiogroup" aria-label={i18n.t('play.tools.light.title')}>
          {LIGHTS.map((l) => {
            const on = l.id === light
            return (
              <motion.button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={i18n.t('play.tools.light.key', { title: l.title, key: l.key })}
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
              {i18n.t('play.tools.light.choose')}
            </span>
          )}
        </div>
      </div>
    </ToolFrame>
  )
}
