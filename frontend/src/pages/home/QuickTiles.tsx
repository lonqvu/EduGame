import { ChevronRightIcon } from '@/components/ui/icons'
import { Art } from '@/pages/home/homeUi'

interface QuickTilesProps {
  onCreate: () => void
  onOpenClass: () => void
}

/** The two other things a teacher comes for, beside "Tổ chức trò chơi": writing questions and the class. */
export function QuickTiles({ onCreate, onOpenClass }: QuickTilesProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <Tile icon="card-question-icon" title="Tạo bộ câu hỏi" text="Soạn một lần, dùng cho mọi trò" tint="bg-[#FFF4D6]" onClick={onCreate} />
      <Tile icon="card-class-icon" title="Quản lý lớp học" text="Học sinh, nhóm và điểm sao" tint="bg-[#DDF5E8]" onClick={onOpenClass} />
    </div>
  )
}

function Tile({ icon, title, text, tint, onClick }: { icon: string; title: string; text: string; tint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer flex-col items-start gap-2 rounded-[20px] border-0 px-3.5 py-3 text-left font-[inherit] text-ink transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-3.5 sm:px-4 sm:py-3.5 ${tint}`}
    >
      <Art name={icon} className="size-10 shrink-0 rounded-[12px] sm:size-[52px]" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-black sm:text-[17px]">{title}</span>
        <span className="hidden text-[13.5px] text-[#5B6580] sm:block">{text}</span>
      </span>
      <span aria-hidden="true" className="hidden size-[34px] shrink-0 items-center justify-center rounded-full bg-white text-[#3D4766] sm:flex">
        <ChevronRightIcon size={18} strokeWidth={2.6} />
      </span>
    </button>
  )
}
