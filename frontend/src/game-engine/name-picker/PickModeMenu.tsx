import { Dropdown } from 'antd'
import { useNavigate } from 'react-router'
import { ChevronRightIcon } from '@/components/ui/icons'
import { PICK_TOOL_LINKS } from '@/game-engine/name-picker/modes'

/** "Đổi trò" pill: switch between the name-picking tools without losing who was called. */
export function PickModeMenu({ current }: { current: string }) {
  const navigate = useNavigate()
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectedKeys: [current],
        items: PICK_TOOL_LINKS.map((t) => ({ key: t.key, label: <span className="text-base font-bold">{t.label}</span> })),
        onClick: ({ key }) => {
          const link = PICK_TOOL_LINKS.find((t) => t.key === key)
          if (link) navigate(link.path, { replace: true })
        },
      }}
    >
      <button
        type="button"
        className="flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-white/90 pr-3 pl-4 font-[inherit] text-[17px] font-extrabold text-ink hover:bg-white"
      >
        Đổi trò
        <ChevronRightIcon size={18} className="rotate-90" />
      </button>
    </Dropdown>
  )
}
