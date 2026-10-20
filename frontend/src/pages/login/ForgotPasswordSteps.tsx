import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { forgotPassword } from '@/api/authApi'
import { ArrowRightIcon, InfoFilledIcon, LockIcon, MailIcon } from '@/components/ui/icons'
import { CodeInput } from '@/pages/login/CodeInput'
import { CodeSentTo, ResendRow, SpamHint } from '@/pages/login/CodeStepParts'
import { AuthCard, Field, FormError, FormNotice, inputClass, primaryButtonClass } from '@/pages/login/authUi'
import { usePasswordToggle } from '@/pages/login/usePasswordToggle'
import { useResend } from '@/pages/login/useResend'
import { useAuthStore } from '@/store/authStore'
import type { CodeSentResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { EMAIL_PATTERN, MIN_PASSWORD, passwordTooLong } from '@/utils/authRules'

/** Step 1: the address to send the code to. */
export function ForgotPasswordForm({ initialEmail, onCodeSent }: {
  initialEmail: string
  onCodeSent: (sent: CodeSentResponse) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: initialEmail } })

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null)
    try {
      onCodeSent(await forgotPassword(email.trim()))
    } catch (e) {
      setError(apiErrorMessage(e))
    }
  })

  return (
    <AuthCard
      compact
      title="Quên mật khẩu"
      subtitle="Nhập email của bạn, chúng tôi sẽ gửi mã để đặt lại mật khẩu."
      back={{ label: 'Quay lại đăng nhập', to: '/login' }}
    >
      <form noValidate onSubmit={onSubmit} className="mt-[clamp(18px,3.4vh,30px)] flex flex-col">
        <Field label="Email" htmlFor="forgot-email" icon={<MailIcon size={22} />} required error={errors.email?.message}>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="Nhập email của bạn"
            aria-invalid={errors.email ? true : undefined}
            {...register('email', { validate: (v) => EMAIL_PATTERN.test(v.trim()) || 'Email chưa đúng định dạng' })}
            className={inputClass}
          />
        </Field>

        <FormError message={error} />

        <button type="submit" disabled={isSubmitting} className={`mt-[clamp(18px,3.4vh,30px)] ${primaryButtonClass}`}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          {!isSubmitting && <ArrowRightIcon size={22} strokeWidth={2.4} />}
        </button>
      </form>

      <div className="mt-[clamp(18px,3.4vh,30px)] flex gap-3.5 rounded-[14px] bg-[#F2F7FF] px-[clamp(16px,2vw,24px)] py-[clamp(14px,2.4vh,22px)] text-[15px] leading-relaxed font-semibold text-ink-soft">
        <InfoFilledIcon size={22} className="mt-0.5 shrink-0 text-primary" />
        <p className="m-0">
          Nếu email của bạn đã đăng ký tài khoản Lớp vui, chúng tôi sẽ gửi mã đặt lại mật khẩu trong vài phút. Vui lòng
          kiểm tra cả hộp thư đến và thư rác.
        </p>
      </div>
    </AuthCard>
  )
}

interface ResetValues {
  newPassword: string
  confirmPassword: string
}

/** Step 2: the code from the mail and the new password. Signs in once it is set. */
export function ResetPasswordStep({ sent, onBack, onDone }: {
  sent: CodeSentResponse
  onBack: () => void
  onDone: () => void
}) {
  const completePasswordReset = useAuthStore((s) => s.completePasswordReset)
  const [passwordType, passwordToggle] = usePasswordToggle()
  const [confirmType, confirmToggle] = usePasswordToggle()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const resend = useResend(sent, () => forgotPassword(sent.email))
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ defaultValues: { newPassword: '', confirmPassword: '' } })

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    setError(null)
    if (code.length !== 6) {
      setCodeError('Vui lòng nhập đủ 6 số trong email')
      return
    }
    try {
      await completePasswordReset(sent.email, code, newPassword)
      onDone()
    } catch (e) {
      setError(apiErrorMessage(e))
      setCode('')
    }
  })

  return (
    <AuthCard compact title="Đặt lại mật khẩu" subtitle={<CodeSentTo sent={sent} />} back={{ label: 'Đổi email', onClick: onBack }}>
      <form noValidate onSubmit={onSubmit} className="mt-[clamp(18px,3.4vh,30px)] flex flex-col">
        <span className="mb-[clamp(6px,1.1vh,10px)] text-[16px] font-extrabold text-[#14213D]">
          Mã xác nhận<span aria-hidden="true" className="ml-1 text-[#E5484D]">*</span>
        </span>
        <CodeInput
          value={code}
          onChange={(value) => {
            setCode(value)
            setCodeError(null)
          }}
          invalid={!!codeError}
          disabled={isSubmitting}
        />
        {codeError ? <span className="mt-2 text-[14px] font-semibold text-danger">{codeError}</span> : <SpamHint />}

        <div className="@container mt-[clamp(14px,2.6vh,24px)]">
          <div className="grid gap-x-4 gap-y-[clamp(10px,1.9vh,18px)] @md:grid-cols-2">
            <Field
              label="Mật khẩu mới"
              htmlFor="reset-password"
              icon={<LockIcon size={22} />}
              required
              error={errors.newPassword?.message}
              trailing={passwordToggle}
            >
              <input
                id="reset-password"
                type={passwordType}
                autoComplete="new-password"
                placeholder={`Ít nhất ${MIN_PASSWORD} ký tự`}
                aria-invalid={errors.newPassword ? true : undefined}
                {...register('newPassword', {
                  required: 'Vui lòng nhập mật khẩu mới',
                  minLength: { value: MIN_PASSWORD, message: `Cần ít nhất ${MIN_PASSWORD} ký tự` },
                  validate: (v) => passwordTooLong(v) || true,
                })}
                className={`${inputClass} pr-14`}
              />
            </Field>
            <Field
              label="Xác nhận mật khẩu"
              htmlFor="reset-confirm"
              icon={<LockIcon size={22} />}
              required
              error={errors.confirmPassword?.message}
              trailing={confirmToggle}
            >
              <input
                id="reset-confirm"
                type={confirmType}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
                aria-invalid={errors.confirmPassword ? true : undefined}
                {...register('confirmPassword', {
                  validate: (v) => (v !== '' && v === getValues('newPassword')) || 'Mật khẩu nhập lại chưa khớp',
                })}
                className={`${inputClass} pr-14`}
              />
            </Field>
          </div>
        </div>

        <FormError message={error ?? resend.error} />
        {!error && <FormNotice message={resend.notice} />}

        <button type="submit" disabled={isSubmitting} className={`mt-[clamp(16px,3vh,28px)] ${primaryButtonClass}`}>
          {isSubmitting ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
          {!isSubmitting && <ArrowRightIcon size={22} strokeWidth={2.4} />}
        </button>
      </form>

      <ResendRow resend={resend} />
    </AuthCard>
  )
}
