import { App } from 'antd'
import { useState, type MouseEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { register as registerRequest, resendCode } from '@/api/authApi'
import { ArrowRightIcon, LockIcon, MailIcon, UserIcon } from '@/components/ui/icons'
import { CodeInput } from '@/pages/login/CodeInput'
import { CodeSentTo, ResendRow, SpamHint } from '@/pages/login/CodeStepParts'
import {
  AuthCard,
  Checkbox,
  Field,
  FormError,
  FormNotice,
  inputClass,
  linkClass,
  primaryButtonClass,
} from '@/pages/login/authUi'
import { SocialLogin } from '@/pages/login/SocialLogin'
import { usePasswordToggle } from '@/pages/login/usePasswordToggle'
import { useResend } from '@/pages/login/useResend'
import { useAuthStore } from '@/store/authStore'
import type { CodeSentResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { EMAIL_PATTERN, MIN_PASSWORD, passwordTooLong } from '@/utils/authRules'

export interface SignUpValues {
  displayName: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

const fieldGap = 'mt-[clamp(10px,1.9vh,18px)]'

/** "Bạn đã có tài khoản? Đăng nhập →", top right of the sign-up cards. */
function SignInLink() {
  return (
    <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted">
      Bạn đã có tài khoản?
      <Link to="/login" className={`${linkClass} flex items-center gap-1 text-[14px]`}>
        Đăng nhập
        <ArrowRightIcon size={16} strokeWidth={2.4} />
      </Link>
    </span>
  )
}

/** Step 1: name, email, password twice, terms. Mails the code. */
export function SignUpForm({ initial, onCodeSent }: {
  initial: SignUpValues
  onCodeSent: (values: SignUpValues, sent: CodeSentResponse) => void
}) {
  const { message } = App.useApp()
  const [passwordType, passwordToggle] = usePasswordToggle()
  const [confirmType, confirmToggle] = usePasswordToggle()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ defaultValues: initial })
  const acceptTerms = useWatch({ control, name: 'acceptTerms' })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      const sent = await registerRequest({
        email: values.email.trim(),
        displayName: values.displayName.trim(),
        password: values.password,
      })
      onCodeSent(values, sent)
    } catch (e) {
      setError(apiErrorMessage(e))
    }
  })

  const openDocument = (name: string) => (e: MouseEvent) => {
    e.preventDefault()
    message.info(`Trang “${name}” đang được hoàn thiện.`)
  }

  return (
    <AuthCard compact title="Đăng ký tài khoản" subtitle="Bắt đầu hành trình đồng hành cùng EduGame!" headerAction={<SignInLink />}>
      <form noValidate onSubmit={onSubmit} className="@container mt-[clamp(14px,2.8vh,26px)] flex flex-col">
        <Field label="Họ và tên" htmlFor="signup-name" icon={<UserIcon size={22} />} required error={errors.displayName?.message}>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Nhập họ và tên của bạn"
            aria-invalid={errors.displayName ? true : undefined}
            {...register('displayName', {
              validate: (v) => v.trim() !== '' || 'Vui lòng nhập họ và tên',
              maxLength: { value: 100, message: 'Tối đa 100 ký tự' },
            })}
            className={inputClass}
          />
        </Field>

        <Field label="Email" htmlFor="signup-email" icon={<MailIcon size={22} />} required error={errors.email?.message} className={fieldGap}>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="Nhập email của bạn"
            aria-invalid={errors.email ? true : undefined}
            {...register('email', { validate: (v) => EMAIL_PATTERN.test(v.trim()) || 'Email chưa đúng định dạng' })}
            className={inputClass}
          />
        </Field>

        <div className={`grid gap-x-4 gap-y-[clamp(10px,1.9vh,18px)] @md:grid-cols-2 ${fieldGap}`}>
          <Field
            label="Mật khẩu"
            htmlFor="signup-password"
            icon={<LockIcon size={22} />}
            required
            error={errors.password?.message}
            trailing={passwordToggle}
          >
            <input
              id="signup-password"
              type={passwordType}
              autoComplete="new-password"
              placeholder={`Ít nhất ${MIN_PASSWORD} ký tự`}
              aria-invalid={errors.password ? true : undefined}
              {...register('password', {
                required: 'Vui lòng tạo mật khẩu',
                minLength: { value: MIN_PASSWORD, message: `Cần ít nhất ${MIN_PASSWORD} ký tự` },
                validate: (v) => passwordTooLong(v) || true,
              })}
              className={`${inputClass} pr-14`}
            />
          </Field>
          <Field
            label="Xác nhận mật khẩu"
            htmlFor="signup-confirm"
            icon={<LockIcon size={22} />}
            required
            error={errors.confirmPassword?.message}
            trailing={confirmToggle}
          >
            <input
              id="signup-confirm"
              type={confirmType}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              aria-invalid={errors.confirmPassword ? true : undefined}
              {...register('confirmPassword', {
                validate: (v) => (v !== '' && v === getValues('password')) || 'Mật khẩu nhập lại chưa khớp',
              })}
              className={`${inputClass} pr-14`}
            />
          </Field>
        </div>

        <div className={fieldGap}>
          <Checkbox
            checked={acceptTerms}
            input={
              <input
                type="checkbox"
                aria-invalid={errors.acceptTerms ? true : undefined}
                {...register('acceptTerms', { validate: (v) => v || 'Cô cần đồng ý với điều khoản để tiếp tục' })}
                className="peer sr-only"
              />
            }
          >
            <span className="text-[15px]">
              Tôi đồng ý với{' '}
              <a href="#" onClick={openDocument('Điều khoản sử dụng')} className="font-bold text-primary hover:text-primary-ink">
                Điều khoản sử dụng
              </a>{' '}
              và{' '}
              <a href="#" onClick={openDocument('Chính sách bảo mật')} className="font-bold text-primary hover:text-primary-ink">
                Chính sách bảo mật
              </a>{' '}
              của EduGame
            </span>
          </Checkbox>
          {errors.acceptTerms && (
            <span className="mt-1.5 block text-[14px] font-semibold text-danger">{errors.acceptTerms.message}</span>
          )}
        </div>

        <FormError message={error} />

        <button type="submit" disabled={isSubmitting} className={`mt-[clamp(14px,2.6vh,24px)] ${primaryButtonClass}`}>
          {isSubmitting ? 'Đang gửi mã...' : 'Đăng ký'}
          {!isSubmitting && <ArrowRightIcon size={22} strokeWidth={2.4} />}
        </button>
      </form>

      <SocialLogin label="Hoặc đăng ký bằng" action="Đăng ký" />
    </AuthCard>
  )
}

