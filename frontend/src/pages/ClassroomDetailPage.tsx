import { App, Button, Dropdown } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router'
import { BackBar } from '@/components/layout/PageHeader'
import { CheckIcon, GamepadIcon, MoreVerticalIcon, PencilIcon, PlayIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { ClassFormModal } from '@/pages/classes/ClassFormModal'
import { AnimalAvatar, StatusChip } from '@/pages/classes/classUi'
import { ImportStudentsModal } from '@/pages/classes/ImportStudentsModal'
import { AddStudentsModal, RenameStudentModal } from '@/pages/classes/StudentModals'
import { StudentsCard } from '@/pages/classes/StudentsCard'
import { useClassroomDetail } from '@/pages/classes/useClassroomDetail'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useClassStore } from '@/store/classStore'
import type { ClassroomResponse, CreateClassroomRequest, StudentResponse, UpdateClassroomRequest } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { classAvatar, classTitle } from '@/utils/classrooms'
import { relativeTimeLabel } from '@/utils/dateLabels'

/** /classes/:code — a class: its details and numbers, pause or delete it, and its class list. */
export function ClassroomDetailPage() {
  const { t } = useTranslation()
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const detail = useClassroomDetail(code)
  const { classroom, students } = detail
  const classrooms = useClassStore((s) => s.classrooms)
  const currentCode = useClassStore((s) => s.classroomCode)
  const select = useClassStore((s) => s.select)
  const updateClassroom = useClassStore((s) => s.updateClassroom)
  const archiveClassroom = useClassStore((s) => s.archiveClassroom)
  const loadClasses = useClassStore((s) => s.load)

  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<StudentResponse>()
  // "Tạo lớp và nhập danh sách": the new class opens with the import dialog.
  const location = useLocation()
  const [importing, setImporting] = useState(() => (location.state as { importList?: boolean } | null)?.importList === true)

  // Which class is being taught, and the other classes (names already taken), when the page is opened directly.
  useEffect(() => {
    if (useClassStore.getState().status === 'idle') void loadClasses()
  }, [loadClasses])

  if (detail.status === 'missing') return <NotFoundPage message={t('classes.detail.missing')} />
  if (detail.status === 'error') return <LoadError onRetry={detail.reload} />
  if (detail.status === 'loading' || !classroom) return <PageLoading />

  const title = classTitle(classroom.name)
  const paused = classroom.status === 'PAUSED'
  const current = classroom.code === currentCode

  const update = async (request: UpdateClassroomRequest) => {
    const saved = await updateClassroom(classroom.code, request)
    detail.setClassroom(saved)
    return saved
  }

  const setStatus = async (status: ClassroomResponse['status']) => {
    try {
      await update({ status })
      message.success(t(status === 'PAUSED' ? 'classes.done.paused' : 'classes.done.resumed', { name: title }))
    } catch (error) {
      message.error(apiErrorMessage(error))
    }
  }

  const playWithClass = async () => {
    try {
      if (!current) await select(classroom.code)
      navigate('/games/new')
    } catch (error) {
      message.error(apiErrorMessage(error))
    }
  }

  const teachThisClass = async () => {
    try {
      await select(classroom.code)
      message.success(t('classes.done.teaching', { name: title }))
    } catch (error) {
      message.error(apiErrorMessage(error))
    }
  }

  const confirmArchive = () =>
    modal.confirm({
      title: t('classes.deleteConfirm', { name: title }),
      content: t('classes.deleteText'),
      okText: t('classes.delete'),
      okButtonProps: { danger: true },
      cancelText: t('classes.keep'),
      onOk: async () => {
        try {
          await archiveClassroom(classroom.code)
          message.success(t('classes.done.deleted', { name: title }))
          navigate('/classes')
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  const confirmRemove = (student: StudentResponse) =>
    modal.confirm({
      title: t('classes.detail.removeConfirm', { name: student.displayName }),
      content: t('classes.detail.removeText'),
      okText: t('classes.detail.remove'),
      okButtonProps: { danger: true },
      cancelText: t('classes.keep'),
      onOk: async () => {
        try {
          await detail.removeStudent(student.id)
          message.success(t('classes.detail.removed', { name: student.displayName }))
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  const confirmSort = () =>
    modal.confirm({
      title: t('classes.detail.sortConfirm'),
      content: t('classes.detail.sortText'),
      okText: t('classes.detail.sort'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await detail.sortStudentsByName()
          message.success(t('classes.detail.sorted'))
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  const details = [
    t('classes.grade', { grade: classroom.grade }),
    classroom.schoolName,
    classroom.schoolYear && t('classes.schoolYear', { year: classroom.schoolYear }),
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-5">
      <BackBar to="/classes" label={t('classes.detail.back')} />

      <section className="@container flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[22px] bg-white p-5 sm:p-6">
        <AnimalAvatar avatar={classAvatar(classroom)} size={76} className="rounded-[22px]" />
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="m-0 text-[28px] leading-tight font-black">{title}</h1>
            {paused && <StatusChip status={classroom.status} />}
            {current && (
              <span className="flex items-center gap-1 rounded-full bg-[#E2F6E8] px-2.5 py-0.5 text-[12.5px] font-extrabold text-success">
                <CheckIcon size={13} /> {t('classes.teaching')}
              </span>
            )}
          </div>
          <p className="m-0 text-[15px] text-ink-muted">{[t('classes.studentCount', { count: classroom.studentCount }), ...details].join(' · ')}</p>
        </div>
        <div className="flex w-full items-center gap-2.5 @min-[760px]:w-auto">
          <Button
            type="primary"
            icon={<GamepadIcon size={19} />}
            disabled={paused}
            onClick={() => void playWithClass()}
            className="h-11 flex-1 rounded-[12px] px-5 font-extrabold @min-[760px]:flex-none"
          >
            {t('classes.play')}
          </Button>
          <Button icon={<PencilIcon size={17} />} onClick={() => setEditing(true)} className="h-11 rounded-[12px] font-bold">
            {t('classes.edit')}
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                ...(!paused && !current
                  ? [{ key: 'teach', icon: <CheckIcon size={16} />, label: t('classes.teachLong'), onClick: () => void teachThisClass() }]
                  : []),
                paused
                  ? { key: 'resume', label: t('classes.resumeClass'), onClick: () => void setStatus('ACTIVE') }
                  : { key: 'pause', label: t('classes.pause'), onClick: () => void setStatus('PAUSED') },
                { type: 'divider' },
                { key: 'archive', label: t('classes.delete'), danger: true, onClick: confirmArchive },
              ],
            }}
          >
            <Button aria-label={t('common.more')} icon={<MoreVerticalIcon size={19} />} className="size-11 rounded-[12px]" />
          </Dropdown>
        </div>
      </section>

      {paused && (
        <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] border border-sun-soft bg-sun-pale px-5 py-3.5">
          <p className="m-0 flex-1 text-[15px] text-sun-ink">
            <Trans i18nKey="classes.detail.pausedNotice" components={{ b: <strong /> }} />
          </p>
          <Button icon={<PlayIcon size={16} />} onClick={() => void setStatus('ACTIVE')} className="rounded-full font-bold">
            {t('classes.resume')}
          </Button>
        </div>
      )}

      <ClassNumbers classroom={classroom} students={students} />

      <StudentsCard
        students={students}
        onAdd={() => setAdding(true)}
        onImport={() => setImporting(true)}
        onRename={setRenaming}
        onRemove={confirmRemove}
        onSortByName={confirmSort}
        onAward={detail.awardStars}
      />

      <ClassFormModal
        open={editing}
        classroom={classroom}
        classrooms={classrooms}
        onClose={() => setEditing(false)}
        onSubmit={async (values: CreateClassroomRequest) => {
          await update(values)
          message.success(t('classes.done.saved'))
        }}
      />
      <AddStudentsModal
        open={adding}
        studentCount={students.length}
        onClose={() => setAdding(false)}
        onAdd={detail.addStudents}
      />
      <ImportStudentsModal
        open={importing}
        classTitle={title}
        inClass={students.map((s) => s.displayName)}
        onClose={() => {
          setImporting(false)
          // Do not open it again on reload or "back".
          if (location.state) navigate(location.pathname, { replace: true, state: null })
        }}
        onAdd={detail.addStudents}
      />
      <RenameStudentModal student={renaming} onClose={() => setRenaming(undefined)} onRename={detail.renameStudent} />
    </div>
  )
}

/** What the teacher wants to know about the class this week: its stars, who shines, who is waiting, the last game. */
function ClassNumbers({ classroom, students }: { classroom: ClassroomResponse; students: StudentResponse[] }) {
  const { t } = useTranslation()
  const top = students.reduce<StudentResponse | undefined>((best, s) => (s.weeklyStars > (best?.weeklyStars ?? 0) ? s : best), undefined)
  const waiting = students.filter((s) => s.weeklyStars <= 0).length
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Tile icon="⭐" tint="#FFF4D6" value={String(classroom.weeklyStars)} hint={t('classes.detail.starsHint')} />
      <Tile
        icon="🏆"
        tint="#E2F6E8"
        value={top ? top.displayName : t('classes.detail.noneYet')}
        hint={top ? t('classes.detail.topHint', { count: top.weeklyStars }) : t('classes.detail.topHintNone')}
      />
      <Tile
        icon="🙋"
        tint="#FDE7EC"
        value={students.length ? t('classes.detail.waiting', { count: waiting }) : '–'}
        hint={waiting ? t('classes.detail.waitingHint') : students.length ? t('classes.detail.allPraised') : t('classes.detail.noStudents')}
      />
      <Tile
        icon="🎮"
        tint="#E8EFFD"
        value={relativeTimeLabel(classroom.lastPlayedAt) || t('classes.detail.neverPlayed')}
        hint={classroom.lastPlayedAt ? t('classes.detail.lastPlayedHint') : t('classes.detail.startHint')}
      />
    </div>
  )
}

function Tile({ icon, tint, value, hint }: { icon: string; tint: string; value: string; hint: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[18px] bg-white p-3.5 sm:p-4">
      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[14px] text-[22px]" style={{ background: tint }}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 text-[17px] leading-tight font-black break-words sm:text-[22px]">{value}</span>
        <span className="text-[12.5px] leading-snug text-ink-muted">{hint}</span>
      </span>
    </div>
  )
}
