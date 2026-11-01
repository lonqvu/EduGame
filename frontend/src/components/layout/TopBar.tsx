import { App, Dropdown } from 'antd'
import { useNavigate } from 'react-router'
import { BellIcon, ChevronDownIcon } from '@/components/ui/icons'
import { useAuthStore } from '@/store/authStore'
import { useTeacherStore } from '@/store/teacherStore'

/** Bell + the teacher's chip: the picture of "Hồ sơ của tôi" and the name, with the account menu. */
export function TopBar() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const teacher = useTeacherStore((s) => s.teacher)
  return (
    <div className="flex h-[48px] items-center justify-end gap-3 pr-1">
      <button
        type="button"
        aria-label="Thông báo"
        onClick={() => message.info('Chưa có thông báo mới.')}
        className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-[#3F4B68] hover:text-primary"
      >
        <BellIcon size={22} />
      </button>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: [
            { key: 'profile', label: 'Hồ sơ của tôi', onClick: () => navigate('/profile') },
            { key: 'logout', label: 'Đăng xuất', onClick: () => void logout() },
          ],
        }}
      >
        <button
          type="button"
          aria-label={`Tài khoản ${teacher?.name ?? ''}`}
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
