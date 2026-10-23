import { Button, Dropdown, Input } from 'antd'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { CheckIcon, MoreVerticalIcon, PlayIcon, PlusIcon, SearchIcon } from '@/components/ui/icons'
import { AnimalAvatar, CLASS_ASSETS } from '@/pages/classes/classUi'
import type { ClassroomResponse, LoadStatus } from '@/types/api'
import { classAvatar, classTitle, type ClassTab } from '@/utils/classrooms'
import { relativeTimeLabel } from '@/utils/dateLabels'

const TABS: { key: ClassTab; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang hoạt động' },
  { key: 'PAUSED', label: 'Tạm ngưng' },
]

interface ClassListProps {
  status: LoadStatus
  /** Classes of the tab matching the search */
  classrooms: ClassroomResponse[]
  counts: Record<ClassTab, number>
  tab: ClassTab
  onTabChange: (tab: ClassTab) => void
  search: string
  onSearchChange: (search: string) => void
  /** The class the games are played with (marked "Đang dạy") */
  currentCode: string | null
  onCreate: () => void
  onRetry: () => void
  actions: ClassActions
}

/** What a class card can do without opening the class. */
export interface ClassActions {
  teach: (classroom: ClassroomResponse) => void
  play: (classroom: ClassroomResponse) => void
  setStatus: (classroom: ClassroomResponse, status: ClassroomResponse['status']) => void
  archive: (classroom: ClassroomResponse) => void
}

/** The classes: search, tabs by status, one card per class with its main actions. */
export function ClassList(props: ClassListProps) {
  const { counts, tab, onTabChange, search, onSearchChange } = props
  return (
    <section aria-label="Danh sách lớp học" className="@container flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <Input
          allowClear
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          prefix={<SearchIcon size={18} className="text-ink-muted" />}
          placeholder="Tìm lớp, trường..."
          aria-label="Tìm kiếm lớp học"
          className="h-10 w-full rounded-full border-0 shadow-[0_1px_3px_rgba(31,42,68,0.06)] sm:w-[300px]"
        />
        {/* Narrow screens: the tabs scroll sideways rather than wrapping. */}
        <div
          role="tablist"
          aria-label="Lọc theo trạng thái"
          className="-mx-1 flex max-w-[calc(100%+8px)] gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]"
        >
          {TABS.map((t) => {
            const selected = t.key === tab
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(t.key)}
                className={`h-[36px] shrink-0 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-[14px] font-extrabold transition ${
                  selected ? 'bg-primary text-white' : 'bg-white text-ink-soft hover:text-primary-ink'
                }`}
              >
                {t.label} ({counts[t.key]})
              </button>
            )
          })}
        </div>
      </header>

      <ListBody {...props} />
    </section>
  )
}

function ListBody({ status, classrooms, counts, tab, search, onSearchChange, onTabChange, currentCode, onCreate, onRetry, actions }: ClassListProps) {
  if (status === 'idle' || status === 'loading') {
    return (
      <ul aria-busy="true" aria-label="Đang tải danh sách lớp" className="m-0 flex list-none flex-col gap-3 p-0">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex h-[96px] animate-pulse items-center gap-4 rounded-[20px] bg-white px-4">
            <span className="size-14 rounded-[16px] bg-chip" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-4 w-24 rounded bg-chip" />
              <span className="h-3 w-48 rounded bg-chip" />
            </span>
          </li>
        ))}
      </ul>
    )
  }
  if (status === 'error') {
    return (
      <Empty title="Chưa tải được danh sách lớp" text="Cô kiểm tra kết nối mạng rồi thử lại nhé.">
        <Button shape="round" onClick={onRetry}>
          Thử lại
        </Button>
      </Empty>
    )
  }
  if (counts.ALL === 0) {
    return (
      <Empty title="Cô chưa có lớp học nào" text="Tạo lớp đầu tiên, thêm học sinh rồi cùng các em chơi trò chơi nhé!" art>
        <Button type="primary" shape="round" icon={<PlusIcon size={16} />} onClick={onCreate}>
          Tạo lớp học
        </Button>
      </Empty>
    )
  }
  if (classrooms.length === 0) {
    return search.trim() ? (
      <Empty title={`Không có lớp nào khớp “${search.trim()}”`} text="Cô thử tìm theo tên lớp hoặc tên trường nhé.">
        <Button shape="round" onClick={() => onSearchChange('')}>
          Xóa tìm kiếm
        </Button>
      </Empty>
    ) : (
      <Empty title={tab === 'PAUSED' ? 'Không có lớp nào tạm ngưng' : 'Chưa có lớp nào đang hoạt động'} text="Các lớp khác ở thẻ “Tất cả”.">
        <Button shape="round" onClick={() => onTabChange('ALL')}>
          Xem tất cả lớp
        </Button>
      </Empty>
    )
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {classrooms.map((c) => (
        <ClassRow key={c.code} classroom={c} current={c.code === currentCode} actions={actions} />
      ))}
    </ul>
  )
}

