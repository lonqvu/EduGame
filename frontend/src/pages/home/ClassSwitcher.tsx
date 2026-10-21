import { Dropdown } from 'antd'
import type { ReactElement } from 'react'
import { CheckIcon } from '@/components/ui/icons'

/** An active class the teacher can switch to. */
export interface ClassChoice {
  code: string
  label: string
  studentCount: number
}

interface ClassSwitcherProps {
  classes: ClassChoice[]
  currentCode: string | null
  onPickClass: (code: string) => void
  onManageClasses: () => void
  /** The button that opens the menu. */
  children: ReactElement
}

/** Menu of the teacher's classes (the one being taught is checked), then "Quản lý lớp học" or "Tạo lớp học". */
export function ClassSwitcher({ classes, currentCode, onPickClass, onManageClasses, children }: ClassSwitcherProps) {
  return (
    <Dropdown
      trigger={['click']}
      placement="bottomLeft"
      menu={{
        selectable: true,
        selectedKeys: currentCode ? [currentCode] : [],
        items: [
          ...classes.map((c) => ({
            key: c.code,
            label: (
              <span className="flex min-w-[210px] items-center justify-between gap-4">
                <span>
                  <strong>{c.label}</strong> <span className="text-ink-muted">· {c.studentCount} học sinh</span>
                </span>
                {c.code === currentCode && <CheckIcon size={16} className="text-primary" />}
              </span>
            ),
            onClick: () => onPickClass(c.code),
          })),
          ...(classes.length ? [{ type: 'divider' as const }] : []),
          { key: 'manage', label: classes.length ? 'Quản lý lớp học' : 'Tạo lớp học', onClick: onManageClasses },
        ],
      }}
    >
      {children}
    </Dropdown>
  )
}
