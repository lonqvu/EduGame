import { App, Button, Dropdown, Input } from 'antd'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { FileTextIcon, FilledStarIcon, MoreVerticalIcon, PlusIcon, SearchIcon, SortAzIcon } from '@/components/ui/icons'
import { CLASS_ASSETS } from '@/pages/classes/classUi'
import type { StudentResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { fold, MAX_STUDENTS, studentAvatarSrc } from '@/utils/classrooms'

type View = 'cards' | 'table'
const VIEW_KEY = 'lopvui.students.view'

const readView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'cards'
  } catch {
    return 'cards'
  }
}

interface StudentsCardProps {
  students: StudentResponse[]
  onAdd: () => void
  /** "Nhập từ file": an Excel or CSV class list */
  onImport: () => void
  onRename: (student: StudentResponse) => void
  onRemove: (student: StudentResponse) => void
  onSortByName: () => void
  /** Stars for these students (taken away when negative); rejects when they could not be saved. */
  onAward: (ids: number[], points: number) => Promise<void>
}

/**
 * The class list, to praise: each student a card (animal, name, stars of the week) that gives a star when tapped,
 * or several picked at once; renaming and removing are in each card's menu. A table shows the roll call instead.
 */
export function StudentsCard({ students, onAdd, onImport, onRename, onRemove, onSortByName, onAward }: StudentsCardProps) {
  const { message } = App.useApp()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>(readView)
  /** Students picked by "Khen nhiều bạn"; null: tapping a card praises it. */
  const [picked, setPicked] = useState<number[] | null>(null)
  /** "+1 ⭐" flying above a card just praised, by student; the counter replays it on every tap. */
  const [bursts, setBursts] = useState<Record<number, { points: number; key: number }>>({})
  const burstKey = useRef(0)

  const shown = useMemo(() => {
    const query = fold(search.trim())
    return query ? students.filter((s) => fold(s.displayName).includes(query)) : students
  }, [students, search])
  const full = students.length >= MAX_STUDENTS

  const changeView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Private window: the choice lasts until the page is left.
    }
  }

  const award = (ids: number[], points: number) => {
    const key = ++burstKey.current
    setBursts((b) => ({ ...b, ...Object.fromEntries(ids.map((id) => [id, { points, key }])) }))
    setTimeout(() => setBursts((b) => Object.fromEntries(Object.entries(b).filter(([, v]) => v.key !== key))), 900)
    onAward(ids, points).catch((error: unknown) => message.error(`Chưa lưu được sao. ${apiErrorMessage(error)}`))
  }

  const tap = (s: StudentResponse) => {
    if (picked) setPicked(picked.includes(s.id) ? picked.filter((id) => id !== s.id) : [...picked, s.id])
    else award([s.id], 1)
  }

  const menu = (s: StudentResponse) => ({
    items: [
      { key: 'plus2', label: '+2 ⭐', onClick: () => award([s.id], 2) },
      { key: 'minus1', label: '−1 ⭐', disabled: s.weeklyStars <= 0 && s.totalStars <= 0, onClick: () => award([s.id], -1) },
      { type: 'divider' as const },
      { key: 'rename', label: 'Đổi tên', onClick: () => onRename(s) },
      { key: 'remove', label: 'Xóa khỏi lớp', danger: true, onClick: () => onRemove(s) },
    ],
  })

  return (
    <section aria-labelledby="students-title" className="@container rounded-[20px] bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
        <h2 id="students-title" className="m-0 mr-auto text-[19px] font-black">
          Học sinh <span className="font-bold text-ink-muted">({students.length})</span>
        </h2>
        {students.length > 0 && (
          <>
            <Input
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchIcon size={18} className="text-ink-muted" />}
              placeholder="Tìm học sinh..."
              aria-label="Tìm học sinh"
              className="order-last h-10 w-full rounded-full @min-[760px]:order-none @min-[760px]:w-[190px]"
            />
            <div role="radiogroup" aria-label="Cách xem" className="hidden rounded-full bg-chip p-1 @min-[560px]:flex">
              {(['cards', 'table'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => changeView(v)}
                  className={`h-8 cursor-pointer rounded-full border-0 px-3 font-[inherit] text-[13px] font-extrabold ${
                    view === v ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-ink-muted'
                  }`}
                >
                  {v === 'cards' ? '▦ Thẻ' : '☰ Bảng'}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setPicked(picked ? null : [])}
              aria-pressed={!!picked}
              className={`h-10 rounded-full font-bold ${picked ? 'border-primary text-primary-ink' : ''}`}
            >
              {picked ? 'Xong' : '☑ Khen nhiều bạn'}
            </Button>
          </>
        )}
        {students.length > 1 && (
          <Button
            icon={<SortAzIcon size={18} />}
            onClick={onSortByName}
            aria-label="Xếp theo tên"
            title="Xếp lại danh sách theo tên"
            className="size-10 rounded-full"
          />
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

      {students.length > 0 && (
        <p className="m-0 mt-2 text-[13px] text-ink-muted">
          {picked ? 'Chạm vào các bạn cần khen, rồi chọn số sao ở thanh bên dưới.' : 'Chạm vào một bạn để tặng 1 sao. Muốn tặng 2 sao hoặc bớt sao, cô mở menu của bạn đó.'}
        </p>
      )}

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
      ) : view === 'cards' ? (
        <ul aria-label="Danh sách học sinh" className="m-0 mt-4 grid list-none grid-cols-3 gap-2.5 p-0 @min-[560px]:grid-cols-4 @min-[800px]:grid-cols-5 @min-[1000px]:grid-cols-6">
          {shown.map((s) => (
            <li key={s.id} className="relative">
              <StudentTile
                student={s}
                picking={!!picked}
                picked={!!picked?.includes(s.id)}
                burst={bursts[s.id]}
                onTap={() => tap(s)}
              />
              <Dropdown trigger={['click']} placement="bottomRight" menu={menu(s)}>
                <button
                  type="button"
                  aria-label={`Tùy chọn cho ${s.displayName}`}
                  className="absolute top-1.5 right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#A0A8BA] hover:bg-surface-soft hover:text-ink"
                >
                  <MoreVerticalIcon size={16} />
                </button>
              </Dropdown>
            </li>
          ))}
        </ul>
      ) : (
        <ul aria-label="Danh sách học sinh" className="m-0 mt-3 list-none p-0">
          {shown.map((s) => (
            <li key={s.id} className="flex items-center gap-3 border-b border-line-soft px-2 py-2 last:border-b-0">
              <span className="w-7 text-[15px] font-bold text-ink-muted tabular-nums">{s.rollNumber ?? '–'}</span>
              <img src={studentAvatarSrc(s)} alt="" className="size-9 shrink-0 rounded-full bg-surface-soft" />
              <span className="min-w-0 flex-1 truncate text-[15.5px] font-bold">{s.displayName}</span>
              <span className="flex w-[110px] items-center justify-center gap-1.5 font-extrabold tabular-nums" title="Sao tuần này">
                <FilledStarIcon size={16} /> {s.weeklyStars}
                <span className="font-semibold text-ink-muted">/ {s.totalStars}</span>
              </span>
              <Button
                size="small"
                shape="round"
                onClick={() => award([s.id], 1)}
                aria-label={`Khen ${s.displayName}`}
                className="h-8 border-0 bg-[#FFF1C2] font-extrabold text-[#7A5600]"
              >
                +1 ⭐
              </Button>
              <Dropdown trigger={['click']} placement="bottomRight" menu={menu(s)}>
                <button
                  type="button"
                  aria-label={`Tùy chọn cho ${s.displayName}`}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ink-muted hover:bg-surface-soft"
                >
                  <MoreVerticalIcon size={17} />
                </button>
              </Dropdown>
            </li>
          ))}
        </ul>
      )}

      {picked && (
        <div
          role="toolbar"
          aria-label="Khen các bạn đã chọn"
          className="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-[16px] bg-[#1A2440] px-4 py-2.5 text-white shadow-[0_10px_30px_rgba(26,36,64,0.3)]"
        >
          <span className="mr-auto text-[14.5px]">
            ☑ Đã chọn <b>{picked.length} bạn</b>
          </span>
          <PickButton disabled={!picked.length} onClick={() => award(picked, 1)}>
            +1 ⭐
          </PickButton>
          <PickButton disabled={!picked.length} onClick={() => award(picked, 2)}>
            +2 ⭐
          </PickButton>
          <button
            type="button"
            onClick={() => setPicked(picked.length === shown.length ? [] : shown.map((s) => s.id))}
            className="h-9 cursor-pointer rounded-full border-0 bg-white/15 px-3.5 font-[inherit] text-[13.5px] font-extrabold text-white"
          >
            {picked.length === shown.length ? 'Bỏ chọn' : 'Chọn cả lớp'}
          </button>
        </div>
      )}
    </section>
  )
}

