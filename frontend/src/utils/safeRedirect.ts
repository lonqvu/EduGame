/** Pages that make no sense to come back to once signed in. */
const AUTH_PAGES = ['/login', '/register', '/forgot-password']

/**
 * Browsers read "\" as "/" and drop tabs / line breaks in URLs, so "/\evil.com" or "/\t/evil.com" would mean
 * "//evil.com", another site.
 */
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\\\u0000-\u001F\u007F]/

/** Where to go once signed in: the page that sent us to /login, only if it is a path of this app. */
export function safeRedirect(from: string | null): string {
  return from &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    !UNSAFE.test(from) &&
    !AUTH_PAGES.some((page) => from.startsWith(page))
    ? from
    : '/'
}
