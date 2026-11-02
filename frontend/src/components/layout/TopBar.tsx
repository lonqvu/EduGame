import { App, Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { BellIcon, ChevronDownIcon, UserIcon } from '@/components/ui/icons'
import { useAuthStore } from '@/store/authStore'
import { useTeacherStore } from '@/store/teacherStore'

/**
 * Bell + the teacher's chip: the picture of "Hồ sơ của tôi" and the name, with the account menu. For a visitor,
 * "Đăng ký" and "Đăng nhập" (back to this page afterwards).
 */
export function TopBar() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const teacher = useTeacherStore((s) => s.teacher)
  const signedIn = useAuthStore((s) => s.status === 'signedIn')
  const { pathname, search } = useLocation()

  if (!signedIn) {
    return (
      <div className="flex h-[48px] items-center justify-end gap-4 pr-1">
        <Link to="/register" className="text-[15px] font-bold text-ink hover:text-primary">
          {t('topBar.signUp')}
        </Link>
        <Link
          to={`/login?from=${encodeURIComponent(pathname + search)}`}
          className="flex h-[40px] items-center gap-2 rounded-full bg-primary pr-5 pl-4 text-[15px] font-extrabold text-white hover:bg-primary-ink hover:text-white"
        >
          <UserIcon size={18} strokeWidth={2.4} />
          {t('topBar.signIn')}
        </Link>
      </div>
    )
  }
  return (
    <div className="flex h-[48px] items-center justify-end gap-3 pr-1">
      <button
        type="button"
        aria-label={t('topBar.notifications')}
        onClick={() => message.info(t('topBar.noNotifications'))}
        className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-[#3F4B68] hover:text-primary"
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
          className="flex h-10 cursor-pointer items-center gap-2 rounded-full border-0 bg-white py-1 pr-3.5 pl-1 font-[inherit] text-[15px] font-bold text-ink hover:text-primary"
        >
          {teacher ? (
            <img src={teacher.avatar} alt="" className="size-8 rounded-full bg-[#FFE3D3] object-cover" />
          ) : (
            <span className="size-8 rounded-full bg-surface-soft" />
          )}
          {teacher?.name}
          <ChevronDownIcon size={16} strokeWidth={2.6} />
        </button>
      </Dropdown>
    </div>
  )
}
