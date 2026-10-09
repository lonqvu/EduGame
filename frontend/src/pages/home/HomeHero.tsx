import { ChevronDownIcon, UsersIcon } from '@/components/ui/icons'
import { HOME_ASSETS } from '@/pages/home/homeAssets'
import { Art } from '@/pages/home/homeUi'

interface HomeHeroProps {
  greetingName: string
  className: string
  studentCount: number
  onPickClass: () => void
}

/** Greeting banner: teacher, class being taught, class size; illustration on the right. */
export function HomeHero({ greetingName, className, studentCount, onPickClass }: HomeHeroProps) {
  return (
    <section className="@container relative flex min-h-[235px] overflow-hidden rounded-[22px] bg-[linear-gradient(100deg,#DCEDFD_0%,#D3E8FC_45%,#CDE5FC_100%)]">
      {/* Soft clouds behind the text, as in the design. */}
      <span aria-hidden="true" className="absolute -bottom-10 -left-6 h-28 w-56 rounded-full bg-white/45 blur-[2px]" />
      <span aria-hidden="true" className="absolute bottom-[-30px] left-40 h-20 w-44 rounded-full bg-white/35" />

      <div className="relative z-10 flex flex-col justify-center gap-[9px] px-6 py-7 @min-[640px]:max-w-[50%] @min-[980px]:max-w-none sm:pl-[44px]">
        <h1 className="m-0 flex items-center gap-3 text-[38px] leading-[1.05] font-black tracking-[-0.015em] text-[#1A2440] @min-[980px]:text-[50px]">
          Chào {greetingName}!
          <Art name="wave" className="h-[46px] w-[46px] sm:h-[60px] sm:w-[60px]" />
        </h1>
        <p className="m-0 text-[17px] text-[#3F4B68] sm:text-[19px]">Cùng tạo những giờ học thật vui và ý nghĩa nhé!</p>

        <div className="mt-[14px] flex w-fit flex-wrap items-center gap-x-7 gap-y-2 rounded-[22px] bg-white/75 py-[9px] pr-7 pl-[10px] shadow-[0_2px_8px_rgba(53,99,233,0.06)]">
          <button
            type="button"
            onClick={onPickClass}
            className="flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left font-[inherit] text-ink"
          >
            <span className="flex size-[46px] items-center justify-center rounded-full bg-[#CFE3FB] text-primary">
              <UsersIcon size={24} strokeWidth={2} />
            </span>
            <span className="flex flex-col">
              <span className="text-[12.5px] text-ink-soft">Lớp đang dạy</span>
              <span className="flex items-center gap-1.5 text-[15.5px] font-extrabold">
                {className || 'Chưa có lớp'}
                <ChevronDownIcon size={16} strokeWidth={2.6} />
              </span>
            </span>
          </button>
          <span className="flex items-center gap-3">
            <span className="flex size-[42px] items-center justify-center rounded-full bg-[#E4E9FF] text-[#4B57D6]">
              <UsersIcon size={22} strokeWidth={2} />
            </span>
            <span className="text-[15px] font-extrabold">{studentCount} học sinh</span>
          </span>
        </div>
      </div>

      {/*
        The scene is drawn wider than any banner (scripts/extend_banners.py): it starts right after the greeting
        and is anchored on the right, so it reaches the text whatever the screen width.
      */}
      <div className="pointer-events-none absolute inset-y-0 right-0 left-[48%] hidden overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_80px)] @min-[640px]:block @min-[980px]:left-[430px]">
        <img
          src={`${HOME_ASSETS}/hero-wide.png`}
          alt="Cô giáo và các bạn nhỏ bên bảng: Học vui, học tốt cùng EduGame!"
          className="absolute top-0 right-0 h-full w-auto max-w-none select-none"
        />
      </div>
    </section>
  )
}
