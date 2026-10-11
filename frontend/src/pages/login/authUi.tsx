import { App } from 'antd'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { ArrowLeftIcon, CheckIcon, HelpIcon } from '@/components/ui/icons'
import { AuthShowcase, type ShowcaseContent } from '@/pages/login/AuthShowcase'

/** Shared look of the sign-in, sign-up and forgotten-password pages. */

export const inputClass =
  'h-[clamp(46px,6vh,56px)] w-full rounded-[10px] border border-line bg-white pr-4 pl-[60px] font-[inherit] text-[16px] font-semibold text-ink outline-none transition-colors placeholder:font-medium placeholder:text-[#8A94AD] focus:border-primary focus:shadow-[0_0_0_3px_rgba(53,99,233,0.12)] aria-invalid:border-danger'

export const linkClass =
  'cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[16px] font-extrabold text-primary hover:text-primary-ink'

export const primaryButtonClass =
  'flex h-[clamp(48px,6.2vh,58px)] w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border-0 bg-primary font-[inherit] text-[19px] font-extrabold text-white shadow-[0_6px_16px_rgba(53,99,233,0.28)] transition-colors hover:bg-primary-ink disabled:cursor-wait disabled:opacity-75'

interface AuthLayoutProps {
  showcase: ShowcaseContent
  /** "Cần trợ giúp?" above the card (sign-in page). */
  showHelp?: boolean
  children: ReactNode
}

/** Illustration on the left (wide screens), the card on the right. */
export function AuthLayout({ showcase, showHelp = false, children }: AuthLayoutProps) {
  const { message } = App.useApp()
  return (
    <div className="flex min-h-dvh bg-[#F3F9FE]">
      <AuthShowcase content={showcase} />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(ellipse_340px_220px_at_100%_8%,#E6F1FC_0%,transparent_70%),radial-gradient(ellipse_420px_260px_at_96%_100%,#E6F1FC_0%,transparent_70%),radial-gradient(ellipse_280px_200px_at_0%_96%,#EAF4FD_0%,transparent_70%)] px-4 pt-[clamp(12px,3vh,40px)] pb-[clamp(12px,2.4vh,32px)] sm:px-8">
        {showHelp && (
          <div className="flex justify-end xl:pr-[clamp(0px,1.5vw,40px)]">
            <button
              type="button"
              onClick={() => message.info('Cần hỗ trợ, cô liên hệ quản trị viên của trường nhé.')}
              className="flex cursor-pointer items-center gap-3 border-0 bg-transparent p-1 font-[inherit] text-[16px] font-bold text-[#2B4A8B] hover:text-primary"
            >
              <HelpIcon size={30} className="text-primary" />
              Cần trợ giúp?
            </button>
          </div>
        )}
        <div className="flex flex-1 items-center justify-center py-[clamp(8px,1.6vh,24px)]">{children}</div>
      </main>
    </div>
  )
}

interface AuthCardProps {
  title: string
  subtitle: ReactNode
  /** Smaller title and spacing, for longer forms (sign-up, forgotten password). */
  compact?: boolean
  /** Next to the logo, right aligned ("Bạn đã có tài khoản? Đăng nhập"). */
  headerAction?: ReactNode
  /** Under the logo ("← Quay lại đăng nhập"). */
  back?: { label: string; to?: string; onClick?: () => void }
  children: ReactNode
}

/** The white card: logo, title, subtitle, then the form. */
export function AuthCard({ title, subtitle, compact = false, headerAction, back, children }: AuthCardProps) {
  const backClass = 'mt-3 flex w-fit items-center gap-2 text-[15px] font-bold text-primary hover:text-primary-ink'
  return (
    <div
      className={`w-full rounded-[28px] bg-white px-[clamp(22px,3vw,38px)] shadow-[0_12px_48px_rgba(53,99,233,0.08)] ${
        compact ? 'max-w-[620px] pt-[clamp(20px,3.2vh,32px)] pb-[clamp(20px,3.6vh,34px)]' : 'max-w-[580px] pt-[clamp(20px,3.6vh,34px)] pb-[clamp(20px,4.2vh,40px)]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <BrandLogo size={40} />
        {headerAction}
      </div>
      {back &&
        (back.to ? (
          <Link to={back.to} className={backClass}>
            <ArrowLeftIcon size={18} strokeWidth={2.4} />
            {back.label}
          </Link>
        ) : (
          <button type="button" onClick={back.onClick} className={`${backClass} cursor-pointer border-0 bg-transparent p-0 font-[inherit]`}>
            <ArrowLeftIcon size={18} strokeWidth={2.4} />
            {back.label}
          </button>
        ))}
      <h1
        className={`mb-0 leading-tight font-black tracking-[-0.01em] text-[#14213D] ${
          compact ? 'mt-[clamp(10px,2.2vh,20px)] text-[clamp(28px,2.2vw,36px)]' : 'mt-[clamp(12px,2.8vh,26px)] text-[clamp(34px,2.6vw,44px)]'
        }`}
      >
        {title}
      </h1>
      <p className={`mt-2 mb-0 font-semibold text-ink-muted ${compact ? 'text-[16px]' : 'text-[18px]'}`}>{subtitle}</p>
      {children}
    </div>
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  icon: ReactNode
  /** Red asterisk after the label. */
  required?: boolean
  error?: string
  /** Shown under the input when there is no error. */
  hint?: string
  trailing?: ReactNode
  className?: string
  children: ReactNode
}

/** Label, input with a leading icon (and an optional button at the end), error or hint. */
export function Field({ label, htmlFor, icon, required, error, hint, trailing, className = '', children }: FieldProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-[clamp(6px,1.1vh,10px)] ${className}`}>
      <label htmlFor={htmlFor} className="text-[16px] font-extrabold text-[#14213D]">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-[#E5484D]">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-[22px] flex -translate-y-1/2 text-ink-soft">{icon}</span>
        {children}
        {trailing}
      </div>
      {error ? (
        <span className="text-[14px] font-semibold text-danger">{error}</span>
      ) : (
        hint && <span className="text-[14px] font-semibold text-ink-muted">{hint}</span>
      )}
    </div>
  )
}

/** Blue square checkbox; the real input stays for keyboard and screen readers. */
export function Checkbox({ checked, input, children }: { checked: boolean; input: ReactNode; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[16px] font-semibold text-ink select-none">
      {input}
      <span
        aria-hidden="true"
        className="flex size-[22px] shrink-0 items-center justify-center rounded-[5px] border-2 border-line-strong bg-white text-white transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      >
        {checked && <CheckIcon size={15} strokeWidth={3} />}
      </span>
      <span>{children}</span>
    </label>
  )
}

/** Red box above the submit button. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-4 mb-0 rounded-[10px] bg-[#FDECE7] px-4 py-3 text-[15px] font-semibold text-danger">
      {message}
    </p>
  )
}

/** Green box: something worked (a new code was sent...). */
export function FormNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="status" className="mt-4 mb-0 rounded-[10px] bg-[#E6F6EE] px-4 py-3 text-[15px] font-semibold text-success">
      {message}
    </p>
  )
}
