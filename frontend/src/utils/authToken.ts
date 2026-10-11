/**
 * The access token of the signed-in teacher, kept in memory only: page scripts injected through XSS cannot find
 * it in storage, and a reload gets a new one from the refresh token cookie (api/session.ts).
 */
let accessToken: string | null = null

// Older builds kept the token in web storage; drop it.
try {
  window.localStorage.removeItem('edugame.accessToken')
  window.sessionStorage.removeItem('edugame.accessToken')
} catch {
  // Storage blocked: nothing to clean.
}

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}
