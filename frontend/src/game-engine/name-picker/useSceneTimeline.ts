import { useEffect, useRef } from 'react'

/** [delay in ms from the start of the round, step] */
export type TimelineStep = [number, () => void]

/**
 * Runs `steps` once while `active` is true; pending steps are cancelled on unmount.
 * Steps always see the latest closures, so they may read fresh props.
 */
export function useSceneTimeline(active: boolean, steps: TimelineStep[]) {
  const stepsRef = useRef(steps)
  useEffect(() => {
    stepsRef.current = steps
  })

  useEffect(() => {
    if (!active) return
    const timers = stepsRef.current.map(([ms], i) => window.setTimeout(() => stepsRef.current[i]?.[1](), ms))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [active])
}
