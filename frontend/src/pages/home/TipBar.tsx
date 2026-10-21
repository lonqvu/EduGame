import { Link } from 'react-router'
import { ArrowRightIcon } from '@/components/ui/icons'
import type { HomeTip } from '@/utils/homeTips'

/** "Gợi ý hôm nay": one line at the bottom of the page, with a link to act on it. */
export function TipBar({ tip }: { tip: HomeTip }) {
  return (
    <aside
      aria-label="Gợi ý hôm nay"
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[18px] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(31,42,68,0.04)] sm:flex-nowrap sm:px-5"
    >
      <span aria-hidden="true" className="text-[24px] leading-none">
        💡
      </span>
      <p className="m-0 min-w-0 flex-1 text-[14px] text-[#3F4B68]">
        <strong className="mr-1.5 text-primary-ink">Gợi ý hôm nay:</strong>
        {tip.text}
      </p>
      <Link to={tip.to} className="flex shrink-0 items-center gap-1.5 text-[14px] font-bold text-primary hover:text-primary-ink">
        {tip.link}
        <ArrowRightIcon size={15} strokeWidth={2.4} />
      </Link>
    </aside>
  )
}
