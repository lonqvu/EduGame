import { useState, type ReactNode } from 'react'
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons'

/** Eye button at the end of a password field; returns the input type to use and the button. */
export function usePasswordToggle(): [type: 'text' | 'password', button: ReactNode] {
  const [visible, setVisible] = useState(false)
  const button = (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      aria-pressed={visible}
      className="absolute top-1/2 right-2.5 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-ink-soft hover:bg-surface-soft"
    >
      {visible ? <EyeOffIcon size={22} /> : <EyeIcon size={22} />}
    </button>
  )
  return [visible ? 'text' : 'password', button]
}