/**
 * One class: animal, name (to its page), size and school, when it last played and its stars of the week, and what
 * the teacher does with it most: teach it ("Đang dạy" when it is), play with it, the rest in the menu.
 */
function ClassRow({ classroom: c, current, actions }: { classroom: ClassroomResponse; current: boolean; actions: ClassActions }) {
  const navigate = useNavigate()
  const page = `/classes/${encodeURIComponent(c.code)}`
  const paused = c.status === 'PAUSED'
  // The class size first: the school name may be long and is cut on narrow screens.
  const details = [`${c.studentCount} học sinh`, c.schoolName].filter(Boolean).join(' · ')
  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[20px] border-2 border-transparent bg-white px-4 py-3.5 transition hover:border-[#C9D9F5] ${
        paused ? 'bg-white/70' : ''
      }`}
    >
      <Link to={page} tabIndex={-1} aria-hidden="true" className={paused ? 'opacity-70' : ''}>
        <AnimalAvatar avatar={classAvatar(c)} size={60} className="size-[52px] rounded-[18px] sm:size-[60px]" />
      </Link>
      <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <Link to={page} aria-label={`${classTitle(c.name)}, ${details}`} className="truncate text-[19px] font-black text-ink hover:text-primary-ink">
            {classTitle(c.name)}
          </Link>
          {paused && <span className="shrink-0 rounded-full bg-chip px-2.5 py-0.5 text-[12px] font-extrabold text-ink-muted">Tạm ngưng</span>}
        </span>
        <span className="truncate text-[13.5px] text-ink-muted">{details}</span>
        <span className="mt-1 flex flex-wrap gap-1.5">
          <Fact>
            🎮 Chơi gần nhất: <b className="font-extrabold">{relativeTimeLabel(c.lastPlayedAt) || 'chưa chơi'}</b>
          </Fact>
          <Fact>
            ⭐ <b className="font-extrabold">{c.weeklyStars}</b> sao tuần này
          </Fact>
        </span>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {paused ? (
          <Button shape="round" onClick={() => actions.setStatus(c, 'ACTIVE')} className="h-10 flex-1 font-extrabold sm:flex-none">
            Kích hoạt lại
          </Button>
        ) : (
          <>
            {current ? (
              <span className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#E2F6E8] px-4 text-[14px] font-extrabold whitespace-nowrap text-success sm:flex-none">
                <CheckIcon size={15} /> Đang dạy
              </span>
            ) : (
              <Button shape="round" onClick={() => actions.teach(c)} className="h-10 flex-1 border-2 font-extrabold text-primary-ink sm:flex-none">
                Dạy lớp này
              </Button>
            )}
            <Button
              type="primary"
              shape="round"
              icon={<PlayIcon size={15} className="fill-current" />}
              onClick={() => actions.play(c)}
              className="h-10 flex-1 font-extrabold sm:flex-none"
            >
              Chơi cùng lớp
            </Button>
          </>
        )}
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'open', label: 'Mở lớp', onClick: () => navigate(page) },
              paused
                ? { key: 'resume', label: 'Kích hoạt lại lớp', onClick: () => actions.setStatus(c, 'ACTIVE') }
                : { key: 'pause', label: 'Tạm ngưng lớp', onClick: () => actions.setStatus(c, 'PAUSED') },
              { type: 'divider' },
              { key: 'archive', label: 'Xóa lớp', danger: true, onClick: () => actions.archive(c) },
            ],
          }}
        >
          <button
            type="button"
            aria-label={`Thao tác với ${classTitle(c.name)}`}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-muted hover:bg-surface-soft"
          >
            <MoreVerticalIcon size={19} />
          </button>
        </Dropdown>
      </div>
    </li>
  )
}

function Fact({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[#F6F8FC] px-2.5 py-1 text-[12.5px] whitespace-nowrap text-[#5B6580]">{children}</span>
}

function Empty({ title, text, art, children }: { title: string; text: string; art?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white px-6 py-9 text-center">
      {art && <img src={`${CLASS_ASSETS}/teacher.svg`} alt="" className="mb-1 size-[120px]" />}
      <p className="m-0 text-[17px] font-black">{title}</p>
      <p className="m-0 max-w-[380px] text-[14.5px] text-ink-muted">{text}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
