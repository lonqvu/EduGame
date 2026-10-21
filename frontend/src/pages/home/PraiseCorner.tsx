import { Modal } from 'antd'
import { useState } from 'react'
import { ArrowRightIcon, ChevronDownIcon, FilledStarIcon } from '@/components/ui/icons'
import { kidAvatar } from '@/pages/home/homeAssets'
import { Art, Panel, PanelHeader } from '@/pages/home/homeUi'
import type { Student } from '@/types/game'

export type StarPeriod = 'week' | 'all'

interface PraiseCornerProps {
  students: Student[]
  period: StarPeriod
  onPeriodChange: (period: StarPeriod) => void
}

interface Ranked {
  student: Student
  stars: number
  position: number
}

const PODIUM = [
  // 2nd on the left, 1st in the middle, 3rd on the right; the step under each is as high as the place is good.
  { position: 2, crown: 'crown-2', step: 'h-[46px] bg-[linear-gradient(#DCEAFE,#EEF5FF)]', medal: 'bg-[#8FB4F2]', ring: 'ring-[#CFE3FB]', size: 62 },
  { position: 1, crown: 'crown-1', step: 'h-[66px] bg-[linear-gradient(#FFEFA8,#FFF8DA)]', medal: 'bg-[#F5B400]', ring: 'ring-[#FFE27A]', size: 74 },
  { position: 3, crown: 'crown-3', step: 'h-[32px] bg-[linear-gradient(#FFDCD6,#FFF1EE)]', medal: 'bg-[#E58A6F]', ring: 'ring-[#FFD3CA]', size: 62 },
] as const

const Star = ({ size = 18 }: { size?: number }) => (
  <span className="flex" style={{ width: size, height: size }}>
    <FilledStarIcon size={size} stroke="#E9A21B" fill="#FFC43D" />
  </span>
)

/** Weekly (or all-time) star ranking: a podium for the top 3; the whole class in a dialog. */
export function PraiseCorner({ students, period, onPeriodChange }: PraiseCornerProps) {
  const [fullOpen, setFullOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)

  const ranked: Ranked[] = [...students]
    .map((student) => ({ student, stars: period === 'week' ? student.stars : student.totalStars }))
    .sort((a, b) => b.stars - a.stars || a.student.name.localeCompare(b.student.name, 'vi'))
    .map((r, i) => ({ ...r, position: i + 1 }))
  const byPosition = (p: number) => ranked[p - 1]

  return (
    <Panel className="flex flex-col px-[18px] pt-[16px] pb-[14px]">
      <PanelHeader
        icon={<Art name="icon-star" className="h-[28px] w-[28px]" />}
        title="Góc tuyên dương"
        action={
          <div className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={periodOpen}
              onClick={() => setPeriodOpen((o) => !o)}
              className="flex h-[32px] cursor-pointer items-center gap-3 rounded-[11px] whitespace-nowrap border border-line bg-white px-3 font-[inherit] text-[13px] font-bold text-ink"
            >
              {period === 'week' ? 'Tuần này' : 'Tất cả'}
              <ChevronDownIcon size={15} strokeWidth={2.6} />
            </button>
            {periodOpen && (
              <ul
                role="listbox"
                className="absolute top-[36px] right-0 z-20 m-0 flex w-[120px] list-none flex-col rounded-xl bg-white p-1 shadow-[0_8px_24px_rgba(31,42,68,0.14)]"
              >
                {(['week', 'all'] as const).map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={p === period}
                      onClick={() => {
                        onPeriodChange(p)
                        setPeriodOpen(false)
                      }}
                      className={`w-full cursor-pointer rounded-lg border-0 px-3 py-2 text-left font-[inherit] text-[13px] font-bold ${
                        p === period ? 'bg-primary-soft text-primary-ink' : 'bg-transparent text-ink hover:bg-surface-soft'
                      }`}
                    >
                      {p === 'week' ? 'Tuần này' : 'Tất cả'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
      />

      {ranked.length === 0 ? (
        <p className="m-0 py-8 text-center text-ink-soft">Lớp chưa có học sinh.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 items-end gap-1.5">
            {PODIUM.map((slot) => {
              const r = byPosition(slot.position)
              if (!r) return <div key={slot.position} />
              return (
                <div key={slot.position} className="flex min-w-0 flex-col items-center">
                  <Art name={slot.crown} className="relative z-10 -mb-[5px]" />
                  <span
                    className={`flex items-center justify-center overflow-hidden rounded-full bg-white ring-4 ${slot.ring}`}
                    style={{ width: slot.size, height: slot.size }}
                  >
                    <img src={kidAvatar(slot.position)} alt="" className="size-full object-cover" />
                  </span>
                  <span className="mt-2 max-w-full truncate px-1 text-[14.5px] font-extrabold">{r.student.name}</span>
                  <span className="mt-0.5 mb-2 flex items-center gap-1 text-[13.5px] font-bold text-[#3F4B68]">
                    <Star size={15} />
                    {r.stars} sao
                  </span>
                  <span className={`flex w-full items-start justify-center rounded-t-[12px] pt-1.5 ${slot.step}`}>
                    <span
                      className={`flex size-[22px] items-center justify-center rounded-full text-[12px] font-black text-white ${slot.medal}`}
                    >
                      {slot.position}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setFullOpen(true)}
            className="mt-3 flex min-h-[40px] cursor-pointer flex-wrap items-center justify-center gap-x-2 gap-y-0.5 py-1.5 rounded-[12px] border-0 bg-[#FFF8E6] px-3 font-[inherit] text-[13.5px] font-bold text-[#7A5A00] hover:bg-[#FFF1CC]"
          >
            🏆 Cùng nhau cố gắng hơn nữa nhé!
            <span className="flex items-center gap-1 text-primary">
              Xem cả lớp
              <ArrowRightIcon size={15} strokeWidth={2.4} />
            </span>
          </button>
        </>
      )}

      <Modal
        open={fullOpen}
        onCancel={() => setFullOpen(false)}
        footer={null}
        title={<span className="text-xl font-black">Bảng xếp hạng {period === 'week' ? 'tuần này' : 'từ trước tới nay'}</span>}
      >
        <ol className="m-0 flex max-h-[60vh] list-none flex-col overflow-y-auto p-0">
          {ranked.map((r) => (
            <RankRow key={r.student.id} ranked={r} />
          ))}
        </ol>
      </Modal>
    </Panel>
  )
}

function RankRow({ ranked }: { ranked: Ranked }) {
  return (
    <li className="flex h-[31px] items-center gap-3 border-b border-[#EEF2F8] last:border-b-0">
      <span className="w-[18px] text-center text-[13.5px] font-bold text-ink">{ranked.position}</span>
      <img src={kidAvatar(ranked.position)} alt="" className="size-[26px] shrink-0 rounded-full object-cover" />
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{ranked.student.name}</span>
      <span className="flex items-center gap-1.5 pr-1 text-[13.5px] text-[#3F4B68]">
        <Star size={16} />
        {ranked.stars}
      </span>
    </li>
  )
}