/** Step 2: the 6 digits from the mail. The right code creates the account and signs the teacher in. */
export function VerifyEmailStep({ sent, onBack, onSignedIn }: {
  sent: CodeSentResponse
  onBack: () => void
  onSignedIn: () => void
}) {
  const completeSignUp = useAuthStore((s) => s.completeSignUp)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const resend = useResend(sent, () => resendCode(sent.email))

  const submit = async (value: string) => {
    if (value.length !== 6 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await completeSignUp(sent.email, value)
      onSignedIn()
    } catch (e) {
      setError(apiErrorMessage(e))
      setCode('')
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      compact
      title="Xác nhận email"
      subtitle={<CodeSentTo sent={sent} />}
      headerAction={<SignInLink />}
      back={{ label: 'Đổi email', onClick: onBack }}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit(code)
        }}
        className="mt-[clamp(20px,4vh,34px)] flex flex-col"
      >
        <CodeInput value={code} onChange={setCode} onComplete={(c) => void submit(c)} invalid={!!error} disabled={submitting} />
        <SpamHint />

        <FormError message={error ?? resend.error} />
        {!error && <FormNotice message={resend.notice} />}

        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className={`mt-[clamp(16px,3vh,28px)] ${primaryButtonClass} disabled:cursor-not-allowed`}
        >
          {submitting ? 'Đang xác nhận...' : 'Xác nhận'}
          {!submitting && <ArrowRightIcon size={22} strokeWidth={2.4} />}
        </button>
      </form>

      <ResendRow resend={resend} />
    </AuthCard>
  )
}
