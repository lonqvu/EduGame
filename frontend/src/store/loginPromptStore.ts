import { create } from 'zustand'
import { isGuest } from '@/store/authStore'

/**
 * Pages only a signed-in teacher has (their data lives on the server), with the name the "Cần đăng nhập" dialog
 * gives them. A visitor plays games, with the sample questions or their own, without an account.
 */
const LOGIN_ONLY: { prefix: string; feature: string }[] = [
  { prefix: '/question-sets', feature: 'Bộ câu hỏi' },
  { prefix: '/classes', feature: 'Quản lý lớp học' },
  { prefix: '/reports', feature: 'Báo cáo' },
  { prefix: '/profile', feature: 'Hồ sơ' },
  { prefix: '/admin', feature: 'Quản trị' },
]

/** "Bộ câu hỏi" for /question-sets/abc; undefined for a page anyone opens. */
export function loginOnlyFeature(pathname: string): string | undefined {
  return LOGIN_ONLY.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.feature
}

interface LoginPromptState {
  /** What the visitor tried to open ("Quản lý lớp học"), while the dialog is open. */
  feature: string | null
  /** Where to go once signed in. */
  target: string
  open: (feature: string, target: string) => void
  close: () => void
}

export const useLoginPromptStore = create<LoginPromptState>()((set) => ({
  feature: null,
  target: '/',
  open: (feature, target) => set({ feature, target }),
  close: () => set({ feature: null }),
}))

/**
 * A visitor asked for something that needs an account: the "Cần đăng nhập" dialog opens and this returns true (the
 * caller does nothing more). Signed in, or a page anyone opens: false.
 *
 * `path` is the page wanted (signed in, the teacher lands there); `feature` names it when it is not a page.
 */
export function needsLogin(path: string, feature = loginOnlyFeature(path.split(/[?#]/)[0])): boolean {
  if (!feature || !isGuest()) return false
  useLoginPromptStore.getState().open(feature, path)
  return true
}
