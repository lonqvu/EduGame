import { App } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { QuestionSetFormModal } from '@/pages/question-sets/QuestionSetFormModal'
import { QuestionSetList } from '@/pages/question-sets/QuestionSetList'
import { QuestionSetsBanner } from '@/pages/question-sets/QuestionSetsBanner'
import { CreateSetButton, PopularTopics, QuestionTips, QuickStats } from '@/pages/question-sets/QuestionSetSidebar'
import { useSetActions } from '@/pages/question-sets/useSetActions'
import { useQuestionSetStore } from '@/store/questionSetStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { QuestionSetRequest } from '@/types/api'
import {
  countBySubject,
  filterSets,
  MAX_SETS,
  NO_FILTERS,
  OPEN_CREATE_SET,
  type SetFilters,
  totalsOf,
} from '@/utils/questionSets'

/** Rows shown at first, and added by "Xem thêm". */
const PAGE = 10

/** /question-sets — the teacher's question bank: find, create, use, edit, copy, delete sets. */
export function QuestionSetsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const loadTeacher = useTeacherStore((s) => s.load)
  const status = useQuestionSetStore((s) => s.status)
  const sets = useQuestionSetStore((s) => s.sets)
  const load = useQuestionSetStore((s) => s.load)
  const createSet = useQuestionSetStore((s) => s.create)
  const actions = useSetActions()

  const [filters, setFilters] = useState<SetFilters>(NO_FILTERS)
  const [shown, setShown] = useState(PAGE)
  const [creating, setCreating] = useState(() => (location.state as typeof OPEN_CREATE_SET | null)?.createSet === true)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadTeacher()
    void load()
  }, [loadTeacher, load])

  // The form opened from the state once; drop it so going back or reloading does not open it again.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  const matching = useMemo(() => filterSets(sets, filters), [sets, filters])
  const subjectCounts = useMemo(() => countBySubject(sets), [sets])
  const ready = status === 'ready'
  // A new set starts in the subject and grade the teacher is looking at.
  const newSetDefaults = useMemo(
    () => ({
      subject: filters.subject === 'ALL' ? undefined : filters.subject,
      grade: filters.grade === 'ALL' ? undefined : filters.grade,
    }),
    [filters.subject, filters.grade],
  )

  const changeFilters = (next: SetFilters) => {
    setFilters(next)
    setShown(PAGE)
  }

  const create = async (request: QuestionSetRequest) => {
    const created = await createSet(request)
    message.success('Đã tạo bộ câu hỏi. Cô thêm câu hỏi cho bộ nhé!')
    navigate(`/question-sets/${encodeURIComponent(created.summary.code)}`)
  }

  const manage = () => {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    searchRef.current?.focus({ preventScroll: true })
  }

  return (
    <div className="flex flex-col gap-5">
      <TopBar />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <QuestionSetsBanner onCreate={() => setCreating(true)} onManage={manage} onUse={() => actions.use()} />
          <div ref={listRef} className="scroll-mt-4">
            <QuestionSetList
              ref={searchRef}
              status={status}
              sets={matching}
              total={sets.length}
              subjectCounts={subjectCounts}
              filters={filters}
              onFiltersChange={changeFilters}
              shown={shown}
              onShowMore={() => setShown((n) => n + PAGE)}
              onCreate={() => setCreating(true)}
              onRetry={() => void load()}
              onUse={actions.use}
              onEdit={actions.edit}
              onCopy={actions.copy}
              onArchive={actions.archive}
            />
          </div>
        </div>

        <aside className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-1">
          <div className="flex flex-col gap-5 md:col-span-2 xl:col-span-1">
            <CreateSetButton onCreate={() => setCreating(true)} disabled={ready && sets.length >= MAX_SETS} />
          </div>
          <QuickStats totals={ready ? totalsOf(sets) : null} />
          <PopularTopics
            counts={subjectCounts}
            selected={filters.subject}
            onSelect={(subject) => {
              changeFilters({ ...filters, subject })
              listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />
          <div className="md:col-span-2 xl:col-span-1">
            <QuestionTips />
          </div>
        </aside>
      </div>

      <QuestionSetFormModal
        open={creating}
        defaults={newSetDefaults}
        onClose={() => setCreating(false)}
        onSubmit={create}
      />
      {actions.dialogs}
    </div>
  )
}
