import { App, Button } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlusIcon } from '@/components/ui/icons'
import { ClassFormModal } from '@/pages/classes/ClassFormModal'
import { ClassList } from '@/pages/classes/ClassList'
import { useClassStore } from '@/store/classStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { ClassroomResponse, CreateClassroomRequest } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { classTitle, countByTab, filterClassrooms, MAX_CLASSROOMS, type ClassTab } from '@/utils/classrooms'

/** /classes — the teacher's classes: pick the one being taught, play with one, open one, create one. */
export function ClassesPage() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const loadTeacher = useTeacherStore((s) => s.load)
  const status = useClassStore((s) => s.status)
  const classrooms = useClassStore((s) => s.classrooms)
  const currentCode = useClassStore((s) => s.classroomCode)
  const load = useClassStore((s) => s.load)
  const select = useClassStore((s) => s.select)
  const createClassroom = useClassStore((s) => s.createClassroom)
  const updateClassroom = useClassStore((s) => s.updateClassroom)
  const archiveClassroom = useClassStore((s) => s.archiveClassroom)

  const [tab, setTab] = useState<ClassTab>('ALL')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void loadTeacher()
    void load()
  }, [loadTeacher, load])

  const shown = useMemo(() => filterClassrooms(classrooms, tab, search), [classrooms, tab, search])
  const counts = useMemo(() => countByTab(classrooms), [classrooms])
  const canCreate = status === 'ready' && classrooms.length < MAX_CLASSROOMS

  const create = async (request: CreateClassroomRequest, importList: boolean) => {
    const created = await createClassroom(request)
    message.success(`Đã tạo ${classTitle(created.name)}. Cô thêm học sinh cho lớp nhé!`)
    // The class page opens the file import right away when asked.
    navigate(`/classes/${encodeURIComponent(created.code)}`, { state: { importList } })
  }

  const run = async (task: () => Promise<unknown>, done?: string) => {
    try {
      await task()
      if (done) message.success(done)
    } catch (error) {
      message.error(apiErrorMessage(error))
    }
  }

  const actions = {
    teach: (c: ClassroomResponse) => void run(() => select(c.code), `Từ giờ trò chơi và sao thưởng dùng danh sách ${classTitle(c.name)}`),
    play: (c: ClassroomResponse) =>
      void run(async () => {
        if (c.code !== currentCode) await select(c.code)
        navigate('/games/new')
      }),
    setStatus: (c: ClassroomResponse, next: ClassroomResponse['status']) =>
      void run(
        () => updateClassroom(c.code, { status: next }),
        next === 'PAUSED' ? `${classTitle(c.name)} đã tạm ngưng` : `${classTitle(c.name)} đã hoạt động trở lại`,
      ),
    archive: (c: ClassroomResponse) =>
      modal.confirm({
        title: `Xóa ${classTitle(c.name)}?`,
        content: 'Lớp sẽ không còn trong danh sách của cô. Sao thưởng và kết quả cũ của các em vẫn được lưu lại.',
        okText: 'Xóa lớp',
        okButtonProps: { danger: true },
        cancelText: 'Giữ lại',
        onOk: () => run(() => archiveClassroom(c.code), `Đã xóa ${classTitle(c.name)}`),
      }),
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Lớp học của cô"
        text="Chọn lớp đang dạy, xem học sinh và khen thưởng"
        actions={
            <Button
              type="primary"
              icon={<PlusIcon size={16} />}
              disabled={!canCreate}
              title={status === 'ready' && !canCreate ? `Cô đã có ${MAX_CLASSROOMS} lớp` : undefined}
              onClick={() => setCreating(true)}
              className="h-11 rounded-full px-5 font-extrabold shadow-[0_6px_16px_rgba(53,99,233,0.3)]"
            >
              Tạo lớp học
            </Button>
        }
      />

      <ClassList
        status={status}
        classrooms={shown}
        counts={counts}
        tab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
        currentCode={currentCode}
        onCreate={() => setCreating(true)}
        onRetry={() => void load()}
        actions={actions}
      />

      <ClassFormModal open={creating} classrooms={classrooms} onClose={() => setCreating(false)} onSubmit={create} />
    </div>
  )
}
