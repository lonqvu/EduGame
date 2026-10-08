import { Link } from 'react-router'
import { ArrowRightIcon, ChevronRightIcon } from '@/components/ui/icons'
import { Art } from '@/pages/home/homeUi'

interface ActionCardsProps {
  startTarget: string
  onCreate: () => void
  onOpenClass: () => void
}

const Sparkle = ({ size, className }: { size: number; className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={`absolute ${className}`}>
    <path d="M12 0c.9 6.4 5.6 11.1 12 12-6.4.9-11.1 5.6-12 12-.9-6.4-5.6-11.1-12-12C6.4 11.1 11.1 6.4 12 0z" fill="#FFD43B" />
  </svg>
)

/** The three big shortcuts: run a game, write questions, manage the class. */
export function ActionCards({ startTarget, onCreate, onOpenClass }: ActionCardsProps) {
  return (
    <div className="@container">
    <div className="grid gap-4 @min-[600px]:grid-cols-3">
      <article className="@container/card relative flex min-h-[243px] flex-col overflow-hidden rounded-[20px] bg-[#3467F4] px-[27px] pt-[26px] pb-[22px] text-white">
        <span aria-hidden="true" className="absolute -top-16 right-6 size-56 rounded-full bg-[#3F72F6]" />
        <span aria-hidden="true" className="absolute top-16 right-[-60px] size-48 rounded-full bg-[#3A6EF5]" />
        <Sparkle size={30} className="top-[30px] left-[118px]" />
        <Sparkle size={30} className="top-[55px] right-[60px]" />
        <Sparkle size={25} className="top-[88px] right-[30px]" />
        <Sparkle size={24} className="top-[122px] right-[60px]" />
        <Art name="gamepad" className="relative -ml-[2px] h-[56px] w-[56px]" />
        <h3 className="relative m-0 mt-[14px] text-[23px] leading-tight font-black">Tổ chức trò chơi</h3>
        <p className="relative m-0 mt-2 max-w-[230px] text-[14.5px] leading-[1.4] text-white/95">
          Chọn trò chơi, lớp học và bắt đầu trình chiếu ngay!
        </p>
        <div className="relative mt-auto flex items-center justify-between pt-4">
          <CardButton to={startTarget} label="Bắt đầu ngay" className="w-[202px] text-primary-ink hover:text-primary-ink" />
          <Link
            to="/games/new"
            aria-label="Chọn trò chơi khác"
            className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 hover:text-white"
          >
            <ChevronRightIcon size={20} strokeWidth={2.6} />
          </Link>
        </div>
      </article>

      <article className="@container/card relative flex min-h-[243px] flex-col overflow-hidden rounded-[20px] bg-[linear-gradient(160deg,#FEF3CC_0%,#FEE9AE_60%,#FEE39E_100%)] px-[27px] pt-[22px] pb-[22px] text-ink">
        <span aria-hidden="true" className="absolute top-[42px] left-[130px] size-[26px] rounded-full bg-[#FDD99A]/80" />
        <span aria-hidden="true" className="absolute -right-10 -bottom-12 h-36 w-56 rounded-full bg-[#FEDF94]/70" />
        <Art
          name="card-question-art"
          className="absolute top-[60px] right-[18px] hidden h-[116px] w-[104px] @min-[300px]/card:block [mask-image:radial-gradient(closest-side,black_80%,transparent)]"
        />
        <Art name="card-question-icon" className="relative -ml-[4px] h-[69px] w-[69px] rounded-[18px]" />
        <h3 className="relative m-0 mt-[12px] text-[23px] leading-tight font-black">Tạo bộ câu hỏi</h3>
        <p className="relative m-0 mt-2 max-w-[190px] text-[14.5px] leading-[1.4] text-[#3F4B68]">
          Soạn câu hỏi, sử dụng cho nhiều trò chơi khác nhau.
        </p>
        <div className="relative mt-auto pt-4">
          <CardButton onClick={onCreate} label="Tạo ngay" className="w-[149px] text-ink hover:text-ink" />
        </div>
      </article>

      <article className="@container/card relative flex min-h-[243px] flex-col overflow-hidden rounded-[20px] bg-[linear-gradient(160deg,#DAF7E8_0%,#C6F2DA_60%,#B4EFCD_100%)] px-[27px] pt-[22px] pb-[22px] text-ink">
        <span aria-hidden="true" className="absolute top-[30px] right-[140px] size-[26px] rounded-full bg-[#A9E8C4]" />
        <span aria-hidden="true" className="absolute top-[48px] right-[78px] size-[42px] rounded-full bg-[#C9E3FB]" />
        <Art
          name="card-class-art"
          className="absolute right-0 bottom-0 hidden h-[160px] w-[113px] @min-[300px]/card:block [mask-image:linear-gradient(to_bottom,transparent,black_18px)]"
        />
        <Art name="card-class-icon" className="relative -ml-[4px] h-[69px] w-[69px] rounded-[18px]" />
        <h3 className="relative m-0 mt-[12px] text-[23px] leading-tight font-black">Quản lý lớp học</h3>
        <p className="relative m-0 mt-2 max-w-[190px] text-[14.5px] leading-[1.4] text-[#3F4B68]">
          Danh sách học sinh, nhóm, điểm sao và thành tích.
        </p>
        <div className="relative mt-auto pt-4">
          <CardButton onClick={onOpenClass} label="Xem lớp học" className="w-[165px] text-ink hover:text-ink" />
        </div>
      </article>
    </div>
    </div>
  )
}

interface CardButtonProps {
  label: string
  className: string
  to?: string
  onClick?: () => void
}

function CardButton({ label, className, to, onClick }: CardButtonProps) {
  const classes = `flex h-[41px] items-center justify-center gap-2.5 rounded-full bg-white text-[15px] font-extrabold shadow-[0_2px_6px_rgba(31,42,68,0.08)] hover:brightness-[0.97] ${className}`
  const content = (
    <>
      {label}
      <ArrowRightIcon size={17} strokeWidth={2.5} />
    </>
  )
  return to ? (
    <Link to={to} className={classes}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={`cursor-pointer border-0 font-[inherit] ${classes}`}>
      {content}
    </button>
  )
}
