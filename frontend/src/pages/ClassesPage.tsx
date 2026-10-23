import { App } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { ClassesBanner } from '@/pages/classes/ClassesBanner'
import { ClassFormModal } from '@/pages/classes/ClassFormModal'
import { ClassList } from '@/pages/classes/ClassList'
import { CreateClassCard, TipCard } from '@/pages/classes/ClassSideCards'
import { useClassStore } from '@/store/classStore'
import { useTeacherStore } from '@/store/teacherStore'
import type { CreateClassroomRequest } from '@/types/api'
import { classTitle, countByTab, filterClassrooms, MAX_CLASSROOMS, type ClassTab } from '@/utils/classrooms'

/** /classes — the teacher's classes: create one, find one, open one. */
export function ClassesPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const loadTeacher = useTeacherStore((s) => s.load)
  const status = useClassStore((s) => s.status)
  const classrooms = useClassStore((s) => s.classrooms)
  const currentCode = useClassStore((s) => s.classroomCode)
  const load = useClassStore((s) => s.load)
  const createClassroom = useClassStore((s) => s.createClassroom)

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

  return (
    <div className="flex flex-col gap-5">
      <TopBar />
      <ClassesBanner onCreate={() => setCreating(true)} canCreate={canCreate} />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
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
        />
        <aside className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-1">
          <CreateClassCard classCount={status === 'ready' ? classrooms.length : null} onCreate={() => setCreating(true)} />
          <TipCard />
        </aside>
      </div>

      <ClassFormModal open={creating} classrooms={classrooms} onClose={() => setCreating(false)} onSubmit={create} />
    </div>
  )
}
