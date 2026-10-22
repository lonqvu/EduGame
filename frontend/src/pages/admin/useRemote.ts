import { useEffect, useState } from 'react'

/**
 * Data of an admin page, loaded for `key` (what the URL asks for). A new key keeps the old data on screen (dimmed by
 * the page) until the new one arrives; a request that is no longer wanted is cancelled.
 */
export function useRemote<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ key: string; data?: T; error?: unknown }>()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => setState({ key, data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState((current) => ({ key, data: current?.data, error }))
      })
    return () => controller.abort()
    // `key` says everything `load` reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  return {
    data: state?.data,
    loading: state?.key !== key,
    error: state?.key === key ? state.error : undefined,
    reload: () => setAttempt((n) => n + 1),
    /** After a change answered by the server: show its answer at once. */
    replace: (data: T) => setState({ key, data }),
  }
}
