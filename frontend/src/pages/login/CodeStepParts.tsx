import { linkClass } from '@/pages/login/authUi'
import type { Resend } from '@/pages/login/useResend'
import type { CodeSentResponse } from '@/types/api'

/** Pieces of the "type the code from the mail" steps (sign-up, password reset). */

/** "Mã 6 số đã được gửi tới <email>. Mã có hiệu lực trong 10 phút." */
export function CodeSentTo({ sent }: { sent: CodeSentResponse }) {
  return (
    <>
      Mã 6 số đã được gửi tới <b className="font-extrabold text-ink">{sent.email}</b>. Mã có hiệu lực trong{' '}
      {Math.round(sent.expiresIn / 60)} phút.
    </>
  )
}

export function SpamHint() {
  return (
    <p className="mt-3 mb-0 text-[14px] font-semibold text-ink-muted">
      Không thấy email? Cô xem thêm trong mục Thư rác hoặc Quảng cáo.
    </p>
  )
}

/** "Chưa nhận được mã? Gửi lại mã" (or the countdown). */
export function ResendRow({ resend }: { resend: Resend }) {
  return (
    <p className="mt-[clamp(16px,3.2vh,30px)] mb-0 flex flex-wrap items-center justify-center gap-x-2 text-[16px] font-semibold text-ink-muted">
      Chưa nhận được mã?
      {resend.secondsLeft > 0 ? (
        <span>Gửi lại sau {resend.secondsLeft} giây</span>
      ) : (
        <button type="button" onClick={() => void resend.send()} className={linkClass}>
          Gửi lại mã
        </button>
      )}
    </p>
  )
}
