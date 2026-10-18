import { beforeEach, describe, expect, it } from 'vitest'
import { useFeedbackStore } from '@/store/feedbackStore'
import { EMPTY_DRAFT } from '@/utils/feedback'

const state = () => useFeedbackStore.getState()

beforeEach(() => useFeedbackStore.setState({ open: false, draft: EMPTY_DRAFT }))

describe('feedbackStore', () => {
  it('keeps what was typed when the dialog closes, until it is sent', () => {
    state().openFeedback()
    state().change({ kind: 'IDEA', message: 'Thêm trò Bingo', rating: 5 })
    state().close()
    expect(state().open).toBe(false)

    state().openFeedback()
    expect(state().draft).toMatchObject({ kind: 'IDEA', message: 'Thêm trò Bingo', rating: 5 })

    state().clear()
    expect(state().draft).toEqual(EMPTY_DRAFT)
  })

  it('opens on a kind, unless a draft is already written', () => {
    state().openFeedback('OTHER')
    expect(state().draft.kind).toBe('OTHER')

    state().change({ kind: 'BUG', message: 'Không lưu được' })
    state().close()
    state().openFeedback('PRAISE')
    expect(state().draft.kind).toBe('BUG')
  })
})
