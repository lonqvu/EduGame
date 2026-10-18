import { motion } from 'motion/react'
import { useState } from 'react'
import { RefreshIcon } from '@/components/ui/icons'
import { makeGroups, MAX_GROUPS, MIN_GROUPS } from '@/game-engine/tools/classTools'
import { ToolFrame, toolButtonClass } from '@/game-engine/tools/ToolFrame'
import { useClassStore } from '@/store/classStore'
import type { Student } from '@/types/game'
import { useSound } from '@/sound/useSound'

const GROUP_COLORS = ['#F28C28', '#3563E9', '#2E9E6A', '#8B5CF6', '#E5484D', '#0E9AA7', '#D99A12', '#C2417B']

/** Projector: split the class into random groups of (nearly) the same size. */
export function TeamMakerScreen() {
  const className = useClassStore((s) => s.className)
  const students = useClassStore((s) => s.students)
  const [count, setCount] = useState(4)
  const [groups, setGroups] = useState<Student[][] | null>(null)
  const [round, setRound] = useState(0)
  const sound = useSound()

  const max = Math.min(MAX_GROUPS, students.length)
  const split = () => {
    sound.play('shuffle')
    setGroups(makeGroups(students, count))
    setRound((r) => r + 1)
  }
  const changeCount = (next: number) => {
    setCount(Math.min(Math.max(next, MIN_GROUPS), max))
    setGroups(null)
  }

  const cols = groups ? Math.min(groups.length, 4) : 4
  const biggest = groups ? Math.max(...groups.map((g) => g.length)) : 0
  const chip = biggest > 7 ? 'text-[15px] px-2.5 py-0.5' : 'text-[18px] px-3 py-1'

  return (
    <ToolFrame
      title="Chia nhóm ngẫu nhiên"
      subtitle={`${className} · ${students.length} bạn`}
      actions={
        <>
          <span className="text-lg font-extrabold">Số nhóm</span>
          <div className="flex items-center rounded-full bg-white p-1">
            <button
              type="button"
              aria-label="Bớt một nhóm"
              disabled={count <= MIN_GROUPS}
              onClick={() => changeCount(count - 1)}
              className="size-12 cursor-pointer rounded-full border-0 bg-transparent font-[inherit] text-2xl font-extrabold disabled:opacity-30"
            >
              −
            </button>
            <span aria-label="Số nhóm" className="w-10 text-center font-display text-[28px] font-extrabold">
              {count}
            </span>
            <button
              type="button"
              aria-label="Thêm một nhóm"
              disabled={count >= max}
              onClick={() => changeCount(count + 1)}
              className="size-12 cursor-pointer rounded-full border-0 bg-transparent font-[inherit] text-2xl font-extrabold disabled:opacity-30"
            >
              +
            </button>
          </div>
          <button type="button" onClick={split} disabled={students.length < MIN_GROUPS} className={`${toolButtonClass} bg-primary text-white`}>
            <RefreshIcon size={22} />
            {groups ? 'Chia lại' : 'Chia nhóm'}
          </button>
        </>
      }
    >
      {groups ? (
        <div className="grid min-h-0 flex-1 auto-rows-fr gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {groups.map((group, g) => {
            const color = GROUP_COLORS[g % GROUP_COLORS.length]
            return (
              <motion.section
                key={`${round}-${g}`}
                aria-label={`Nhóm ${g + 1}`}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: g * 0.08, type: 'spring', bounce: 0.35 }}
                className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border-4 bg-white"
                style={{ borderColor: color }}
              >
                <span className="flex items-center justify-between px-4 py-2 font-display text-[24px] font-extrabold text-white" style={{ background: color }}>
                  Nhóm {g + 1}
                  <span className="text-lg">{group.length} bạn</span>
                </span>
                <span className="flex flex-wrap content-start gap-1.5 p-3">
                  {group.map((s, i) => (
                    <motion.span
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + g * 0.08 + i * 0.04 }}
                      className={`rounded-full font-extrabold ${chip}`}
                      style={{ background: `${color}1F` }}
                    >
                      {s.name}
                    </motion.span>
                  ))}
                </span>
              </motion.section>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[32px] bg-white/70 text-center">
          <span className="font-display text-[44px] font-extrabold">Chia {students.length} bạn thành {count} nhóm</span>
          <span className="text-xl text-ink-soft">
            Mỗi nhóm khoảng {Math.floor(students.length / count)}
            {students.length % count ? `–${Math.ceil(students.length / count)}` : ''} bạn. Bấm “Chia nhóm” để bắt đầu.
          </span>
        </div>
      )}
    </ToolFrame>
  )
}
