import { Result } from 'antd'
import { useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { useTeacherStore } from '@/store/teacherStore'

/** Routes inside are for admins; a teacher who opens one is told so (the API refuses them anyway). */
export function RequireAdmin() {
  const teacher = useTeacherStore((s) => s.teacher)
  const status = useTeacherStore((s) => s.status)
  const load = useTeacherStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  if (!teacher) return status === 'error' ? <LoadError onRetry={() => void load()} /> : <PageLoading />
  if (!teacher.isAdmin) {
    return (
      <Result
        status="403"
        title="Trang dành cho quản trị viên"
        subTitle="Tài khoản của cô chưa có quyền quản trị."
        extra={
          <Link to="/" className="font-bold">
            Về trang chủ
          </Link>
        }
      />
    )
  }
  return <Outlet />
}
