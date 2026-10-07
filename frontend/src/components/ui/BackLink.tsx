import { Link } from 'react-router'
import { ChevronLeftIcon } from '@/components/ui/icons'

interface BackLinkProps {
  to: string
  label: string
}

/** White pill link with a left chevron, e.g. "‹ Trang chủ". */
export function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="flex min-h-12 items-center gap-2 self-start rounded-full bg-white py-2.5 pr-5 pl-3.5 font-extrabold text-ink hover:text-primary-ink"
    >
      <ChevronLeftIcon size={22} />
      {label}
    </Link>
  )
}
