import { App } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { BellIcon, ChevronRightIcon, GlobeIcon, HelpIcon, HomeIcon, SettingsIcon, ShieldIcon, UserIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { EditProfileModal } from '@/pages/profile/EditProfileModal'
import { HelpModal } from '@/pages/profile/HelpModal'
import { ActivityOverview, LogoutButton, ProfileCard, ProfileSection, SettingsList, type SettingRow } from '@/pages/profile/ProfileParts'
import { SecurityModal } from '@/pages/profile/SecurityModal'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'
import { useTeacherStore } from '@/store/teacherStore'

type Dialog = 'edit' | 'security' | 'help' | null

/** /profile — "Hồ sơ của tôi": the teacher's account, what they have done, and its settings. */
export function ProfilePage() {
  const { message, modal } = App.useApp()
  const profile = useProfileStore((s) => s.profile)
  const status = useProfileStore((s) => s.status)
  const load = useProfileStore((s) => s.load)
  const teacher = useTeacherStore((s) => s.teacher)
  const loadTeacher = useTeacherStore((s) => s.load)
  const logout = useAuthStore((s) => s.logout)
  const [dialog, setDialog] = useState<Dialog>(null)

  useEffect(() => {
    void load()
    void loadTeacher()
  }, [load, loadTeacher])

  const soon = (what: string) => () => message.info(`${what} đang được hoàn thiện, cô quay lại sau nhé.`)
  const confirmLogout = () =>
    modal.confirm({
      title: 'Đăng xuất khỏi EduGame?',
      okText: 'Đăng xuất',
      cancelText: 'Ở lại',
      onOk: () => logout(),
    })

  const rows: SettingRow[] = [
    {
      key: 'info',
      icon: <UserIcon size={22} />,
      tint: 'bg-[#E3ECFF] text-primary',
      title: 'Thông tin cá nhân',
      text: 'Họ tên, email, số điện thoại, ảnh đại diện',
      onClick: () => setDialog('edit'),
    },
    {
      key: 'security',
      icon: <ShieldIcon size={22} />,
      tint: 'bg-[#DDF5E8] text-success',
      title: 'Bảo mật tài khoản',
      text: 'Đổi mật khẩu, quản lý phiên đăng nhập',
      onClick: () => setDialog('security'),
    },
    {
      key: 'notifications',
      icon: <BellIcon size={22} />,
      tint: 'bg-[#EDE4FF] text-[#7448D6]',
      title: 'Thông báo',
      text: 'Quản lý các thông báo nhận được',
      soon: true,
      onClick: soon('Cài đặt thông báo'),
    },
    {
      key: 'language',
      icon: <GlobeIcon size={22} />,
      tint: 'bg-[#DDF2F7] text-[#1B7A8C]',
      title: 'Ngôn ngữ & hiển thị',
      text: 'Chọn ngôn ngữ, chế độ hiển thị',
      soon: true,
      onClick: soon('Cài đặt ngôn ngữ và hiển thị'),
    },
    {
      key: 'help',
      icon: <HelpIcon size={22} />,
      tint: 'bg-[#FFE4EA] text-[#D23C6E]',
      title: 'Trợ giúp',
      text: 'Hướng dẫn sử dụng, câu hỏi thường gặp',
      onClick: () => setDialog('help'),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-[min(100%,300px)] flex-1 flex-col">
          <nav aria-label="Đường dẫn" className="flex items-center gap-3 text-[14.5px] text-ink-soft">
            <Link to="/" aria-label="Trang chủ" className="flex text-[#8A93A8] hover:text-primary">
              <HomeIcon size={20} />
            </Link>
            <Link to="/" className="text-ink-soft hover:text-primary">
              Trang chủ
            </Link>
            <ChevronRightIcon size={15} strokeWidth={2.4} />
            <span className="font-semibold text-ink">Hồ sơ của tôi</span>
          </nav>
          <h1 className="m-0 mt-5 text-[32px] leading-[1.1] font-black tracking-[-0.01em] text-[#1A2440]">Hồ sơ của tôi</h1>
          <p className="m-0 mt-2 text-[14.5px] text-[#4A5470]">Quản lý thông tin cá nhân và tài khoản EduGame của bạn.</p>
        </div>
        <div className="order-first ml-auto sm:order-none">
          <TopBar teacherName={teacher?.name ?? ''} initial={teacher?.shortName.charAt(0).toUpperCase() ?? ''} />
        </div>
      </header>

      {status === 'error' && !profile ? (
        <LoadError onRetry={() => void load()} />
      ) : !profile ? (
        <PageLoading />
      ) : (
        <>
          <ProfileCard profile={profile} onEdit={() => setDialog('edit')} />
          <ActivityOverview stats={profile.stats} />
          <ProfileSection icon={<SettingsIcon size={17} />} title="Cài đặt tài khoản">
            <SettingsList rows={rows} />
          </ProfileSection>
          <LogoutButton onClick={confirmLogout} />

          <EditProfileModal open={dialog === 'edit'} profile={profile} onClose={() => setDialog(null)} />
          <SecurityModal open={dialog === 'security'} onClose={() => setDialog(null)} />
          <HelpModal open={dialog === 'help'} onClose={() => setDialog(null)} />
        </>
      )}
    </div>
  )
}
