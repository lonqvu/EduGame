import { App } from 'antd'
import type { ReactNode } from 'react'

/** "Hoặc đăng nhập bằng" + Google / Microsoft (not available yet). */
export function SocialLogin({ label, action }: { label: string; action: string }) {
  const { message } = App.useApp()
  const soon = (provider: string) => () => message.info(`${action} bằng ${provider} đang được hoàn thiện.`)
  return (
    <>
      <div className="mt-[clamp(16px,3.2vh,30px)] flex items-center gap-4 text-[15px] font-semibold text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        {label}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="mt-[clamp(12px,2.3vh,22px)] grid grid-cols-2 gap-3.5">
        <SocialButton label="Google" icon={<GoogleLogo />} onClick={soon('Google')} />
        <SocialButton label="Microsoft" icon={<MicrosoftLogo />} onClick={soon('Microsoft')} />
      </div>
    </>
  )
}

function SocialButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[clamp(46px,6vh,58px)] cursor-pointer items-center justify-center gap-3.5 rounded-[10px] border border-line bg-white font-[inherit] text-[16px] font-bold text-ink transition-colors hover:border-line-strong hover:bg-surface-soft"
    >
      {icon}
      {label}
    </button>
  )
}

const GoogleLogo = () => (
  <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)

const MicrosoftLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#F35325" d="M1 1h10.5v10.5H1z" />
    <path fill="#81BC06" d="M12.5 1H23v10.5H12.5z" />
    <path fill="#05A6F0" d="M1 12.5h10.5V23H1z" />
    <path fill="#FFBA08" d="M12.5 12.5H23V23H12.5z" />
  </svg>
)
