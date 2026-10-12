import { Modal } from 'antd'
import { useNavigate } from 'react-router'
import { ArrowRightIcon } from '@/components/ui/icons'
import { PICK_MODES } from '@/game-engine/name-picker/modes'

/** Scene picture of each name-picking game (a still of its scene, idle). */
const pickArt = (mode: string) => `/assets/games/pick-${mode}.webp`

interface PickModeDialogProps {
  open: boolean
  onClose: () => void
}

/** "Đua tên" holds several games: the teacher picks one here instead of starting on the horse race. */
export function PickModeDialog({ open, onClose }: PickModeDialogProps) {
  const navigate = useNavigate()
  const modes = Object.values(PICK_MODES)
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={960} centered destroyOnHidden title={null}>
      <div className="flex flex-col gap-1 pr-8">
        <h2 className="m-0 text-[24px] font-black text-[#1A2440]">Đua tên: chọn trò</h2>
        <p className="m-0 text-[14.5px] text-ink-soft">
          {modes.length} trò cùng chọn ngẫu nhiên một bạn trong lớp. Đang chơi vẫn đổi trò được, các bạn đã gọi vẫn được nhớ.
        </p>
      </div>
      <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {modes.map((m) => (
          <li key={m.mode}>
            <button
              type="button"
              onClick={() => navigate(`/tools/pick/${m.mode}`)}
              aria-label={`Chơi ${m.title}`}
              className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[14px] border border-[#E3E8F1] bg-white p-0 text-left font-[inherit] text-ink shadow-[0_1px_3px_rgba(31,42,68,0.05)] transition-shadow hover:border-primary hover:shadow-[0_6px_18px_rgba(31,42,68,0.1)]"
            >
              <img src={pickArt(m.mode)} alt="" className="block aspect-video w-full object-cover" />
              <span className="flex flex-1 flex-col gap-1 px-4 pt-3 pb-4">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[17px] font-black">{m.title}</span>
                  <span className="rounded-full bg-[#F1F3F8] px-2.5 py-0.5 text-[12px] whitespace-nowrap text-ink-soft">
                    {m.slots} bạn mỗi lượt
                  </span>
                </span>
                <span className="text-[13.5px] text-ink-soft">{m.prompt}</span>
                <span className="mt-2 flex items-center gap-1.5 text-[14px] font-bold text-primary group-hover:text-primary-ink">
                  {m.startLabel}
                  <ArrowRightIcon size={16} strokeWidth={2.4} />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
