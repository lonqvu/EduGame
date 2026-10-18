import { App, Dropdown } from 'antd'
import { useNavigate } from 'react-router'
import { BellIcon, ChevronDownIcon } from '@/components/ui/icons'
import { useAuthStore } from '@/store/authStore'

/** Bell + the teacher's chip. */
export function TopBar({ teacherName, initial }: { teacherName: string; initial: string }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  return (
    <div className="flex h-[48px] items-center justify-end gap-[22px] pr-1">
      <button
        type="button"
        aria-label="Thông báo"
        onClick={() => message.info('Chưa có thông báo mới.')}
        className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#3F4B68] hover:bg-white"
      >
        <BellIcon size={25} />
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
        <button type="button" className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 font-[inherit] text-ink">
          <span className="flex size-[37px] items-center justify-center rounded-full bg-[#FFCBB7] text-[16px] font-extrabold">{initial}</span>
          <span className="flex h-[37px] items-center gap-3 rounded-full bg-white pr-3.5 pl-4 text-[15px] font-bold">
            {teacherName}
            <ChevronDownIcon size={17} strokeWidth={2.6} />
          </span>
        </button>
      </Dropdown>
    </div>
  )
}
