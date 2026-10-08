import { App } from 'antd'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { ChevronLeftIcon, FilledStarIcon, RefreshIcon } from '@/components/ui/icons'
import { SpinWheel } from '@/game-engine/spin-wheel/SpinWheel'
import { rotationFor } from '@/game-engine/spin-wheel/wheelMath'
import { PickModeMenu } from '@/game-engine/name-picker/PickModeMenu'
import { useClassStore } from '@/store/classStore'
import { usePickerStore } from '@/store/pickerStore'
import type { Student } from '@/types/game'

/** Projector: spin to call a random student from the class list. */
export function SpinWheelScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const className = useClassStore((s) => s.className)
  const students = useClassStore((s) => s.students)
  const awardStars = useClassStore((s) => s.awardStars)

  // Shared with the other name-picking tools, so switching tools keeps who was called.
  const noRepeat = usePickerStore((s) => s.noRepeat)
  const setNoRepeat = usePickerStore((s) => s.setNoRepeat)
  const calledIds = usePickerStore((s) => s.calledIds)
  const markCalled = usePickerStore((s) => s.markCalled)
  const resetCalled = usePickerStore((s) => s.resetCalled)
  const [entries, setEntries] = useState<Student[]>(students)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [pending, setPending] = useState<Student | null>(null)
  const [picked, setPicked] = useState<Student | null>(null)
  const [starred, setStarred] = useState(false)

  const candidates = noRepeat ? students.filter((s) => !calledIds.includes(s.id)) : students
  const allCalled = candidates.length === 0

  const spin = () => {
    if (spinning || allCalled) return
    const index = Math.floor(Math.random() * candidates.length)
    setEntries(candidates)
    setPending(candidates[index])
    setPicked(null)
    setSpinning(true)
    setRotation((r) => rotationFor(index, candidates.length, r))
  }

  const onSpinEnd = () => {
    if (!pending) return
    setPicked(pending)
    setStarred(false)
    markCalled(pending.id)
    setPending(null)
    setSpinning(false)
  }

  const giveStar = () => {
    if (!picked) return
    const { name } = picked
    setStarred(true)
    message.success(`Đã thưởng 1 sao cho ${name}`)
    awardStars(picked.id, 1).catch(() => {
      setStarred(false)
      message.error(`Chưa lưu được sao cho ${name}, cô thử lại nhé.`)
    })
  }

  const resetCalls = () => {
    resetCalled()
    setPicked(null)
    setEntries(students)
  }

  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <div className="flex h-full items-center gap-14 px-12 py-7">
      <SpinWheel labels={entries.map((s) => s.name)} rotation={rotation} onSpinEnd={onSpinEnd} />

      <div className="flex flex-1 flex-col gap-[22px]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[30px] font-extrabold">Vòng quay gọi tên</h1>
            <span className="text-lg text-ink-soft">
              {className} · Đã gọi {calledIds.length} / {students.length} bạn
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PickModeMenu current="wheel" />
            <button
              type="button"
              onClick={goBack}
              className="flex h-12 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-white pr-5 pl-3.5 font-[inherit] text-[17px] font-extrabold text-ink hover:text-primary-ink"
            >
              <ChevronLeftIcon size={20} />
              Quay lại
            </button>
          </div>
        </div>

        <div className="flex min-h-[262px] flex-col items-center justify-center gap-3.5 rounded-[32px] bg-white px-8 py-[30px]">
          <AnimatePresence mode="wait">
            {picked ? (
              <motion.div
                key={picked.id + calledIds.length}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="flex flex-col items-center gap-3.5"
              >
                <span className="text-xl font-bold text-ink-soft">Bạn được gọi là</span>
                <Avatar name={picked.name} size={96} className="font-display" />
                <span className="font-display text-[64px] leading-none font-extrabold">{picked.name}</span>
              </motion.div>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center font-display text-[32px] font-extrabold text-ink-soft"
              >
                {spinning ? 'Đang quay…' : allCalled ? 'Đã gọi hết cả lớp!' : 'Bấm “Quay” để chọn một bạn'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3.5">
          {allCalled && !spinning ? (
            <button
              type="button"
              onClick={resetCalls}
              className="flex h-[68px] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-[22px] border-0 bg-primary font-[inherit] text-xl font-extrabold text-white hover:brightness-110"
            >
              <RefreshIcon size={24} />
              Gọi lại từ đầu
            </button>
          ) : (
            <button
              type="button"
              onClick={spin}
              disabled={spinning}
              className="flex h-[68px] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-[22px] border-0 bg-primary font-[inherit] text-xl font-extrabold text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshIcon size={24} />
              {picked ? 'Quay tiếp' : 'Quay'}
            </button>
          )}
          <button
            type="button"
            onClick={giveStar}
            disabled={!picked || starred || spinning}
            className="flex h-[68px] flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-[22px] border-0 bg-sun font-[inherit] text-xl font-extrabold text-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FilledStarIcon size={24} fill="#FFFFFF" stroke="#1F2A44" />
            {starred ? 'Đã thưởng sao' : 'Thưởng 1 sao'}
          </button>
        </div>

        <label className="flex cursor-pointer items-center gap-3.5 rounded-[20px] bg-white px-[18px] py-3.5 text-lg font-bold">
          <input
            type="checkbox"
            checked={noRepeat}
            onChange={(e) => setNoRepeat(e.target.checked)}
            className="size-[26px] accent-primary"
          />
          Không gọi lại bạn đã được gọi
        </label>
      </div>
    </div>
  )
}
