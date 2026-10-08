import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@/components/ui/icons'
import { HOME_ASSETS } from '@/pages/home/homeAssets'

/** White rounded block of the home page. */
export function Panel({ className = '', children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-[20px] bg-white shadow-[0_1px_2px_rgba(31,42,68,0.04)] ${className}`}>{children}</section>
}

interface PanelHeaderProps {
  icon: ReactNode
  title: string
  /** Right side: a link-like action, a select... */
  action?: ReactNode
}

export function PanelHeader({ icon, title, action }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="m-0 flex min-w-0 items-center gap-2.5 text-[19px] leading-none font-black whitespace-nowrap">
        <span className="flex shrink-0 items-center">{icon}</span>
        {title}
      </h2>
      {action}
    </div>
  )
}

/** Blue "Xem tất cả →" style action. */
export function TextAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-[inherit] text-[14px] font-bold text-primary hover:text-primary-ink"
    >
      {label}
      <ArrowRightIcon size={17} strokeWidth={2.4} />
    </button>
  )
}

/** Small cropped illustration (decorative). */
export const Art = ({ name, className = '', size }: { name: string; className?: string; size?: number }) => (
  <img src={`${HOME_ASSETS}/${name}.png`} alt="" width={size} height={size} draggable={false} className={`block select-none ${className}`} />
)

const SUBJECT_STYLES: { match: RegExp; className: string }[] = [
  { match: /toán/i, className: 'bg-[#DCE8FD] text-[#2F5FD8]' },
  { match: /tiếng việt|văn/i, className: 'bg-[#FFE6EF] text-[#D23C6E]' },
  { match: /khoa học|tự nhiên|xã hội/i, className: 'bg-[#D9F3EA] text-[#1C7F55]' },
  { match: /anh|english/i, className: 'bg-[#FFEBD6] text-[#B25B0A]' },
]

/** Colored chip of a subject ("Toán", "Tiếng Việt"...); "Tổng hợp" when the game has none. */
export function SubjectTag({ subject }: { subject?: string }) {
  const label = subject?.trim() || 'Tổng hợp'
  const style = SUBJECT_STYLES.find((s) => s.match.test(label))?.className ?? 'bg-[#EDE4FF] text-[#7448D6]'
  return <span className={`shrink-0 rounded-[7px] px-2.5 py-[3px] text-[12.5px] leading-[1.35] font-bold ${style}`}>{label}</span>
}
