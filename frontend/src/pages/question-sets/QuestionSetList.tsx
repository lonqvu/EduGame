import { Button, Dropdown, Input, Select } from 'antd'
import { forwardRef, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { CalendarIcon, FileTextIcon, MoreVerticalIcon, PlayIcon, PlusIcon, SearchIcon, UserIcon } from '@/components/ui/icons'
import { QS_ASSETS, SetChips, StatBox, SubjectThumb } from '@/pages/question-sets/qsUi'
import type { LoadStatus, QuestionSetSummaryResponse, SubjectCode } from '@/types/api'
import {
  compactNumber,
  dayLabel,
  hasFilters,
  KIND_LABELS,
  type QuestionKind,
  SORT_LABELS,
  type SetFilters,
  type SetSort,
  SUBJECTS,
} from '@/utils/questionSets'

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
const KINDS: QuestionKind[] = ['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'MIXED', 'EMPTY']

export interface SetActions {
  onUse: (set: QuestionSetSummaryResponse) => void
  onEdit: (set: QuestionSetSummaryResponse) => void
  onCopy: (set: QuestionSetSummaryResponse) => void
  onArchive: (set: QuestionSetSummaryResponse) => void
}

interface QuestionSetListProps extends SetActions {
  status: LoadStatus
  /** Sets matching the filters, sorted */
  sets: QuestionSetSummaryResponse[]
  total: number
  subjectCounts: Record<SubjectCode, number>
  filters: SetFilters
  onFiltersChange: (filters: SetFilters) => void
  /** Rows shown; the rest behind "Xem thêm" */
  shown: number
  onShowMore: () => void
  onCreate: () => void
  onRetry: () => void
}

/** Search, filters, subject tabs and one row per set. */
export const QuestionSetList = forwardRef<HTMLInputElement, QuestionSetListProps>(function QuestionSetList(props, searchRef) {
  const { filters, onFiltersChange, total, subjectCounts } = props
  const change = (patch: Partial<SetFilters>) => onFiltersChange({ ...filters, ...patch })
  const tabs = SUBJECTS.filter((s) => subjectCounts[s.code] > 0 || filters.subject === s.code)

  return (
    <section aria-label="Danh sách bộ câu hỏi" className="@container min-w-0 rounded-[20px] bg-white p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2.5 @min-[800px]:grid-cols-[minmax(170px,1fr)_repeat(4,minmax(0,148px))]">
        <Input
          ref={(input) => {
            if (typeof searchRef === 'function') searchRef(input?.input ?? null)
            else if (searchRef) searchRef.current = input?.input ?? null
          }}
          allowClear
          value={filters.search}
          onChange={(e) => change({ search: e.target.value })}
          prefix={<SearchIcon size={18} className="text-ink-muted" />}
          placeholder="Tìm bộ câu hỏi, chủ đề..."
          aria-label="Tìm bộ câu hỏi"
          className="col-span-2 h-10 rounded-[12px] text-[14px] @min-[800px]:col-span-1"
        />
        <Select<SubjectCode | 'ALL'>
          aria-label="Môn học"
          value={filters.subject}
          onChange={(subject) => change({ subject })}
          options={[{ value: 'ALL', label: 'Tất cả môn học' }, ...SUBJECTS.map((s) => ({ value: s.code, label: s.label }))]}
          className="h-10 text-[14px]"
        />
        <Select<number | 'ALL'>
          aria-label="Khối lớp"
          value={filters.grade}
          onChange={(grade) => change({ grade })}
          options={[{ value: 'ALL', label: 'Tất cả khối lớp' }, ...GRADES.map((g) => ({ value: g, label: `Lớp ${g}` }))]}
          className="h-10 text-[14px]"
        />
        <Select<QuestionKind | 'ALL'>
          aria-label="Loại câu hỏi"
          value={filters.kind}
          onChange={(kind) => change({ kind })}
          options={[{ value: 'ALL', label: 'Mọi loại câu hỏi' }, ...KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))]}
          className="h-10 text-[14px]"
        />
        <Select<SetSort>
          aria-label="Sắp xếp"
          value={filters.sort}
          onChange={(sort) => change({ sort })}
          options={(Object.keys(SORT_LABELS) as SetSort[]).map((s) => ({ value: s, label: SORT_LABELS[s] }))}
          className="h-10 text-[14px]"
        />
      </div>

      {/* Narrow screens: the tabs scroll sideways rather than wrapping. */}
      <div role="tablist" aria-label="Lọc theo môn" className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]">
        <Tab selected={filters.subject === 'ALL'} onClick={() => change({ subject: 'ALL' })}>
          Tất cả ({total})
        </Tab>
        {tabs.map((s) => (
          <Tab key={s.code} selected={filters.subject === s.code} onClick={() => change({ subject: s.code })}>
            {s.label} ({subjectCounts[s.code]})
          </Tab>
        ))}
      </div>

      {hasFilters(filters) && props.status === 'ready' && total > 0 && (
        <p role="status" className="mt-3 mb-0 flex flex-wrap items-center gap-x-2 text-[14px] text-ink-muted">
          Tìm thấy {props.sets.length} bộ câu hỏi
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, search: '', subject: 'ALL', grade: 'ALL', kind: 'ALL' })}
            className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-bold text-primary hover:underline"
          >
            Xóa bộ lọc
          </button>
        </p>
      )}

      <div className="mt-4">
        <ListBody {...props} />
      </div>
    </section>
  )
})

