import { Dropdown } from 'antd'
import { Link } from 'react-router'
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, UsersIcon } from '@/components/ui/icons'
import { HOME_ASSETS } from '@/pages/home/homeAssets'
import { Art } from '@/pages/home/homeUi'

/** An active class the teacher can switch to. */
export interface ClassChoice {
  code: string
  label: string
  studentCount: number
}

interface HomeHeroProps {
  greetingName: string
  className: string
  studentCount: number
  classes: ClassChoice[]
  currentCode: string | null
  onPickClass: (code: string) => void
  onManageClasses: () => void
}

/**
 * Greeting banner: teacher, class being taught and its size, and the one main action of the page, "Tổ chức trò
 * chơi"; illustration on the right.
 */
export function HomeHero({ greetingName, className, studentCount, classes, currentCode, onPickClass, onManageClasses }: HomeHeroProps) {
  return (
    <section className="@container relative flex min-h-[235px] overflow-hidden rounded-[22px] bg-[linear-gradient(100deg,#DCEDFD_0%,#D3E8FC_45%,#CDE5FC_100%)]">
      {/* Soft clouds behind the text, as in the design. */}
      <span aria-hidden="true" className="absolute -bottom-10 -left-6 h-28 w-56 rounded-full bg-white/45 blur-[2px]" />
      <span aria-hidden="true" className="absolute bottom-[-30px] left-40 h-20 w-44 rounded-full bg-white/35" />

      <div className="relative z-10 flex flex-col justify-center gap-[9px] px-6 py-7 @min-[640px]:max-w-[56%] @min-[980px]:max-w-none sm:pl-[44px]">
        <h1 className="m-0 flex items-center gap-3 text-[38px] leading-[1.05] font-black tracking-[-0.015em] text-[#1A2440] @min-[980px]:text-[50px]">
          Chào {greetingName}!
          <Art name="wave" className="h-[46px] w-[46px] sm:h-[60px] sm:w-[60px]" />
        </h1>
        <p className="m-0 text-[17px] text-[#3F4B68] sm:text-[18px]">Hôm nay lớp mình chơi gì nhỉ?</p>

        <div className="mt-[10px] flex w-fit items-center gap-2 rounded-full bg-white py-[5px] pr-4 pl-[5px] shadow-[0_2px_8px_rgba(53,99,233,0.06)]">
          <Dropdown
            trigger={['click']}
            placement="bottomLeft"
            menu={{
              selectable: true,
              selectedKeys: currentCode ? [currentCode] : [],
              items: [
                ...classes.map((c) => ({
                  key: c.code,
                  label: (
                    <span className="flex min-w-[210px] items-center justify-between gap-4">
                      <span>
                        <strong>{c.label}</strong> <span className="text-ink-muted">· {c.studentCount} học sinh</span>
                      </span>
                      {c.code === currentCode && <CheckIcon size={16} className="text-primary" />}
                    </span>
                  ),
                  onClick: () => onPickClass(c.code),
                })),
                ...(classes.length ? [{ type: 'divider' as const }] : []),
                { key: 'manage', label: classes.length ? 'Quản lý lớp học' : 'Tạo lớp học', onClick: onManageClasses },
              ],
            }}
          >
            <button
              type="button"
              aria-label={`Lớp đang dạy: ${className || 'chưa có lớp'}. Đổi lớp`}
              className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 font-[inherit] text-[15.5px] font-extrabold text-ink hover:text-primary"
            >
              <span className="flex size-[34px] items-center justify-center rounded-full bg-[#E3EEFD] text-primary">
                <UsersIcon size={19} strokeWidth={2} />
              </span>
              {className || 'Chưa có lớp'}
              <ChevronDownIcon size={15} strokeWidth={2.6} />
            </button>
          </Dropdown>
          <span aria-hidden="true" className="text-ink-muted">
            ·
          </span>
          <span className="text-[15px] font-semibold text-ink-soft">{studentCount} học sinh</span>
        </div>

        <Link
          to="/games/new"
          className="mt-[16px] flex h-[58px] w-full items-center justify-center gap-3 sm:w-fit sm:justify-start rounded-full bg-primary px-7 text-[19px] font-black text-white shadow-[0_10px_24px_rgba(53,99,233,0.35)] hover:text-white hover:brightness-110"
        >
          <Art name="gamepad" className="h-[30px] w-[30px]" />
          Tổ chức trò chơi
          <ArrowRightIcon size={19} strokeWidth={2.6} />
        </Link>
      </div>

      {/*
        The scene is drawn wider than any banner (scripts/extend_banners.py): it starts right after the greeting,
        nearly as tall as the banner, anchored on the right so it reaches the text whatever the screen width. It slides
        right only when the space cannot hold the teacher and the board (1.64 picture heights from its right edge,
        the picture is 0.88 of the banner): a board cut in the middle of its words looks broken.
      */}
      <div className="pointer-events-none absolute inset-y-0 right-0 left-[310px] hidden overflow-hidden [container-type:size] [mask-image:linear-gradient(to_right,transparent,black_80px)] @min-[640px]:block @min-[980px]:left-[430px]">
        <img
          src={`${HOME_ASSETS}/hero-wide.png`}
          alt="Cô giáo và các bạn nhỏ bên bảng: Học vui, học tốt cùng Lớp Vui!"
          className="absolute right-[min(0px,calc(100cqw-144cqh))] bottom-0 h-[88%] w-auto max-w-none select-none"
        />
      </div>
    </section>
  )
}
