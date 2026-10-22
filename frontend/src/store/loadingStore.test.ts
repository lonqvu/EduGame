import { beforeEach, describe, expect, it } from 'vitest'
import { useLoadingStore } from '@/store/loadingStore'

describe('loadingStore', () => {
  beforeEach(() => useLoadingStore.setState({ pending: 0 }))

  it('counts the work in progress, never under zero', () => {
    const { begin, end } = useLoadingStore.getState()
    begin()
    begin()
    end()
    expect(useLoadingStore.getState().pending).toBe(1)
    end()
    end()
    expect(useLoadingStore.getState().pending).toBe(0)
  })
})
