import type { ReactNode } from 'react'
import { FileTextIcon, GamepadIcon, PlusIcon, SearchIcon } from '@/components/ui/icons'
import { QS_ASSETS } from '@/pages/question-sets/qsUi'

interface QuestionSetsBannerProps {
  onCreate: () => void
  onManage: () => void
  onUse: () => void
}

/** Title, what the page is for, three shortcuts and the teacher with her pupils. */
export function QuestionSetsBanner({ onCreate, onManage, onUse }: QuestionSetsBannerProps) {
  return (
    <section className="@container relative overflow-hidden rounded-[22px] bg-[linear-gradient(100deg,#E4EFFD_0%,#DCEBFD_55%,#D3E6FC_100%)]">
      <span aria-hidden="true" className="absolute -bottom-12 -left-8 h-32 w-64 rounded-full bg-white/40" />
      {/* The scene stands on the shortcuts row, at the right of the title. */}
      <div className="relative flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-4 self-center py-1">
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
          <img
            src={`${QS_ASSETS}/banner.svg`}
            alt=""
            aria-hidden="true"
            className="-my-2 -mr-4 hidden h-[150px] w-auto shrink-0 select-none @min-[820px]:block"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 @min-[620px]:grid-cols-3">
          <Shortcut icon={<PlusIcon size={20} />} title="Tạo bộ câu hỏi mới" text="Thêm câu hỏi, đáp án, chủ đề" onClick={onCreate} />
          <Shortcut icon={<SearchIcon size={20} />} title="Quản lý bộ câu hỏi" text="Tìm, sửa, nhân bản, xóa" onClick={onManage} />
          <Shortcut icon={<GamepadIcon size={21} />} title="Sử dụng trong trò chơi" text="Kết hợp với nhiều loại game" onClick={onUse} />
        </div>
      </div>
    </section>
  )
}

function Shortcut({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-[16px] border-0 bg-white/85 px-3.5 py-3 text-left font-[inherit] text-ink shadow-[0_2px_8px_rgba(53,99,233,0.06)] transition hover:-translate-y-px hover:bg-white hover:shadow-[0_6px_16px_rgba(53,99,233,0.12)]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary-soft text-primary">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[14.5px] font-extrabold">{title}</span>
        <span className="truncate text-[12.5px] text-ink-muted">{text}</span>
      </span>
    </button>
  )
}
