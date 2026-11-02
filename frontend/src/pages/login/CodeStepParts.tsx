import { Trans, useTranslation } from 'react-i18next'
import { linkClass } from '@/pages/login/authUi'
import type { Resend } from '@/pages/login/useResend'
import type { CodeSentResponse } from '@/types/api'

/** Pieces of the "type the code from the mail" steps (sign-up, password reset). */

/** "Mã 6 số đã được gửi tới <email>. Mã có hiệu lực trong 10 phút." */
export function CodeSentTo({ sent }: { sent: CodeSentResponse }) {
  return (
    <>
      <Trans
        i18nKey="auth.code.sentTo"
        values={{ email: sent.email, minutes: Math.round(sent.expiresIn / 60) }}
        components={{ b: <b className="font-extrabold text-ink" /> }}
      />
    </>
  )
}

export function SpamHint() {
  const { t } = useTranslation()
  return (
    <p className="mt-3 mb-0 text-[14px] font-semibold text-ink-muted">
      {t('auth.code.spam')}
    </p>
  )
}

/** "Chưa nhận được mã? Gửi lại mã" (or the countdown). */
export function ResendRow({ resend }: { resend: Resend }) {
  const { t } = useTranslation()
  return (
    <p className="mt-[clamp(16px,3.2vh,30px)] mb-0 flex flex-wrap items-center justify-center gap-x-2 text-[16px] font-semibold text-ink-muted">
      {t('auth.code.notReceived')}
      {resend.secondsLeft > 0 ? (
        <span>{t('auth.code.resendIn', { count: resend.secondsLeft })}</span>
      ) : (
        <button type="button" onClick={() => void resend.send()} className={linkClass}>
          {t('auth.code.resend')}
        </button>
      )}
    </p>
  )
}
