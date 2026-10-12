import type { ReactNode } from 'react'
import { PlusIcon } from '@/components/ui/icons'

/** Delete / next buttons at the bottom of an item form. */
export function FormFooter({ deleteLabel, nextLabel, onDelete, onNext }: { deleteLabel: string; nextLabel: string; onDelete: () => void; onNext: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-line-soft pt-1.5">
      <button
        type="button"
        onClick={onDelete}
        className="min-h-12 cursor-pointer border-0 bg-transparent px-2 font-[inherit] font-bold text-danger hover:underline"
      >
        {deleteLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        className="min-h-[52px] cursor-pointer rounded-full border-0 bg-sun px-7 py-3 font-[inherit] font-extrabold text-ink hover:brightness-95"
      >
        {nextLabel}
      </button>
    </div>
  )
}

/** Dashed "add one more" button of a list in a form. */
export function AddRowButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 cursor-pointer items-center gap-2 self-start rounded-full border-2 border-dashed border-[#A9BDEB] bg-[#F5F8FF] px-5 font-[inherit] font-extrabold text-primary-ink hover:border-primary"
    >
      <PlusIcon size={20} />
      {children}
    </button>
  )
}

/** Orange note under a form: what is still missing before the item can be played. */
export function MissingNote({ children }: { children: ReactNode }) {
  return <span className="text-base font-bold text-[#9A4A00]">{children}</span>
}

export const formClass = 'flex flex-col gap-[22px] rounded-[28px] bg-white p-5 sm:p-7'
