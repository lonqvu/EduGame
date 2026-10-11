import { useEffect, useState } from 'react'
import type { CodeSentResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'

export interface Resend {
  /** Seconds before another code can be asked for. */
  secondsLeft: number
  send: () => Promise<void>
  notice: string | null
  error: string | null
}

/** "Gửi lại mã" with its countdown; `request` asks the server for a new code. */
export function useResend(sent: CodeSentResponse, request: () => Promise<CodeSentResponse>): Resend {
  const [resendAt, setResendAt] = useState(() => Date.now() + sent.resendAfter * 1000)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const secondsLeft = useSecondsUntil(resendAt)

  const send = async () => {
    setNotice(null)
    setError(null)
    try {
      const again = await request()
      setResendAt(Date.now() + again.resendAfter * 1000)
      setNotice('Đã gửi mã mới. Mã cũ không dùng được nữa.')
    } catch (e) {
      setError(apiErrorMessage(e))
    }
  }
  return { secondsLeft, send, notice, error }
}

/** Whole seconds until a moment, ticking every second; 0 once it has passed. */
function useSecondsUntil(at: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (at <= Date.now()) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [at])
  return Math.max(0, Math.ceil((at - now) / 1000))
}
