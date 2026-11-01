import { App } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { BellIcon, GlobeIcon, HelpIcon, SettingsIcon, ShieldIcon, UserIcon } from '@/components/ui/icons'
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
  const { modal } = App.useApp()
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.profile)
  const status = useProfileStore((s) => s.status)
  const load = useProfileStore((s) => s.load)
  const loadTeacher = useTeacherStore((s) => s.load)
  const logout = useAuthStore((s) => s.logout)
  const [dialog, setDialog] = useState<Dialog>(null)

  useEffect(() => {
    void load()
    void loadTeacher()
  }, [load, loadTeacher])

  const confirmLogout = () =>
    modal.confirm({
      title: 'Đăng xuất khỏi Lớp Vui?',
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
      text: 'Email khi đăng nhập trên thiết bị mới, khi đổi mật khẩu',
      onClick: () => navigate('/settings#notifications'),
    },
    {
      key: 'language',
      icon: <GlobeIcon size={22} />,
      tint: 'bg-[#DDF2F7] text-[#1B7A8C]',
      title: 'Ngôn ngữ & hiển thị',
      text: 'Hiệu ứng chuyển động, toàn màn hình khi trình chiếu',
      onClick: () => navigate('/settings#display'),
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
      <PageHeader title="Hồ sơ của tôi" text="Quản lý thông tin cá nhân và tài khoản Lớp Vui của bạn." />

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
