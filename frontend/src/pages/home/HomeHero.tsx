import { ChevronDownIcon, UsersIcon } from '@/components/ui/icons'
import { ClassSwitcher, type ClassChoice } from '@/pages/home/ClassSwitcher'
import { HOME_ASSETS } from '@/pages/home/homeAssets'
import { Art } from '@/pages/home/homeUi'

interface HomeHeroProps {
  greetingName: string
  className: string
  studentCount: number
  classes: ClassChoice[]
  currentCode: string | null
  onPickClass: (code: string) => void
  onManageClasses: () => void
}

/** Greeting banner: teacher, class being taught and its size; the classroom picture on the right. */
export function HomeHero({ greetingName, className, studentCount, ...switcher }: HomeHeroProps) {
  return (
    <section className="@container relative flex min-h-[170px] overflow-hidden rounded-[22px] bg-[linear-gradient(100deg,#E4F0FE_0%,#D9EAFD_50%,#CFE5FC_100%)]">
      <span aria-hidden="true" className="absolute -bottom-12 -left-6 h-28 w-56 rounded-full bg-white/45" />

      <div className="relative z-10 flex flex-col justify-center gap-1.5 px-5 py-5 sm:px-6 @min-[640px]:max-w-[52%] @min-[900px]:max-w-[440px]">
        <h1 className="m-0 flex items-center gap-2 text-[26px] leading-tight font-black text-[#1A2440] sm:text-[28px]">
          Chào {greetingName}!
          <Art name="wave" className="size-[34px]" />
        </h1>
        <p className="m-0 text-[15px] text-[#3F4B68]">Cùng tạo những giờ học thật vui và ý nghĩa nhé!</p>

        <div className="mt-3 flex w-fit max-w-full flex-wrap items-center gap-x-5 gap-y-1 rounded-[18px] bg-white/85 py-2 pr-5 pl-2 shadow-[0_2px_8px_rgba(53,99,233,0.06)]">
          <ClassSwitcher {...switcher}>
            <button
              type="button"
              aria-label={`Lớp đang dạy: ${className || 'chưa có lớp'}. Đổi lớp`}
              className="flex min-w-0 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left font-[inherit] text-ink"
            >
              <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[#DCEAFE] text-primary">
                <UsersIcon size={20} strokeWidth={2} />
              </span>
              <span className="truncate text-[15.5px] font-extrabold">{className || 'Chưa có lớp'}</span>
              <ChevronDownIcon size={16} strokeWidth={2.6} className="shrink-0" />
            </button>
          </ClassSwitcher>
          <span className="flex items-center gap-2 text-[14px] font-bold text-[#3F4B68]">
            <UsersIcon size={18} strokeWidth={2} className="text-[#4B57D6]" />
            {studentCount} học sinh
          </span>
        </div>
      </div>

      {/*
        The scene is drawn wider than any banner (scripts/extend_banners.py), always as tall as the banner and
        anchored on the right; when the space is narrow it slides right instead of shrinking, so the teacher stays.
      */}
      <div className="pointer-events-none absolute inset-y-0 right-0 left-[48%] hidden overflow-hidden [container-type:size] [mask-image:linear-gradient(to_right,transparent,black_80px)] @min-[640px]:block @min-[900px]:left-[400px]">
        <img
          src={`${HOME_ASSETS}/hero-wide.png`}
          alt="Cô giáo và các bạn nhỏ bên bảng: Học vui, học tốt cùng Lớp Vui!"
          className="absolute right-[min(0px,calc(50cqw-128cqh))] bottom-0 h-full w-auto max-w-none select-none"
        />
      </div>
    </section>
  )
}
