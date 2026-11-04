import { App, Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { BellIcon, ChevronDownIcon, UserIcon } from '@/components/ui/icons'
import { useAuthStore } from '@/store/authStore'
import { useTeacherStore } from '@/store/teacherStore'

/**
 * Language, bell and the teacher's chip: the picture of "Hồ sơ của tôi" and the name, with the account menu. For a
 * visitor, the language, "Đăng ký" and "Đăng nhập" (back to this page afterwards).
 *
 * `compact`: in the white bar of small screens, next to the menu button; the chip shows the picture only, the visitor
 * gets "Đăng nhập" alone ("Đăng ký" is on the sign-in page), and the buttons are grey on the white bar. On phones the
 * language moves into the menu drawer, for room.
 */
export function TopBar({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const teacher = useTeacherStore((s) => s.teacher)
  const signedIn = useAuthStore((s) => s.status === 'signedIn')
  const { pathname, search } = useLocation()

  const chip = compact ? 'bg-surface-soft' : 'bg-white'

  if (!signedIn) {
    return (
      <div className={`flex items-center justify-end ${compact ? 'gap-2' : 'h-[48px] gap-3 pr-1'}`}>
        {compact ? <LanguageSwitch look="icon" className="max-sm:hidden" /> : <LanguageSwitch />}
        {!compact && (
          <Link to="/register" className="ml-1 text-[15px] font-bold text-ink hover:text-primary">
            {t('topBar.signUp')}
          </Link>
        )}
        <Link
          to={`/login?from=${encodeURIComponent(pathname + search)}`}
          className={`flex h-[40px] items-center gap-2 rounded-full bg-primary font-extrabold whitespace-nowrap text-white hover:bg-primary-ink hover:text-white ${
            compact ? 'px-4 text-[14px]' : 'pr-5 pl-4 text-[15px]'
          }`}
        >
          <UserIcon size={compact ? 16 : 18} strokeWidth={2.4} />
          {t('topBar.signIn')}
        </Link>
      </div>
    )
  }
  return (
    <div className={`flex items-center justify-end ${compact ? 'gap-2' : 'h-[48px] gap-2.5 pr-1'}`}>
      {compact ? <LanguageSwitch look="icon" className="max-sm:hidden" /> : <LanguageSwitch />}
      <button
        type="button"
        aria-label={t('topBar.notifications')}
        onClick={() => message.info(t('topBar.noNotifications'))}
        className={`flex size-10 cursor-pointer items-center justify-center rounded-full border-0 ${chip} text-[#3F4B68] hover:text-primary`}
      >
        <BellIcon size={22} />
      </button>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: [
            { key: 'profile', label: t('topBar.profile'), onClick: () => navigate('/profile') },
            { key: 'logout', label: t('topBar.signOut'), onClick: () => void logout() },
          ],
        }}
      >
        <button
          type="button"
          aria-label={t('topBar.account', { name: teacher?.name ?? '' })}
          className={`flex h-10 cursor-pointer items-center gap-2 rounded-full border-0 ${chip} py-1 pl-1 font-[inherit] text-[15px] font-bold text-ink hover:text-primary ${compact ? 'pr-2' : 'pr-3.5'}`}
        >
          {teacher ? (
            <img src={teacher.avatar} alt="" className="size-8 rounded-full bg-[#FFE3D3] object-cover" />
          ) : (
            <span className="size-8 rounded-full bg-surface-soft" />
          )}
          {!compact && teacher?.name}
          <ChevronDownIcon size={16} strokeWidth={2.6} />
        </button>
      </Dropdown>
    </div>
  )
}
