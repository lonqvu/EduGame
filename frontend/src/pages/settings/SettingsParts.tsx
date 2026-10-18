import { Select, Switch } from 'antd'
import type { ReactNode } from 'react'
import { CheckIcon } from '@/components/ui/icons'

/** One white block of the settings page, reachable by its anchor (/settings#display). */
export function SettingsSection({
  id,
  icon,
  title,
  text,
  highlighted,
  action,
  children,
}: {
  id: string
  icon: ReactNode
  title: string
  text?: string
  /** Just opened from a link: outlined for a moment. */
  highlighted?: boolean
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`flex scroll-mt-5 flex-col gap-1 rounded-[20px] bg-white p-[18px] shadow-[0_1px_2px_rgba(31,42,68,0.04)] sm:p-[22px] ${
        highlighted ? 'animate-[settings-flash_2.4s_ease-out]' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 id={`${id}-title`} className="m-0 flex items-center gap-2.5 text-[18px] leading-none font-black">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</span>
            {title}
          </h2>
          {text && <p className="m-0 text-[13.5px] text-ink-muted sm:pl-[42px]">{text}</p>}
        </div>
        {action}
      </div>
      <ul className="m-0 mt-2 flex list-none flex-col p-0">{children}</ul>
    </section>
  )
}

/** A setting: what it does on the left, its control on the right (below on phones). */
export function SettingItem({ id, label, hint, control }: { id: string; label: string; hint?: ReactNode; control: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line-soft py-3.5 last:border-b-0 last:pb-0">
      <div className="flex min-w-[min(100%,200px)] flex-1 flex-col gap-0.5">
        <span id={id} className="text-[15px] font-bold">
          {label}
        </span>
        {hint && <span className="text-[13.5px] text-ink-muted">{hint}</span>}
      </div>
      <div className="shrink-0">{control}</div>
    </li>
  )
}

export function SettingSwitch({ labelledBy, checked, onChange }: { labelledBy: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <Switch aria-labelledby={labelledBy} checked={checked} onChange={onChange} />
}

export function SettingSelect<T extends string | number>({
  labelledBy,
  value,
  options,
  onChange,
}: {
  labelledBy: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <Select
      aria-labelledby={labelledBy}
      value={value}
      options={options.map((o) => ({ value: o.value, label: o.label }))}
      onChange={onChange}
      className="w-[170px]"
    />
  )
}

/** "Đã lưu" / "Đang lưu…" next to the title: every change saves by itself. */
export function SaveState({ saving }: { saving: boolean }) {
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-ink-soft shadow-[0_1px_2px_rgba(31,42,68,0.06)]">
      {saving ? (
        'Đang lưu…'
      ) : (
        <>
          <span className="flex size-4 items-center justify-center rounded-full bg-success text-white">
            <CheckIcon size={10} strokeWidth={3} />
          </span>
          Đã lưu
        </>
      )}
    </span>
  )
}
