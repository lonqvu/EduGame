import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { CheckIcon, CloseIcon } from '@/components/ui/icons'
import type { ChoiceOption } from '@/types/game'
import { useSound } from '@/sound/useSound'

const OPTION_COLORS = ['#3563E9', '#F28C28', '#2E9E6A', '#8B5CF6', '#E5484D', '#0E9AA7']
const LETTERS = 'ABCDEF'

export type OptionLook = 'idle' | 'right' | 'wrong' | 'dim'

interface QuizOptionProps {
  option: ChoiceOption
  index: number
  trueFalse: boolean
  look: OptionLook
  disabled?: boolean
  onClick?: () => void
  /** Smaller, for screens that also show a scene (Đua thuyền). */
  compact?: boolean
}

/** One answer of a quiz question on the projector: letter, text, and its state once answered. */
export function QuizOption({ option, index, trueFalse, look, disabled, onClick, compact }: QuizOptionProps) {
  const color = trueFalse ? (index === 0 ? '#2E9E6A' : '#E5484D') : OPTION_COLORS[index % OPTION_COLORS.length]
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      animate={look === 'wrong' ? { x: [0, -10, 10, -6, 6, 0] } : look === 'right' ? { scale: [1, 1.04, 1] } : {}}
      transition={{ duration: 0.45 }}
      className={`flex cursor-pointer items-center gap-4 rounded-3xl border-4 px-5 py-2 text-left font-[inherit] text-ink disabled:cursor-default ${
        compact ? 'min-h-[60px]' : 'min-h-[76px]'
      } ${
        look === 'right' ? 'border-success bg-[#E3F6EC]' : look === 'wrong' ? 'border-danger bg-[#FBE6E1] opacity-70' : 'border-white bg-white'
      } ${look === 'dim' ? 'opacity-50' : ''}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-2xl font-display font-extrabold text-white ${
          compact ? 'size-10 text-[22px]' : 'size-12 text-[26px]'
        }`}
        style={{ background: look === 'right' ? '#1B7A50' : look === 'wrong' ? '#A3361A' : color }}
      >
        {look === 'right' ? <CheckIcon size={26} /> : look === 'wrong' ? <CloseIcon size={24} /> : LETTERS[index]}
      </span>
      <span
        className={`font-display font-extrabold ${
          option.text.length > 30 ? 'text-[22px]' : compact ? 'text-[25px]' : 'text-[30px]'
        }`}
      >
        {option.text}
      </span>
    </motion.button>
  )
}

/** Seconds left to answer; "Hết giờ!" at zero (answers are still accepted). */
export function Countdown({ seconds, paused }: { seconds: number; paused: boolean }) {
  const [left, setLeft] = useState(seconds)
  const sound = useSound()

  useEffect(() => {
    if (paused || left <= 0) return
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [left, paused])

  // Heard as the time runs out (not when the question appears): a tick, sharper in the last 5 s, then time's up.
  useEffect(() => {
    if (paused || left === seconds) return
    if (left === 0) sound.play('timeUp')
    else if (left <= 5) sound.play('tickHigh')
    else if (left <= 10) sound.play('tick')
  }, [left, seconds, paused, sound])

  // The music hurries in the last 10 seconds, and calms down for the next question.
  const hurry = !paused && left > 0 && left <= 10
  useEffect(() => {
    if (!hurry) return
    sound.setMusicMood('tense')
    return () => sound.setMusicMood('calm')
  }, [hurry, sound])

  const urgent = left <= 5
  return (
    <span
      role="timer"
      aria-live="off"
      className={`rounded-full px-4 py-1.5 text-lg font-extrabold tabular-nums ${
        left === 0 ? 'bg-danger text-white' : urgent ? 'bg-sun text-ink' : 'bg-white text-ink'
      }`}
    >
      {left === 0 ? 'Hết giờ!' : `⏱ ${left}s`}
    </span>
  )
}
