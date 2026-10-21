import { Link } from 'react-router'
import { ArrowRightIcon, PlayIcon } from '@/components/ui/icons'
import { HOME_ASSETS } from '@/pages/home/homeAssets'

/** The one big action of the page: choose a game and put it on the projector. */
export function StartCard() {
  return (
    <section
      aria-labelledby="start-title"
      className="@container relative flex min-h-[230px] overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#EAF2FF_0%,#DDEBFF_55%,#D2E4FF_100%)] px-6 py-6 sm:px-8"
    >
      <span aria-hidden="true" className="absolute -right-10 -bottom-16 size-56 rounded-full bg-white/35" />
      <span aria-hidden="true" className="absolute top-6 right-[38%] size-3 rotate-45 rounded-[3px] bg-white/70" />
      <div className="relative z-10 flex flex-col items-start gap-2 @min-[460px]:max-w-[62%]">
        <span className="rounded-full bg-white/80 px-3 py-1 text-[11.5px] font-extrabold tracking-[0.06em] text-primary-ink uppercase">
          Tiết học của cô
        </span>
        <h2 id="start-title" className="m-0 mt-1 text-[26px] leading-tight font-black text-[#1A2440] sm:text-[28px]">
          Bắt đầu trò chơi ngay!
        </h2>
        <p className="m-0 text-[15px] text-[#3F4B68]">Chọn trò chơi và chiếu lên màn hình để cả lớp cùng tham gia.</p>
        <Link
          to="/games/new"
          className="mt-4 flex h-[52px] items-center gap-3 rounded-full bg-primary pr-6 pl-5 text-[16.5px] font-extrabold text-white shadow-[0_8px_18px_rgba(52,103,244,0.3)] hover:text-white hover:brightness-110"
        >
          <PlayIcon size={22} />
          Bắt đầu trò chơi
          <ArrowRightIcon size={18} strokeWidth={2.6} />
        </Link>
      </div>
      <img
        src={`${HOME_ASSETS}/star-mascot.svg`}
        alt=""
        className="pointer-events-none absolute top-1/2 right-4 hidden w-[min(190px,34%)] -translate-y-1/2 select-none motion-safe:animate-[guide-float_4s_ease-in-out_infinite] @min-[460px]:block"
      />
    </section>
  )
}
