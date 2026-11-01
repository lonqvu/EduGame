import { useSyncExternalStore } from 'react'

/** A mouse or a trackpad: the screen can be hovered for real (not touch, whose taps fake a hover). */
const FINE_POINTER = '(hover: hover) and (pointer: fine)'

const query = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(FINE_POINTER) : null)

function subscribe(onChange: () => void) {
  const media = query()
  media?.addEventListener('change', onChange)
  return () => media?.removeEventListener('change', onChange)
}

/** Whether hover previews make sense here; false on phones, tablets and touch boards. */
export function useHoverPointer(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false, () => false)
}
