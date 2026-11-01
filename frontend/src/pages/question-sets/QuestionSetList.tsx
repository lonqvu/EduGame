import { Button, Dropdown, Input, Select } from 'antd'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { FileTextIcon, MoreVerticalIcon, PlayIcon, PlusIcon, SearchIcon } from '@/components/ui/icons'
import { QS_ASSETS } from '@/pages/question-sets/qsUi'
import type { LoadStatus, QuestionSetSummaryResponse, SubjectCode } from '@/types/api'
import { relativeTimeLabel } from '@/utils/dateLabels'
import {
  gradeText,
  hasFilters,
  KIND_LABELS,
  kindOf,
  type QuestionKind,
  SORT_LABELS,
  type SetFilters,
  type SetSort,
  subjectArt,
  subjectInfo,
  SUBJECTS,
} from '@/utils/questionSets'

const GRID = 'm-0 grid list-none grid-cols-1 gap-3 p-0 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3 @min-[1400px]:grid-cols-4'
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
  /** Below the limit of sets: the grid ends with a "new set" card. */
  canCreate: boolean
  onRetry: () => void
}

/** One row of filters (search, subject tabs, grade, kind, order), then the sets as cards. */
export function QuestionSetList(props: QuestionSetListProps) {
  const { filters, onFiltersChange, total, subjectCounts } = props
  const change = (patch: Partial<SetFilters>) => onFiltersChange({ ...filters, ...patch })
  const tabs = SUBJECTS.filter((s) => subjectCounts[s.code] > 0 || filters.subject === s.code)

  return (
    <section aria-label="Danh sách bộ câu hỏi" className="@container flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          allowClear
          value={filters.search}
          onChange={(e) => change({ search: e.target.value })}
          prefix={<SearchIcon size={18} className="text-ink-muted" />}
          placeholder="Tìm bộ câu hỏi..."
          aria-label="Tìm bộ câu hỏi"
          className="h-10 w-full rounded-full border-0 shadow-[0_1px_3px_rgba(31,42,68,0.06)] @min-[900px]:w-[250px]"
        />
        {/* Narrow screens: the tabs scroll sideways rather than wrapping. */}
        <div
          role="tablist"
          aria-label="Lọc theo môn"
          className="-mx-1 flex min-w-0 flex-1 basis-[300px] gap-1.5 overflow-x-auto px-1 py-0.5 [mask-image:linear-gradient(to_right,black_92%,transparent)] [scrollbar-width:none]"
        >
          <Tab selected={filters.subject === 'ALL'} onClick={() => change({ subject: 'ALL' })}>
            Tất cả ({total})
          </Tab>
          {tabs.map((s) => (
            <Tab key={s.code} selected={filters.subject === s.code} onClick={() => change({ subject: s.code })}>
              {s.label} ({subjectCounts[s.code]})
            </Tab>
          ))}
        </div>
        <div className="-mx-1 flex max-w-[calc(100%+8px)] gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
          <Select<number | 'ALL'>
            aria-label="Khối lớp"
            value={filters.grade}
            onChange={(grade) => change({ grade })}
            options={[{ value: 'ALL', label: 'Mọi khối' }, ...GRADES.map((g) => ({ value: g, label: `Lớp ${g}` }))]}
            popupMatchSelectWidth={false}
            className="h-9 w-[104px] text-[14px]"
          />
          <Select<QuestionKind | 'ALL'>
            aria-label="Loại câu hỏi"
            value={filters.kind}
            onChange={(kind) => change({ kind })}
            options={[{ value: 'ALL', label: 'Mọi loại câu' }, ...KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))]}
            popupMatchSelectWidth={false}
            className="h-9 w-[124px] text-[14px]"
          />
          <Select<SetSort>
            aria-label="Sắp xếp"
            value={filters.sort}
            onChange={(sort) => change({ sort })}
            options={(Object.keys(SORT_LABELS) as SetSort[]).map((s) => ({ value: s, label: SORT_LABELS[s] }))}
            popupMatchSelectWidth={false}
            className="h-9 w-[132px] text-[14px]"
          />
        </div>
      </div>

      {hasFilters(filters) && props.status === 'ready' && total > 0 && (
        <p role="status" className="m-0 flex flex-wrap items-center gap-x-2 text-[14px] text-ink-muted">
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

      <ListBody {...props} />
    </section>
  )
}