function Tab({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`h-9 shrink-0 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-[14px] font-bold whitespace-nowrap transition ${
        selected ? 'bg-primary text-white shadow-[0_3px_8px_rgba(53,99,233,0.25)]' : 'bg-chip text-ink-soft hover:bg-primary-soft hover:text-primary-ink'
      }`}
    >
      {children}
    </button>
  )
}

function ListBody(props: QuestionSetListProps) {
  const { status, sets, total, shown, onShowMore, onCreate, onRetry, onFiltersChange, filters } = props
  if (status === 'idle' || status === 'loading') {
    return (
      <ul aria-busy="true" aria-label="Đang tải bộ câu hỏi" className="m-0 flex list-none flex-col gap-3 p-0">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex h-[132px] animate-pulse gap-4 rounded-[18px] border border-line-soft p-4">
            <span className="h-[92px] w-[106px] rounded-[16px] bg-chip" />
            <span className="flex flex-1 flex-col gap-2.5 pt-1">
              <span className="h-4 w-1/2 rounded bg-chip" />
              <span className="h-3 w-1/3 rounded bg-chip" />
              <span className="h-3 w-3/4 rounded bg-chip" />
            </span>
          </li>
        ))}
      </ul>
    )
  }
  if (status === 'error') {
    return (
      <Empty title="Chưa tải được bộ câu hỏi" text="Cô kiểm tra kết nối mạng rồi thử lại nhé.">
        <Button shape="round" onClick={onRetry}>
          Thử lại
        </Button>
      </Empty>
    )
  }
  if (total === 0) {
    return (
      <Empty art title="Cô chưa có bộ câu hỏi nào" text="Tạo bộ câu hỏi đầu tiên, rồi dùng nó cho Trắc nghiệm, Rung chuông vàng, Đua thuyền hay Lật ô.">
        <Button type="primary" shape="round" icon={<PlusIcon size={16} />} onClick={onCreate}>
          Tạo bộ câu hỏi
        </Button>
      </Empty>
    )
  }
  if (sets.length === 0) {
    return (
      <Empty title="Không có bộ câu hỏi nào phù hợp" text="Cô thử từ khóa khác hoặc bỏ bớt bộ lọc nhé.">
        <Button shape="round" onClick={() => onFiltersChange({ ...filters, search: '', subject: 'ALL', grade: 'ALL', kind: 'ALL' })}>
          Xóa bộ lọc
        </Button>
      </Empty>
    )
  }
  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {sets.slice(0, shown).map((set) => (
          <SetRow key={set.code} set={set} {...props} />
        ))}
      </ul>
      {sets.length > shown && (
        <div className="mt-4 flex justify-center">
          <Button shape="round" onClick={onShowMore} className="font-bold">
            Xem thêm {sets.length - shown} bộ câu hỏi
          </Button>
        </div>
      )}
    </>
  )
}

