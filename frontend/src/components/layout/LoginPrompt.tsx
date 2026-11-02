import { Modal } from 'antd'
import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { CheckIcon, LockIcon } from '@/components/ui/icons'
import { type LoginFeature, needsLogin, useLoginPromptStore } from '@/store/loginPromptStore'

const loginPath = (target: string) => `/login?from=${encodeURIComponent(target)}`

/** The picture of a feature (the others get the lock alone). */
const ART: Partial<Record<LoginFeature, string>> = {
  questionSets: '/assets/illustrations/thu-vien-cau-hoi.png',
  classes: '/assets/illustrations/chia-nhom.png',
  reports: '/assets/illustrations/thanh-tich.png',
}

/** Features with one line of why under the title (loginPrompt.why.*). */
const WHY = ['questionSets', 'classes', 'reports', 'upload'] as const satisfies readonly LoginFeature[]
const hasWhy = (feature: LoginFeature): feature is (typeof WHY)[number] => (WHY as readonly string[]).includes(feature)

const BENEFITS = ['classes', 'questionSets', 'reports'] as const

const PRIMARY_BUTTON =
  'flex h-12 w-full cursor-pointer items-center justify-center rounded-[14px] border-0 bg-primary px-6 font-[inherit] text-[16px] font-extrabold text-white shadow-[0_4px_0_var(--color-primary-ink)] transition hover:brightness-110 active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-primary-ink)]'
const SECONDARY_BUTTON =
  'flex h-12 w-full cursor-pointer items-center justify-center rounded-[14px] border-2 border-line bg-white px-5 font-[inherit] text-[15.5px] font-bold text-ink transition hover:border-primary hover:text-primary'

/** The feature's picture (or the lock), its name and what an account gives. */
function Pitch({ feature }: { feature: LoginFeature }) {
  const { t } = useTranslation()
  const art = ART[feature]
  return (
    <>
      <div className="relative flex h-[170px] w-full items-end justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-primary-soft via-projector to-sun-pale">
        {art ? (
          <>
            {/* The illustrations are drawn on white: multiply lets the white melt into the background. */}
            <img src={art} alt="" className="h-full w-full object-contain object-bottom px-6 pt-3 mix-blend-multiply" />
            <span className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-white text-primary shadow-[0_3px_10px_rgba(53,99,233,0.2)]">
              <LockIcon size={18} />
            </span>
          </>
        ) : (
          <span className="flex size-20 items-center justify-center rounded-full bg-white text-primary shadow-[0_6px_18px_rgba(53,99,233,0.18)]">
            <LockIcon size={36} />
          </span>
        )}
      </div>
      <span className="mt-5 rounded-full bg-sun-soft px-3 py-1 text-[12.5px] font-extrabold tracking-wide text-sun-ink uppercase">
        {t('loginPrompt.badge')}
      </span>
      <h2 className="m-0 mt-3 font-display text-[24px] leading-tight font-extrabold text-ink">
        <Trans
          i18nKey="loginPrompt.title"
          values={{ feature: t(`loginPrompt.features.${feature}`) }}
          components={{ feature: <span className="text-primary" /> }}
        />
      </h2>
      {hasWhy(feature) && <p className="m-0 mt-1.5 max-w-[380px] text-[15px] leading-[1.5] text-ink-soft">{t(`loginPrompt.why.${feature}`)}</p>}
      <ul className="m-0 mt-4 flex w-full list-none flex-col gap-2 rounded-[16px] bg-surface-soft p-4 text-left">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-center gap-2.5 text-[14.5px] font-semibold text-ink">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E3F6EC] text-success">
              <CheckIcon size={14} strokeWidth={3} />
            </span>
            {t(`loginPrompt.benefits.${benefit}`)}
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * The "Cần đăng nhập" dialog a visitor sees on a page or a feature that needs an account (`needsLogin`). Also turns
 * every link to such a page, anywhere in the app (menu, home cards...), into that dialog instead of leaving the page.
 */
export function LoginPrompt() {
  const { t } = useTranslation()
  const feature = useLoginPromptStore((s) => s.feature)
  const target = useLoginPromptStore((s) => s.target)
  const close = useLoginPromptStore((s) => s.close)
  const navigate = useNavigate()

  useEffect(() => {
    // Capture phase on the document runs before React Router's own click handling on the root.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.origin !== window.location.origin) return
      if (needsLogin(link.pathname + link.search)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  const go = (path: string) => {
    close()
    navigate(path)
  }

  return (
    <Modal open={feature !== null} onCancel={close} footer={null} width={460} centered>
      <div className="flex flex-col items-center pt-7 text-center">
        <Pitch feature={feature ?? 'page'} />
        <div className="mt-5 flex w-full flex-col gap-2.5">
          <button type="button" className={PRIMARY_BUTTON} onClick={() => go(loginPath(target))}>
            {t('loginPrompt.signIn')}
          </button>
          <button type="button" className={SECONDARY_BUTTON} onClick={() => go('/register')}>
            {t('loginPrompt.signUp')}
          </button>
        </div>
        <button
          type="button"
          onClick={close}
          className="mt-3 cursor-pointer border-0 bg-transparent p-1 font-[inherit] text-[14px] font-semibold text-ink-muted underline-offset-4 hover:text-primary hover:underline"
        >
          {t('loginPrompt.later')}
        </button>
      </div>
    </Modal>
  )
}

/** In place of a page that needs an account, opened directly (typed address, bookmark) by a visitor. */
export function LoginRequiredPage({ feature }: { feature: LoginFeature }) {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-[460px] flex-col items-center rounded-[24px] bg-white p-6 text-center shadow-[0_8px_30px_rgba(31,42,68,0.08)]">
        <Pitch feature={feature} />
        <div className="mt-5 flex w-full flex-col gap-2.5">
          <button type="button" className={PRIMARY_BUTTON} onClick={() => navigate(loginPath(pathname + search))}>
            {t('loginPrompt.signIn')}
          </button>
          <button type="button" className={SECONDARY_BUTTON} onClick={() => navigate('/games/new')}>
            {t('loginPrompt.tryWithout')}
          </button>
        </div>
      </div>
    </div>
  )
}
