import { Outlet } from 'react-router'

/** Teacher screens: soft page background with a centered 1200px column. */
export function MainLayout() {
  return (
    <div className="min-h-full bg-page text-ink">
      <div className="mx-auto flex max-w-[1200px] flex-col px-4 pt-7 pb-12 sm:px-8">
        <Outlet />
      </div>
    </div>
  )
}