/**
 * One set: picture, title, chips, description, author and date; numbers and actions on the right (below on narrow
 * screens).
 */
function SetRow({ set, onUse, onEdit, onCopy, onArchive }: SetActions & { set: QuestionSetSummaryResponse }) {
  const navigate = useNavigate()
  const path = `/question-sets/${encodeURIComponent(set.code)}`
  const empty = set.questionCount === 0
  return (
    <li className="grid grid-cols-[72px_minmax(0,1fr)_32px] gap-x-3.5 gap-y-3 rounded-[18px] border border-line-soft p-3.5 transition hover:border-[#C9D9F5] hover:shadow-[0_6px_18px_rgba(31,42,68,0.06)] @min-[820px]:grid-cols-[106px_minmax(0,1fr)_auto_32px] @min-[820px]:gap-x-5 @min-[820px]:p-4">
      <Link to={path} tabIndex={-1} aria-hidden="true" className="self-start">
        <SubjectThumb subject={set.subject} className="w-full" />
      </Link>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Link to={path} className="text-[16.5px] leading-snug font-black text-ink hover:text-primary @min-[820px]:text-[17.5px]">
          {set.title}
        </Link>
        <SetChips set={set} />
        {set.description && <p className="m-0 line-clamp-2 text-[14px] leading-relaxed text-ink-muted">{set.description}</p>}
        <p className="m-0 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <UserIcon size={14} /> Tạo bởi: {set.ownerName}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarIcon size={14} /> Cập nhật: {dayLabel(set.updatedAt)}
          </span>
        </p>
      </div>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: [
            { key: 'edit', label: 'Sửa thông tin', onClick: () => onEdit(set) },
            { key: 'copy', label: 'Nhân bản', onClick: () => onCopy(set) },
            { type: 'divider' },
            { key: 'archive', label: 'Xóa bộ câu hỏi', danger: true, onClick: () => onArchive(set) },
          ],
        }}
      >
        <button
          type="button"
          aria-label={`Thao tác khác với ${set.title}`}
          className="col-start-3 row-start-1 flex size-8 cursor-pointer items-center justify-center self-start rounded-full border-0 bg-transparent text-ink-muted hover:bg-surface-soft hover:text-ink @min-[820px]:col-start-4"
        >
          <MoreVerticalIcon size={19} />
        </button>
      </Dropdown>
      <div className="col-span-3 flex flex-wrap items-center gap-2.5 @min-[820px]:col-span-1 @min-[820px]:col-start-3 @min-[820px]:row-start-1 @min-[820px]:w-[290px] @min-[820px]:flex-col @min-[820px]:items-stretch">
        <span className="flex gap-2.5">
          <StatBox value={String(set.questionCount)} label="Câu hỏi" />
          <StatBox value={compactNumber(set.useCount)} label="Lượt sử dụng" title={`Đã tạo ${set.useCount} trò chơi, chơi ${set.playCount} lần với lớp`} />
        </span>
        <span className="flex w-full gap-2.5 @min-[520px]:ml-auto @min-[520px]:w-auto @min-[820px]:ml-0 @min-[820px]:w-full">
          <Button onClick={() => navigate(path)} className="h-10 flex-1 rounded-[12px] border-primary font-bold text-primary">
            Xem chi tiết
          </Button>
          <Button
            type="primary"
            icon={<PlayIcon size={15} />}
            disabled={empty}
            title={empty ? 'Bộ chưa có câu hỏi' : undefined}
            onClick={() => onUse(set)}
            className="h-10 flex-1 rounded-[12px] font-extrabold"
          >
            Chơi
          </Button>
        </span>
      </div>
    </li>
  )
}

function Empty({ title, text, art, children }: { title: string; text: string; art?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-line px-6 py-10 text-center">
      {art ? (
        <img src={`${QS_ASSETS}/tip.svg`} alt="" className="mb-1 h-[110px]" />
      ) : (
        <span className="mb-1 flex size-14 items-center justify-center rounded-full bg-chip text-ink-muted">
          <FileTextIcon size={26} />
        </span>
      )}
      <p className="m-0 text-[17px] font-black">{title}</p>
      <p className="m-0 max-w-[420px] text-[14.5px] text-ink-muted">{text}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
