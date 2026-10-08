import { Result } from 'antd'
import { useEffect, type ReactNode } from 'react'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { useClassStore } from '@/store/classStore'

/**
 * Renders the name-picking tools only once the class list is loaded: they take their first slots / wheel entries
 * from it when they mount.
 */
export function ClassListGate({ children }: { children: ReactNode }) {
  const status = useClassStore((s) => s.status)
  const studentCount = useClassStore((s) => s.students.length)
  const load = useClassStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  if (status === 'error') return <LoadError onRetry={() => void load()} />
  if (status !== 'ready') return <PageLoading />
  if (studentCount === 0) {
    return <Result status="info" title="Lớp chưa có học sinh" subTitle="Cô thêm danh sách lớp rồi quay lại nhé." />
  }
  return children
}
