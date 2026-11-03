import { useSearchParams } from 'react-router'
import { DASHBOARD_PERIODS } from '@/utils/admin'

/** The page of one account. */
export const accountPath = (code: string) => `/admin/accounts/${encodeURIComponent(code)}`

/** The period of an admin page, from ?days= (30 when missing or not offered), and how to change it. */
export function usePeriod() {
  const [params, setParams] = useSearchParams()
  const days = DASHBOARD_PERIODS.find((p) => String(p.days) === params.get('days'))?.days ?? 30
  const setDays = (value: number) => setParams(value === 30 ? {} : { days: String(value) }, { replace: true })
  return { days, setDays }
}
