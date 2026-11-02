import { App } from 'antd'
import { useState, type MouseEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  return (
    <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-muted">
      {t('auth.register.haveAccount')}
      <Link to="/login" className={`${linkClass} flex items-center gap-1 text-[14px]`}>
        {t('auth.register.signIn')}
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
  const { t } = useTranslation()
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
    message.info(t('auth.documentSoon', { name }))
  }

  return (
    <AuthCard compact title={t('auth.register.title')} subtitle={t('auth.register.subtitle')} headerAction={<SignInLink />}>
      <form noValidate onSubmit={onSubmit} className="@container mt-[clamp(14px,2.8vh,26px)] flex flex-col">
        <Field label={t('auth.register.name')} htmlFor="signup-name" icon={<UserIcon size={22} />} required error={errors.displayName?.message}>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder={t('auth.register.namePlaceholder')}
            aria-invalid={errors.displayName ? true : undefined}
            {...register('displayName', {
              validate: (v) => v.trim() !== '' || t('auth.register.nameRequired'),
              maxLength: { value: 100, message: t('auth.register.nameTooLong') },
            })}
            className={inputClass}
          />
        </Field>

        <Field label={t('auth.email')} htmlFor="signup-email" icon={<MailIcon size={22} />} required error={errors.email?.message} className={fieldGap}>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            aria-invalid={errors.email ? true : undefined}
            {...register('email', { validate: (v) => EMAIL_PATTERN.test(v.trim()) || t('auth.emailInvalid') })}
            className={inputClass}
          />
        </Field>

        <div className={`grid gap-x-4 gap-y-[clamp(10px,1.9vh,18px)] @md:grid-cols-2 ${fieldGap}`}>
          <Field
            label={t('auth.password')}
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
              placeholder={t('auth.passwordMin', { count: MIN_PASSWORD })}
              aria-invalid={errors.password ? true : undefined}
              {...register('password', {
                required: t('auth.register.passwordRequired'),
                minLength: { value: MIN_PASSWORD, message: t('auth.passwordTooShort', { count: MIN_PASSWORD }) },
                validate: (v) => passwordTooLong(v) || true,
              })}
              className={`${inputClass} pr-14`}
            />
          </Field>
          <Field
            label={t('auth.confirmPassword')}
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
              placeholder={t('auth.confirmPlaceholder')}
              aria-invalid={errors.confirmPassword ? true : undefined}
              {...register('confirmPassword', {
                validate: (v) => (v !== '' && v === getValues('password')) || t('auth.passwordMismatch'),
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
                {...register('acceptTerms', { validate: (v) => v || t('auth.register.termsRequired') })}
                className="peer sr-only"
              />
            }
          >
            <span className="text-[15px]">
              <Trans
                i18nKey="auth.register.terms"
                components={{
                  terms: <a href="#" onClick={openDocument(t('auth.register.termsName'))} className="font-bold text-primary hover:text-primary-ink" />,
                  privacy: <a href="#" onClick={openDocument(t('auth.register.privacyName'))} className="font-bold text-primary hover:text-primary-ink" />,
                }}
              />
            </span>
          </Checkbox>
          {errors.acceptTerms && (
            <span className="mt-1.5 block text-[14px] font-semibold text-danger">{errors.acceptTerms.message}</span>
          )}
        </div>

        <FormError message={error} />

        <button type="submit" disabled={isSubmitting} className={`mt-[clamp(14px,2.6vh,24px)] ${primaryButtonClass}`}>
          {isSubmitting ? t('auth.register.submitting') : t('auth.register.submit')}
          {!isSubmitting && <ArrowRightIcon size={22} strokeWidth={2.4} />}
        </button>
      </form>

      <SocialLogin action="register" />
    </AuthCard>
  )
}

/** Step 2: the 6 digits from the mail. The right code creates the account and signs the teacher in. */
export function VerifyEmailStep({ sent, onBack, onSignedIn }: {
  sent: CodeSentResponse
  onBack: () => void
  onSignedIn: () => void
}) {
  const { t } = useTranslation()
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
      title={t('auth.register.verifyTitle')}
      subtitle={<CodeSentTo sent={sent} />}
      headerAction={<SignInLink />}
      back={{ label: t('auth.code.changeEmail'), onClick: onBack }}
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
          {submitting ? t('auth.register.verifying') : t('auth.register.verify')}
          {!submitting && <ArrowRightIcon size={22} strokeWidth={2.4} />}
        </button>
      </form>

      <ResendRow resend={resend} />
    </AuthCard>
  )
}
