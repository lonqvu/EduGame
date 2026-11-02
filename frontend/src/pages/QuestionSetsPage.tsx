import { App, Button } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlusIcon } from '@/components/ui/icons'
import { QuestionSetFormModal } from '@/pages/question-sets/QuestionSetFormModal'
import { QuestionSetList } from '@/pages/question-sets/QuestionSetList'
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

/** Cards shown at first, and added by "Xem thêm". */
const PAGE = 12

/** /question-sets — the teacher's question bank: find, create, use, edit, copy, delete sets. */
export function QuestionSetsPage() {
  const { t } = useTranslation()
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
    message.success(t('questionSets.page.created'))
    navigate(`/question-sets/${encodeURIComponent(created.summary.code)}`)
  }

  const totals = totalsOf(sets)
  const full = ready && sets.length >= MAX_SETS

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('questionSets.page.title')}
        text={t('questionSets.page.text') + (ready && sets.length > 0 ? t('questionSets.page.totals', { sets: totals.sets, questions: totals.questions }) : '')}
        actions={
            <Button
              type="primary"
              icon={<PlusIcon size={16} />}
              disabled={full}
              title={full ? t('questionSets.full', { count: MAX_SETS }) : undefined}
              onClick={() => setCreating(true)}
              className="h-11 rounded-full px-5 font-extrabold shadow-[0_6px_16px_rgba(53,99,233,0.3)]"
            >
              {t('questionSets.create')}
            </Button>
        }
      />

      <QuestionSetList
        status={status}
        sets={matching}
        total={sets.length}
        subjectCounts={subjectCounts}
        filters={filters}
        onFiltersChange={changeFilters}
        shown={shown}
        onShowMore={() => setShown((n) => n + PAGE)}
        onCreate={() => setCreating(true)}
        canCreate={!full}
        onRetry={() => void load()}
        onUse={actions.use}
        onEdit={actions.edit}
        onCopy={actions.copy}
        onArchive={actions.archive}
      />

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
