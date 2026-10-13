import type { ReactNode } from 'react'
import { FileTextIcon, GamepadIcon, PlusIcon, SearchIcon } from '@/components/ui/icons'
import { QS_ASSETS } from '@/pages/question-sets/qsUi'

interface QuestionSetsBannerProps {
  onCreate: () => void
  onManage: () => void
  onUse: () => void
}

/**
 * Title, what the page is for and three shortcuts on the left; on the right, a column the teacher with her pupils
 * fills from top to bottom (they stand on the banner's bottom edge, as in the design).
 */
export function QuestionSetsBanner({ onCreate, onManage, onUse }: QuestionSetsBannerProps) {
  return (
    <section className="@container relative overflow-hidden rounded-[22px] bg-[linear-gradient(100deg,#E4EFFD_0%,#DCEBFD_55%,#D3E6FC_100%)]">
      <span aria-hidden="true" className="absolute -bottom-12 -left-8 h-32 w-64 rounded-full bg-white/40" />
      <div className="relative grid grid-cols-1 @min-[700px]:grid-cols-[minmax(0,1fr)_clamp(220px,34%,330px)]">
        <div className="@container/main flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex size-[60px] shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_18px_rgba(53,99,233,0.3)]">
              <FileTextIcon size={30} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="m-0 text-[28px] leading-tight font-black tracking-[-0.01em] text-[#1A2440] @min-[700px]:text-[34px]">
                Bộ câu hỏi
              </h1>
              <p className="m-0 text-[15px] text-ink-soft @min-[700px]:text-[16px]">
                Tạo và quản lý các bộ câu hỏi để sử dụng trong các trò chơi học tập.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 @min-[400px]/main:grid-cols-3">
            <Shortcut icon={<PlusIcon size={20} />} title="Tạo bộ câu hỏi mới" text="Thêm câu hỏi, đáp án, chủ đề" onClick={onCreate} />
            <Shortcut icon={<SearchIcon size={20} />} title="Quản lý bộ câu hỏi" text="Tìm, sửa, nhân bản, xóa" onClick={onManage} />
            <Shortcut icon={<GamepadIcon size={21} />} title="Sử dụng trong trò chơi" text="Kết hợp với nhiều loại game" onClick={onUse} />
          </div>
        </div>
        <div aria-hidden="true" className="relative hidden @min-[700px]:block">
          <img
            src={`${QS_ASSETS}/banner.svg`}
            alt=""
            className="absolute inset-0 h-full w-full object-contain object-[right_bottom] select-none"
          />
        </div>
      </div>
    </section>
  )
}

/** One card per row on phones; side by side, the icon goes above the text when the cards are narrow. */
function Shortcut({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-[16px] border-0 bg-white/85 px-3.5 py-3 text-left font-[inherit] text-ink shadow-[0_2px_8px_rgba(53,99,233,0.06)] transition hover:-translate-y-px hover:bg-white hover:shadow-[0_6px_16px_rgba(53,99,233,0.12)] @min-[400px]/main:flex-col @min-[400px]/main:items-start @min-[400px]/main:gap-2 @min-[680px]/main:flex-row @min-[680px]/main:items-center @min-[680px]/main:gap-3"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft text-primary">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[14.5px] leading-snug font-extrabold">{title}</span>
        <span className="text-[12.5px] leading-snug text-ink-muted">{text}</span>
      </span>
    </button>
  )
}
