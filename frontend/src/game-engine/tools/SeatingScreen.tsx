import { motion } from 'motion/react'
import { useState } from 'react'
import { arrangeSeats, SEAT_COLUMNS, swapSeats } from '@/game-engine/tools/moreTools2'
import { ToolFrame, toolButtonClass } from '@/game-engine/tools/ToolFrame'
import { useClassStore } from '@/store/classStore'
import type { Student } from '@/types/game'
import { useSound } from '@/sound/useSound'

/**
 * Projector: the class list on the desks, two seats a desk, rows from the board. "Xếp ngẫu nhiên" shuffles; a tap on
 * two seats swaps them.
 */
export function SeatingScreen() {
  const className = useClassStore((s) => s.className)
  const students = useClassStore((s) => s.students)
  const [columns, setColumns] = useState<number>(6)
  const [plan, setPlan] = useState<Student[]>(() => [...students])
  const [picked, setPicked] = useState<number | null>(null)
  const sound = useSound()

  const rows = Math.ceil(plan.length / columns)
  const seat = rows > 6 ? 'h-[52px] text-[15px]' : 'h-[64px] text-[18px]'

  return (
    <ToolFrame
      title="Sơ đồ chỗ ngồi"
      subtitle={[className, `${students.length} bạn`, 'Bấm hai bạn để đổi chỗ'].filter(Boolean).join(' · ')}
      actions={
        <>
          <span className="text-lg font-bold text-ink-soft">Chỗ mỗi hàng</span>
          {SEAT_COLUMNS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={columns === n}
              onClick={() => setColumns(n)}
              className={`h-12 min-w-12 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-lg font-extrabold ${
                columns === n ? 'bg-primary text-white' : 'bg-white text-ink hover:text-primary-ink'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              sound.play('shuffle')
              setPicked(null)
              setPlan(arrangeSeats(students))
            }}
            className={`${toolButtonClass} h-12 bg-primary text-white`}
          >
            🔀 Xếp ngẫu nhiên
          </button>
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center gap-3 overflow-y-auto">
        <div className="w-[60%] rounded-xl bg-[#2E5E4E] py-2 text-center text-lg font-extrabold text-white" aria-hidden="true">
          Bảng
        </div>
        <ol aria-label="Sơ đồ chỗ ngồi" className="m-0 grid w-full list-none gap-y-3 p-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {plan.map((student, i) => {
            const isPicked = picked === i
            // Two seats a desk: a gap after every second seat.
            const desk = i % 2 === 1 ? 'mr-5' : 'ml-0'
            return (
              <li key={student.id} className={desk}>
                <motion.button
                  layout
                  type="button"
                  onClick={() => {
                    if (picked === null) {
                      setPicked(i)
                      sound.play('pop')
                      return
                    }
                    if (picked !== i) {
                      setPlan((p) => swapSeats(p, picked, i))
                      sound.play('whoosh')
                    }
                    setPicked(null)
                  }}
                  aria-pressed={isPicked}
                  aria-label={`Chỗ ${i + 1}: ${student.name}`}
                  className={`flex w-full cursor-pointer items-center justify-center truncate border-0 px-2 font-[inherit] font-extrabold ${seat} ${
                    i % 2 === 0 ? 'rounded-l-2xl' : 'rounded-r-2xl'
                  } ${isPicked ? 'bg-sun text-ink' : 'bg-white text-ink hover:bg-primary-soft'}`}
                >
                  {student.name}
                </motion.button>
              </li>
            )
          })}
        </ol>
      </div>
    </ToolFrame>
  )
}
