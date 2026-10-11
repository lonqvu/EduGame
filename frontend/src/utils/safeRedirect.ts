/** Pages that make no sense to come back to once signed in. */
const AUTH_PAGES = ['/login', '/register', '/forgot-password']

/** Where to go once signed in: the page that sent us to /login, only if it is a path of this app. */
export function safeRedirect(from: string | null): string {
  return from && from.startsWith('/') && !from.startsWith('//') && !AUTH_PAGES.some((page) => from.startsWith(page))
    ? from
    : '/'
}
