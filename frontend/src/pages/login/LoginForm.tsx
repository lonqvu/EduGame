import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { ArrowRightIcon, LockIcon, MailIcon } from '@/components/ui/icons'
import { AuthCard, Checkbox, Field, FormError, inputClass, linkClass, primaryButtonClass } from '@/pages/login/authUi'
import { SocialLogin } from '@/pages/login/SocialLogin'
import { usePasswordToggle } from '@/pages/login/usePasswordToggle'
import { useAuthStore } from '@/store/authStore'
import { apiErrorMessage } from '@/utils/apiError'

interface LoginValues {
  username: string
  password: string
  remember: boolean
}

/** The white sign-in card. */
export function LoginForm({ onSignedIn }: { onSignedIn: () => void }) {
  const login = useAuthStore((s) => s.login)
  const [passwordType, passwordToggle] = usePasswordToggle()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ defaultValues: { username: '', password: '', remember: true } })
  const remember = useWatch({ control, name: 'remember' })

  const onSubmit = handleSubmit(async ({ username, password, remember }) => {
    setError(null)
    try {
      await login(username, password, remember)
      onSignedIn()
    } catch (e) {
      setError(apiErrorMessage(e))
    }
  })

  return (
    <AuthCard title="Đăng nhập" subtitle="Chào mừng bạn quay trở lại Lớp Vui!">
      <form noValidate onSubmit={onSubmit} className="mt-[clamp(16px,3.6vh,34px)] flex flex-col">
        <Field label="Email" htmlFor="login-username" icon={<MailIcon size={22} />} error={errors.username?.message}>
          <input
            id="login-username"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoFocus
            placeholder="Nhập email của bạn"
            aria-invalid={errors.username ? true : undefined}
            {...register('username', { validate: (v) => v.trim() !== '' || 'Vui lòng nhập email' })}
            className={inputClass}
          />
        </Field>

        <Field
          label="Mật khẩu"
          htmlFor="login-password"
          icon={<LockIcon size={22} />}
          error={errors.password?.message}
          className="mt-[clamp(12px,2.3vh,22px)]"
          trailing={passwordToggle}
        >
          <input
            id="login-password"
            type={passwordType}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            aria-invalid={errors.password ? true : undefined}
            {...register('password', { required: 'Vui lòng nhập mật khẩu' })}
            className={`${inputClass} pr-14`}
          />
        </Field>

        <div className="mt-[clamp(12px,2.3vh,22px)] flex items-center justify-between gap-3">
          <Checkbox checked={remember} input={<input type="checkbox" {...register('remember')} className="peer sr-only" />}>
            Ghi nhớ đăng nhập
          </Checkbox>
          <Link to="/forgot-password" className={linkClass}>
            Quên mật khẩu?
          </Link>
        </div>

        <FormError message={error} />

        <button type="submit" disabled={isSubmitting} className={`mt-[clamp(14px,2.6vh,24px)] ${primaryButtonClass}`}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          {!isSubmitting && <ArrowRightIcon size={22} strokeWidth={2.4} />}
        </button>
      </form>

      <SocialLogin label="Hoặc đăng nhập bằng" action="Đăng nhập" />

      <p className="mt-[clamp(14px,3.6vh,36px)] mb-0 flex flex-wrap items-center justify-center gap-x-2 text-[16px] font-semibold text-ink-muted">
        Chưa có tài khoản?
        <Link to="/register" className={`${linkClass} flex items-center gap-2`}>
          Đăng ký ngay
          <ArrowRightIcon size={18} strokeWidth={2.4} />
        </Link>
      </p>
    </AuthCard>
  )
}
