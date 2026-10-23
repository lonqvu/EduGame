import { App, Button, Dropdown } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
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

  if (detail.status === 'missing') return <NotFoundPage message="Không tìm thấy lớp học này (có thể đã bị xóa)." />
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
      message.success(status === 'PAUSED' ? `${title} đã tạm ngưng` : `${title} đã hoạt động trở lại`)
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
      message.success(`Từ giờ trò chơi và sao thưởng dùng danh sách ${title}`)
    } catch (error) {
      message.error(apiErrorMessage(error))
    }
  }

  const confirmArchive = () =>
    modal.confirm({
      title: `Xóa ${title}?`,
      content: 'Lớp sẽ không còn trong danh sách của cô. Sao thưởng và kết quả cũ của các em vẫn được lưu lại.',
      okText: 'Xóa lớp',
      okButtonProps: { danger: true },
      cancelText: 'Giữ lại',
      onOk: async () => {
        try {
          await archiveClassroom(classroom.code)
          message.success(`Đã xóa ${title}`)
          navigate('/classes')
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  const confirmRemove = (student: StudentResponse) =>
    modal.confirm({
      title: `Xóa ${student.displayName} khỏi lớp?`,
      content: 'Sao thưởng của em vẫn được giữ trong lịch sử.',
      okText: 'Xóa khỏi lớp',
      okButtonProps: { danger: true },
      cancelText: 'Giữ lại',
      onOk: async () => {
        try {
          await detail.removeStudent(student.id)
          message.success(`Đã xóa ${student.displayName} khỏi lớp`)
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  const confirmSort = () =>
    modal.confirm({
      title: 'Xếp lại danh sách theo tên?',
      content: 'Số thứ tự của các em được đánh lại theo tên (A → Z), như sổ điểm danh.',
      okText: 'Xếp theo tên',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await detail.sortStudentsByName()
          message.success('Đã xếp danh sách theo tên')
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  const details = [
    `Khối ${classroom.grade}`,
    classroom.schoolName,
    classroom.schoolYear && `Năm học ${classroom.schoolYear}`,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/classes" label="Danh sách lớp học" />

      <section className="@container flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[22px] bg-white p-5 sm:p-6">
        <AnimalAvatar avatar={classAvatar(classroom)} size={76} className="rounded-[22px]" />
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="m-0 text-[28px] leading-tight font-black">{title}</h1>
            {paused && <StatusChip status={classroom.status} />}
            {current && (
              <span className="flex items-center gap-1 rounded-full bg-[#E2F6E8] px-2.5 py-0.5 text-[12.5px] font-extrabold text-success">
                <CheckIcon size={13} /> Đang dạy
              </span>
            )}
          </div>
          <p className="m-0 text-[15px] text-ink-muted">{[`${classroom.studentCount} học sinh`, ...details].join(' · ')}</p>
        </div>
        <div className="flex w-full items-center gap-2.5 @min-[760px]:w-auto">
          <Button
            type="primary"
            icon={<GamepadIcon size={19} />}
            disabled={paused}
            onClick={() => void playWithClass()}
            className="h-11 flex-1 rounded-[12px] px-5 font-extrabold @min-[760px]:flex-none"
          >
            Chơi cùng lớp
          </Button>
          <Button icon={<PencilIcon size={17} />} onClick={() => setEditing(true)} className="h-11 rounded-[12px] font-bold">
            Sửa lớp
          </Button>
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                ...(!paused && !current
                  ? [{ key: 'teach', icon: <CheckIcon size={16} />, label: 'Dạy lớp này (dùng ở trang chủ)', onClick: () => void teachThisClass() }]
                  : []),
                paused
                  ? { key: 'resume', label: 'Kích hoạt lại lớp', onClick: () => void setStatus('ACTIVE') }
                  : { key: 'pause', label: 'Tạm ngưng lớp', onClick: () => void setStatus('PAUSED') },
                { type: 'divider' },
                { key: 'archive', label: 'Xóa lớp', danger: true, onClick: confirmArchive },
              ],
            }}
          >
            <Button aria-label="Thêm thao tác" icon={<MoreVerticalIcon size={19} />} className="size-11 rounded-[12px]" />
          </Dropdown>
        </div>
      </section>

      {paused && (
        <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] border border-sun-soft bg-sun-pale px-5 py-3.5">
          <p className="m-0 flex-1 text-[15px] text-sun-ink">
            <strong>Lớp đang tạm ngưng.</strong> Cô chưa chơi trò chơi với lớp này được; danh sách và sao của các em vẫn được giữ.
          </p>
          <Button icon={<PlayIcon size={16} />} onClick={() => void setStatus('ACTIVE')} className="rounded-full font-bold">
            Kích hoạt lại
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
          message.success('Đã lưu thông tin lớp')
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
  const top = students.reduce<StudentResponse | undefined>((best, s) => (s.weeklyStars > (best?.weeklyStars ?? 0) ? s : best), undefined)
  const waiting = students.filter((s) => s.weeklyStars <= 0).length
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Tile icon="⭐" tint="#FFF4D6" value={String(classroom.weeklyStars)} hint="sao tuần này của lớp" />
      <Tile
        icon="🏆"
        tint="#E2F6E8"
        value={top ? top.displayName : 'Chưa có'}
        hint={top ? `được khen nhiều nhất (${top.weeklyStars} ⭐)` : 'bạn được khen nhiều nhất'}
      />
      <Tile
        icon="🙋"
        tint="#FDE7EC"
        value={students.length ? `${waiting} bạn` : '–'}
        hint={waiting ? 'chưa được khen tuần này' : students.length ? 'cả lớp đã được khen!' : 'chưa có học sinh nào'}
      />
      <Tile
        icon="🎮"
        tint="#E8EFFD"
        value={relativeTimeLabel(classroom.lastPlayedAt) || 'Chưa chơi'}
        hint={classroom.lastPlayedAt ? 'lần chơi gần nhất' : 'mở một trò chơi để bắt đầu'}
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
