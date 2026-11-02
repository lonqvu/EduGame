import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { TopLoadingBar } from '@/components/layout/TopLoadingBar'

/** Around every page: the top loading bar. */
export function AppShell() {
  return (
    <>
      <TopLoadingBar />
      <Outlet />
    </>
  )
}

/** The first page of the app is loading (its code). */
export function AppLoading() {
  const { t } = useTranslation()
  return (
    <div className="flex h-dvh items-center justify-center bg-page">
      <img src="/assets/logo/logo-192.png" alt={t('load.logoLoading')} width={72} height={72} className="animate-pulse" />
    </div>
  )
}
