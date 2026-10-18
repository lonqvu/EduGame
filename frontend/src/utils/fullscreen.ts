/**
 * Full screen for the projector ("Cài đặt" → Toàn màn hình khi bắt đầu trò chơi). Browsers only allow it from a
 * click, so it is asked for in the click on "Bắt đầu trò chơi"; the app leaves it again when the teacher goes back
 * to the teacher screens, but never leaves a full screen the teacher entered by hand (F11 is not seen here anyway).
 */
let enteredByApp = false

export function enterFullscreen() {
  const root = document.documentElement
  if (document.fullscreenElement || !document.fullscreenEnabled || !root.requestFullscreen) return
  root
    .requestFullscreen()
    .then(() => {
      enteredByApp = true
    })
    // Refused (no click, an iframe without permission...): the game simply opens in the window.
    .catch(() => undefined)
}

export function leaveAppFullscreen() {
  if (!enteredByApp) return
  enteredByApp = false
  if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen().catch(() => undefined)
}

/** Projector and classroom tool screens: the ones full screen is for. */
export const isProjectorPath = (pathname: string) => /^\/(play|tools)\//.test(pathname)
