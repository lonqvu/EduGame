import { Button, Input } from 'antd'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRightIcon, PlusIcon, SearchIcon, UsersIcon } from '@/components/ui/icons'
import { AnimalAvatar, CLASS_ASSETS, StatusChip } from '@/pages/classes/classUi'
import type { ClassroomResponse, LoadStatus } from '@/types/api'
import { classAvatar, classTitle, type ClassTab } from '@/utils/classrooms'

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
}

/** "Danh sách lớp học": tabs by status, search, one row per class leading to its page. */
export function ClassList(props: ClassListProps) {
  const { counts, tab, onTabChange, search, onSearchChange } = props
  return (
    <section aria-labelledby="class-list-title" className="@container min-w-0 rounded-[20px] bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <h2 id="class-list-title" className="m-0 flex items-center gap-2.5 text-[19px] font-black">
          <UsersIcon size={24} className="text-ink-soft" />
          Danh sách lớp học
        </h2>
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
                className={`h-[34px] shrink-0 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-[14px] font-bold transition ${
                  selected ? 'bg-primary text-white shadow-[0_3px_8px_rgba(53,99,233,0.25)]' : 'bg-chip text-ink-soft hover:bg-primary-soft hover:text-primary-ink'
                }`}
              >
                {t.label} ({counts[t.key]})
              </button>
            )
          })}
        </div>
        <Input
          allowClear
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          prefix={<SearchIcon size={18} className="text-ink-muted" />}
          placeholder="Tìm lớp, trường..."
          aria-label="Tìm kiếm lớp học"
          className="h-10 min-w-[170px] flex-1 basis-[170px] rounded-full @min-[810px]:ml-auto @min-[810px]:max-w-[280px]"
        />
      </header>

      <div className="mt-4">
        <ListBody {...props} />
      </div>
    </section>
  )
}

function ListBody({ status, classrooms, counts, tab, search, onSearchChange, onTabChange, currentCode, onCreate, onRetry }: ClassListProps) {
  if (status === 'idle' || status === 'loading') {
    return (
      <ul aria-busy="true" aria-label="Đang tải danh sách lớp" className="m-0 flex list-none flex-col gap-3 p-0">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex h-[84px] animate-pulse items-center gap-4 rounded-2xl border border-line-soft px-4">
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
        <ClassRow key={c.code} classroom={c} current={c.code === currentCode} />
      ))}
    </ul>
  )
}

/**
 * One class: animal, name, school and size, status, activities and completion, chevron. Wide: one line; narrow:
 * status and numbers go on a second line.
 */
function ClassRow({ classroom: c, current }: { classroom: ClassroomResponse; current: boolean }) {
  // The class size first: the school name may be long and is cut on narrow screens.
  const details = [`${c.studentCount} học sinh`, c.schoolName].filter(Boolean).join(' · ')
  return (
    <li>
      <Link
        to={`/classes/${encodeURIComponent(c.code)}`}
        aria-label={`${classTitle(c.name)}, ${details}`}
        className="group grid grid-cols-[52px_minmax(0,1fr)_20px] items-center gap-x-4 gap-y-2.5 rounded-2xl border border-line-soft bg-white px-3.5 py-3 text-ink transition hover:-translate-y-px hover:border-[#C9D9F5] hover:text-ink hover:shadow-[0_6px_18px_rgba(31,42,68,0.07)] @min-[720px]:grid-cols-[56px_minmax(0,1fr)_auto_200px_20px] @min-[720px]:py-3.5"
      >
        <AnimalAvatar avatar={classAvatar(c)} size={56} className="row-span-2 size-[52px] self-start @min-[720px]:row-span-1 @min-[720px]:size-14 @min-[720px]:self-center" />
        <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="truncate text-[17px] font-black">{classTitle(c.name)}</span>
            {current && (
              <span className="shrink-0 rounded-full bg-sun-soft px-2 py-px text-[11.5px] font-extrabold text-sun-ink">Đang dạy</span>
            )}
          </span>
          <span className="truncate text-[14px] text-ink-muted">{details}</span>
        </div>
        <ChevronRightIcon
          size={20}
          className="col-start-3 row-start-1 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-primary @min-[720px]:col-start-5"
        />
        <div className="col-span-2 col-start-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 @min-[720px]:contents">
          <span className="@min-[720px]:col-start-3 @min-[720px]:row-start-1 @min-[720px]:px-4">
            <StatusChip status={c.status} />
          </span>
          <span className="flex items-center @min-[720px]:col-start-4 @min-[720px]:row-start-1">
            <Stat value={String(c.activityCount)} label="Hoạt động" />
            <span aria-hidden="true" className="mx-4 h-8 w-px bg-line-soft @min-[720px]:mx-5" />
            <Stat value={c.activityCount ? `${c.completionRate}%` : '–'} label="Hoàn thành" />
          </span>
        </div>
      </Link>
    </li>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex min-w-[72px] flex-col items-center leading-tight">
      <span className="text-[17px] font-black">{value}</span>
      <span className="text-[13px] text-ink-muted">{label}</span>
    </span>
  )
}

function Empty({ title, text, art, children }: { title: string; text: string; art?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-9 text-center">
      {art && <img src={`${CLASS_ASSETS}/teacher.svg`} alt="" className="mb-1 size-[120px]" />}
      <p className="m-0 text-[17px] font-black">{title}</p>
      <p className="m-0 max-w-[380px] text-[14.5px] text-ink-muted">{text}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