interface StudentTileProps {
  student: StudentResponse
  /** "Khen nhiều bạn" is on: a tap picks the student. */
  picking: boolean
  picked: boolean
  burst?: { points: number; key: number }
  onTap: () => void
}

function StudentTile({ student: s, picking, picked, burst, onTap }: StudentTileProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={picking ? `Chọn ${s.displayName}` : `Khen ${s.displayName}`}
      aria-pressed={picking ? picked : undefined}
      className={`group relative flex w-full cursor-pointer flex-col items-center gap-1 rounded-[18px] border-2 bg-white px-1.5 pt-3 pb-2.5 font-[inherit] text-ink transition active:scale-[0.97] ${
        picked ? 'border-primary bg-primary-soft/40' : burst ? 'border-[#FFC94D] shadow-[0_0_0_4px_#FFF1C2]' : 'border-[#EDF1F7] hover:border-[#C9D9F5]'
      }`}
    >
      {burst && (
        <span
          key={burst.key}
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 animate-[star-pop_900ms_ease-out_forwards] rounded-full bg-[#FFC94D] px-2.5 py-0.5 text-[13px] font-black text-[#6B4400] shadow-[0_4px_10px_rgba(242,140,40,0.35)]"
        >
          {burst.points > 0 ? `+${burst.points}` : burst.points} ⭐
        </span>
      )}
      {picking && (
        <span
          aria-hidden="true"
          className={`absolute top-2 left-2 flex size-5 items-center justify-center rounded-md border-2 text-[12px] font-black ${
            picked ? 'border-primary bg-primary text-white' : 'border-line bg-white'
          }`}
        >
          {picked && '✓'}
        </span>
      )}
      <img src={studentAvatarSrc(s)} alt="" className="size-12 rounded-full bg-surface-soft @min-[560px]:size-14" />
      <span className="line-clamp-2 min-h-[2.4em] text-[13.5px] leading-tight font-black @min-[560px]:min-h-0 @min-[560px]:truncate @min-[560px]:text-[14.5px]">
        {s.displayName}
      </span>
      <span
        className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13.5px] font-black tabular-nums ${
          s.weeklyStars > 0 ? 'bg-[#FFF4D6] text-[#B26B00]' : 'bg-chip text-ink-muted'
        } ${picking ? '' : 'group-hover:hidden'}`}
      >
        <FilledStarIcon size={14} /> {s.weeklyStars}
      </span>
      {!picking && (
        <span aria-hidden="true" className="hidden rounded-full bg-[#F28C28] px-2.5 py-0.5 text-[13.5px] font-black text-white group-hover:block">
          +1 ⭐
        </span>
      )}
    </button>
  )
}

function PickButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 cursor-pointer rounded-full border-0 bg-[#F28C28] px-4 font-[inherit] text-[14px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}