function Tab({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`h-9 shrink-0 cursor-pointer rounded-full border-0 px-3.5 font-[inherit] text-[14px] font-extrabold whitespace-nowrap transition ${
        selected ? 'bg-primary text-white' : 'bg-white text-ink-soft hover:text-primary-ink'
      }`}
    >
      {children}
    </button>
  )
}

function ListBody(props: QuestionSetListProps) {
  const { status, sets, total, shown, onShowMore, onCreate, canCreate, onRetry, onFiltersChange, filters } = props
  if (status === 'idle' || status === 'loading') {
    return (
      <ul aria-busy="true" aria-label="Đang tải bộ câu hỏi" className={GRID}>
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-[250px] animate-pulse rounded-[20px] bg-white" />
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
      <ul className={GRID}>
        {sets.slice(0, shown).map((set) => (
          <SetCard key={set.code} set={set} {...props} />
        ))}
        {canCreate && sets.length <= shown && (
          <li>
            <button
              type="button"
              onClick={onCreate}
              className="flex size-full min-h-[90px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[20px] border-2 border-dashed border-[#C9D6EA] bg-white/50 font-[inherit] text-[15px] font-black text-primary hover:border-primary @min-[560px]:min-h-[250px]"
            >
              + Tạo bộ câu hỏi mới
              <span className="text-[13px] font-semibold text-ink-muted">hoặc dán từ Word / Excel</span>
            </button>
          </li>
        )}
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
 * One set: the subject's picture with subject and grade, the title (to its page), how many questions of which kind,
 * when it was changed and how often played; "Chơi" and a menu for the rest.
 */
function SetCard({ set, onUse, onEdit, onCopy, onArchive }: SetActions & { set: QuestionSetSummaryResponse }) {
  const navigate = useNavigate()
  const path = `/question-sets/${encodeURIComponent(set.code)}`
  const empty = set.questionCount === 0
  const subject = subjectInfo(set.subject)
  const changed = [`Sửa ${relativeTimeLabel(set.updatedAt).toLowerCase()}`, set.playCount ? `đã chơi ${set.playCount} lần` : '']
    .filter(Boolean)
    .join(' · ')
  return (
    <li className="flex overflow-hidden rounded-[20px] border-2 border-transparent bg-white transition hover:border-[#C9D9F5] hover:shadow-[0_8px_20px_rgba(31,42,68,0.08)] @min-[560px]:flex-col">
      <Link
        to={path}
        tabIndex={-1}
        aria-hidden="true"
        className="relative flex w-[92px] shrink-0 items-center justify-center @min-[560px]:h-[96px] @min-[560px]:w-auto"
        style={{ background: subject.tint }}
      >
        <img src={subjectArt(set.subject)} alt="" className="h-[52px] @min-[560px]:h-[70px]" />
        <span
          className="absolute top-2.5 left-3 hidden rounded-full bg-white px-2.5 py-0.5 text-[12px] font-black @min-[560px]:block"
          style={{ color: subject.ink }}
        >
          {subject.label} · {gradeText(set.grade)}
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3.5 pt-3 pb-3.5">
        <Link to={path} className="line-clamp-2 text-[15.5px] leading-snug font-black text-ink hover:text-primary-ink @min-[560px]:min-h-[2.6em] @min-[560px]:text-[16px]">
          {set.title}
        </Link>
        <span className="text-[13.5px] font-bold text-[#3D4766]">
          {set.questionCount} câu · {KIND_LABELS[kindOf(set)]}
        </span>
        <span className="truncate text-[12.5px] text-ink-muted">{changed}</span>
        <span className="mt-2 flex items-center gap-1.5">
          <Button
            type="primary"
            shape="round"
            icon={<PlayIcon size={14} className="fill-current" />}
            disabled={empty}
            title={empty ? 'Bộ chưa có câu hỏi' : undefined}
            onClick={() => onUse(set)}
            className="h-9 flex-1 font-extrabold"
          >
            Chơi
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'open', label: 'Mở bộ câu hỏi', onClick: () => navigate(path) },
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
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-muted hover:bg-surface-soft hover:text-ink"
            >
              <MoreVerticalIcon size={19} />
            </button>
          </Dropdown>
        </span>
      </div>
    </li>
  )
}

function Empty({ title, text, art, children }: { title: string; text: string; art?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[20px] bg-white px-6 py-10 text-center">
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
