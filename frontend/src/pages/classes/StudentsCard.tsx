import { Button, Input } from 'antd'
import { type ReactNode, useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { FileTextIcon, FilledStarIcon, PencilIcon, PlusIcon, SearchIcon, SortAzIcon, TrashIcon } from '@/components/ui/icons'
import { CLASS_ASSETS } from '@/pages/classes/classUi'
import type { StudentResponse } from '@/types/api'
import { fold, MAX_STUDENTS } from '@/utils/classrooms'

interface StudentsCardProps {
  students: StudentResponse[]
  onAdd: () => void
  /** "Nhập từ file": an Excel or CSV class list */
  onImport: () => void
  onRename: (student: StudentResponse) => void
  onRemove: (student: StudentResponse) => void
  onSortByName: () => void
}

/** The class list in roll call order, with stars; add, rename, remove, sort A–Z. */
export function StudentsCard({ students, onAdd, onImport, onRename, onRemove, onSortByName }: StudentsCardProps) {
  const [search, setSearch] = useState('')
  const shown = useMemo(() => {
    const query = fold(search.trim())
    return query ? students.filter((s) => fold(s.displayName).includes(query)) : students
  }, [students, search])
  const full = students.length >= MAX_STUDENTS

  return (
    <section aria-labelledby="students-title" className="@container rounded-[20px] bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <h2 id="students-title" className="m-0 mr-auto text-[19px] font-black">
          Học sinh <span className="font-bold text-ink-muted">({students.length})</span>
        </h2>
        {students.length > 0 && (
          <Input
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<SearchIcon size={18} className="text-ink-muted" />}
            placeholder="Tìm học sinh..."
            aria-label="Tìm học sinh"
            className="order-last h-10 w-full rounded-full @min-[700px]:order-none @min-[700px]:w-[220px]"
          />
        )}
        {students.length > 1 && (
          <Button icon={<SortAzIcon size={18} />} onClick={onSortByName} className="h-10 rounded-full font-bold">
            Xếp theo tên
          </Button>
        )}
        <Button icon={<FileTextIcon size={17} />} onClick={onImport} disabled={full} className="h-10 rounded-full font-bold">
          Nhập từ file
        </Button>
        <Button
          type="primary"
          icon={<PlusIcon size={16} />}
          onClick={onAdd}
          disabled={full}
          title={full ? `Lớp đã đủ ${MAX_STUDENTS} học sinh` : undefined}
          className="h-10 rounded-full font-extrabold"
        >
          Thêm học sinh
        </Button>
      </header>

      {students.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-9 text-center">
          <img src={`${CLASS_ASSETS}/teacher.svg`} alt="" className="size-[110px]" />
          <p className="m-0 text-[17px] font-black">Lớp chưa có học sinh</p>
          <p className="m-0 max-w-[400px] text-[14.5px] text-ink-muted">
            Thêm tên các em (gõ, dán hoặc nhập từ file danh sách lớp) để gọi tên, chia nhóm và thưởng sao trong các trò chơi.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            <Button shape="round" icon={<FileTextIcon size={16} />} onClick={onImport}>
              Nhập từ file Excel / CSV
            </Button>
            <Button type="primary" shape="round" icon={<PlusIcon size={16} />} onClick={onAdd}>
              Thêm học sinh
            </Button>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-4 mb-0 rounded-2xl bg-surface-soft px-4 py-6 text-center text-[15px] text-ink-muted">
          Không có học sinh nào tên “{search.trim()}”.
        </p>
      ) : (
        <div role="table" aria-label="Danh sách học sinh" className="mt-4">
          <div
            role="row"
            className="hidden grid-cols-[52px_minmax(0,1fr)_110px_110px_92px] items-center gap-3 border-b border-line-soft px-3 pb-2 text-[13px] font-bold text-ink-muted @min-[640px]:grid"
          >
            <span role="columnheader">STT</span>
            <span role="columnheader">Học sinh</span>
            <span role="columnheader" className="text-center">
              Sao tuần này
            </span>
            <span role="columnheader" className="text-center">
              Tổng sao
            </span>
            <span role="columnheader" className="sr-only">
              Thao tác
            </span>
          </div>
          <div role="rowgroup">
            {shown.map((s) => (
              <div
                key={s.id}
                role="row"
                className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-line-soft px-2 py-2.5 last:border-b-0 hover:bg-surface-soft @min-[640px]:grid-cols-[52px_minmax(0,1fr)_110px_110px_92px] @min-[640px]:px-3"
              >
                <span role="cell" className="text-[15px] font-bold text-ink-muted tabular-nums">
                  {s.rollNumber ?? '–'}
                </span>
                <span role="cell" className="flex min-w-0 items-center gap-3">
                  <Avatar name={s.displayName} size={38} className="hidden @min-[400px]:flex" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15.5px] font-bold">{s.displayName}</span>
                    <span className="flex items-center gap-1 text-[13px] whitespace-nowrap text-ink-muted @min-[640px]:hidden">
                      <FilledStarIcon size={14} /> {s.weeklyStars} tuần này · {s.totalStars} tổng
                    </span>
                  </span>
                </span>
                <span role="cell" className="hidden items-center justify-center gap-1.5 font-extrabold tabular-nums @min-[640px]:flex">
                  <FilledStarIcon size={17} />
                  {s.weeklyStars}
                </span>
                <span role="cell" className="hidden justify-center font-bold text-ink-soft tabular-nums @min-[640px]:flex">
                  {s.totalStars}
                </span>
                <span role="cell" className="flex justify-end gap-1">
                  <IconButton label={`Đổi tên ${s.displayName}`} onClick={() => onRename(s)}>
                    <PencilIcon size={18} />
                  </IconButton>
                  <IconButton label={`Xóa ${s.displayName} khỏi lớp`} onClick={() => onRemove(s)} danger>
                    <TrashIcon size={18} />
                  </IconButton>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-muted transition ${
        danger ? 'hover:bg-[#FDECEC] hover:text-danger' : 'hover:bg-primary-soft hover:text-primary'
      }`}
    >
      {children}
    </button>
  )
}
