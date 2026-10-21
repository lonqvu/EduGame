import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BoltIcon, ClockIcon, FileTextIcon, GamepadFilledIcon, UsersFilledIcon } from '@/components/ui/icons'
import { Panel, PanelHeader } from '@/pages/home/homeUi'
import { OPEN_CREATE_SET } from '@/utils/questionSets'

interface QuickAction {
  label: string
  hint: string
  icon: ReactNode
  tint: string
  to: string
  state?: unknown
}

/** Four shortcuts to the other pages: write questions, the classes, every game, past results. */
export function QuickActions({ classPath }: { classPath: string }) {
  const actions: QuickAction[] = [
    {
      label: 'Tạo bộ câu hỏi',
      hint: 'Soạn câu hỏi mới',
      icon: <FileTextIcon size={26} strokeWidth={2.2} className="text-[#3467F4]" />,
      tint: 'bg-[#EEF3FF] hover:bg-[#E3EBFF]',
      to: '/question-sets',
      state: OPEN_CREATE_SET,
    },
    {
      label: 'Quản lý lớp',
      hint: 'Học sinh và nhóm',
      icon: <UsersFilledIcon size={26} className="text-[#1FA463]" />,
      tint: 'bg-[#EAF8F0] hover:bg-[#DDF3E7]',
      to: classPath,
    },
    {
      label: 'Kho trò chơi',
      hint: 'Khám phá thêm',
      icon: <GamepadFilledIcon size={26} className="text-[#8B5CF6]" />,
      tint: 'bg-[#F3EEFF] hover:bg-[#EAE2FF]',
      to: '/games/new',
    },
    {
      label: 'Lịch sử hoạt động',
      hint: 'Xem lại kết quả',
      icon: <ClockIcon size={26} strokeWidth={2.2} className="text-[#F08C00]" />,
      tint: 'bg-[#FFF5E6] hover:bg-[#FFEDD2]',
      to: '/reports',
    },
  ]
  return (
    <Panel className="flex flex-col gap-3.5 px-4 pt-[18px] pb-4">
      <PanelHeader icon={<BoltIcon size={21} className="text-primary" />} title="Thao tác nhanh" />
      <ul className="m-0 grid flex-1 list-none grid-cols-2 gap-3 p-0">
        {actions.map((a) => (
          <li key={a.label} className="min-w-0">
            <Link
              to={a.to}
              state={a.state}
              className={`flex h-full min-h-[96px] flex-col justify-center gap-1 rounded-[14px] px-3.5 py-3 text-ink transition-colors hover:text-ink ${a.tint}`}
            >
              {a.icon}
              <span className="mt-1.5 text-[15px] leading-tight font-extrabold">{a.label}</span>
              <span className="text-[12.5px] text-ink-soft">{a.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
