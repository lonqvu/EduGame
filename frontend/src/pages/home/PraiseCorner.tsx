import { Modal } from 'antd'
import { useState } from 'react'
import { ArrowRightIcon, ChartIcon, ChevronDownIcon, FilledStarIcon } from '@/components/ui/icons'
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
  // [position, crown, card tint, height]: 2nd on the left, 1st in the middle, 3rd on the right.
  { position: 2, crown: 'crown-2', tint: 'bg-[linear-gradient(#EEF5FE,#F7FAFF)]', ring: 'bg-[#CFE3FB]', size: 66, top: 26 },
  { position: 1, crown: 'crown-1', tint: 'bg-[linear-gradient(#FFF6CF,#FFFBEA)]', ring: 'bg-[#FFE883]', size: 76, top: 0 },
  { position: 3, crown: 'crown-3', tint: 'bg-[linear-gradient(#FFEDEE,#FFF7F7)]', ring: 'bg-[#FFD3D5]', size: 66, top: 26 },
] as const

const Star = ({ size = 18 }: { size?: number }) => (
  <span className="flex" style={{ width: size, height: size }}>
    <FilledStarIcon size={size} stroke="#E9A21B" fill="#FFC43D" />
  </span>
)

/** Weekly (or all-time) star ranking: podium for the top 3, then the next five. */
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
              className="flex h-[32px] cursor-pointer items-center gap-3 rounded-[11px] border border-line bg-white px-3 font-[inherit] text-[13px] font-bold text-ink"
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
          <div className="mt-[14px] grid grid-cols-3 items-end gap-0">
            {PODIUM.map((slot) => {
              const r = byPosition(slot.position)
              if (!r) return <div key={slot.position} />
              return (
                <div key={slot.position} className="relative flex flex-col items-center" style={{ paddingTop: slot.top }}>
                  <span
                    aria-hidden="true"
                    className={`absolute right-0 bottom-0 left-0 rounded-t-[16px] ${slot.tint}`}
                    style={{ top: slot.top + slot.size * 0.62 }}
                  />
                  <Art name={slot.crown} className="relative z-10 -mb-[6px]" />
                  <span
                    className={`relative z-10 flex items-center justify-center overflow-hidden rounded-full ${slot.ring}`}
                    style={{ width: slot.size, height: slot.size }}
                  >
                    <img src={kidAvatar(slot.position)} alt="" className="size-full object-cover" />
                  </span>
                  <span className="relative z-10 mt-[8px] max-w-full truncate px-1 text-[15px] font-extrabold">{r.student.name}</span>
                  <span className="relative z-10 mt-[2px] mb-[12px] flex items-center gap-1.5 text-[15px] font-extrabold">
                    <Star />
                    {r.stars}
                  </span>
                </div>
              )
            })}
          </div>

          <ol className="m-0 mt-[6px] flex list-none flex-col p-0">
            {ranked.slice(3, 8).map((r) => (
              <RankRow key={r.student.id} ranked={r} />
            ))}
          </ol>

          <button
            type="button"
            onClick={() => setFullOpen(true)}
            className="mt-[12px] flex h-[41px] cursor-pointer items-center justify-center gap-2.5 rounded-[12px] border border-[#BFD3F7] bg-[#F4F8FE] font-[inherit] text-[14.5px] font-bold text-primary hover:border-primary"
          >
            <ChartIcon size={19} />
            Xem bảng xếp hạng đầy đủ
            <ArrowRightIcon size={16} strokeWidth={2.4} />
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
