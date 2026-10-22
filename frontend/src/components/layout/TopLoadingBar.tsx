import { useEffect, useRef, useState } from 'react'
import { useNavigation } from 'react-router'
import { useLoadingStore } from '@/store/loadingStore'

/** Quick work does not flash the bar: it shows only after this long. */
const SHOW_AFTER_MS = 150

/**
 * A thin bar along the top of the window while a page opens (its code loading) or the app waits for the server:
 * it creeps toward the end, then fills and fades when the work is done.
 */
export function TopLoadingBar() {
  const navigating = useNavigation().state !== 'idle'
  const requests = useLoadingStore((s) => s.pending > 0)
  const busy = navigating || requests
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const shown = useRef(false)

  useEffect(() => {
    if (busy) {
      const show = setTimeout(() => {
        shown.current = true
        setVisible(true)
        setProgress(15)
      }, SHOW_AFTER_MS)
      // Creeps toward 90%, slower and slower: it never claims to be done before it is.
      const creep = setInterval(() => setProgress((p) => (p === 0 ? p : p + (90 - p) * 0.12)), 250)
      return () => {
        clearTimeout(show)
        clearInterval(creep)
      }
    }
    if (!shown.current) return
    shown.current = false
    setProgress(100)
    const hide = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 350)
    return () => clearTimeout(hide)
  }, [busy])

  return (
    <div
      role="progressbar"
      aria-label="Đang tải"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[2000] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}
    >
      <div
        className="h-full rounded-r-full bg-[linear-gradient(90deg,#3563E9,#6E95FF)] shadow-[0_0_8px_rgba(53,99,233,0.6)]"
        style={{ width: `${progress}%`, transition: progress === 0 ? 'none' : 'width 250ms ease-out' }}
      />
    </div>
  )
}
