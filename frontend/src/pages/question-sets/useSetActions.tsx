import { App } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import * as questionSetApi from '@/api/questionSetApi'
import { QuestionSetFormModal } from '@/pages/question-sets/QuestionSetFormModal'
import { UseSetModal } from '@/pages/question-sets/UseSetModal'
import { useQuestionSetStore } from '@/store/questionSetStore'
import type { QuestionSetResponse, QuestionSetSummaryResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'

interface Options {
  /** A set was edited (its page shows the new details). */
  onEdited?: (set: QuestionSetResponse) => void
  /** Where to go after deleting a set; stays on the page when absent. */
  afterArchive?: string
}

/**
 * What the teacher can do with a set, on the list and on its page: use it in a game, edit its details, copy it,
 * delete it. Returns the handlers and the dialogs to render.
 */
export function useSetActions({ onEdited, afterArchive }: Options = {}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const sets = useQuestionSetStore((s) => s.sets)
  const update = useQuestionSetStore((s) => s.update)
  const copySet = useQuestionSetStore((s) => s.copy)
  const archiveSet = useQuestionSetStore((s) => s.archive)
  const upsert = useQuestionSetStore((s) => s.upsert)

  const [using, setUsing] = useState<{ code?: string } | null>(null)
  const [editing, setEditing] = useState<QuestionSetSummaryResponse>()

  const copy = async (set: QuestionSetSummaryResponse) => {
    try {
      const copied = await copySet(set.code)
      message.success(t('questionSets.actions.copied', { title: copied.summary.title }))
      navigate(`/question-sets/${encodeURIComponent(copied.summary.code)}`)
    } catch (error) {
      message.error(apiErrorMessage(error))
    }
  }

  const archive = (set: QuestionSetSummaryResponse) =>
    modal.confirm({
      title: t('questionSets.actions.deleteConfirm', { title: set.title }),
      content: set.useCount > 0 ? t('questionSets.actions.deleteUsed') : t('questionSets.actions.deleteText'),
      okText: t('questionSets.delete'),
      okButtonProps: { danger: true },
      cancelText: t('questionSets.keep'),
      onOk: async () => {
        try {
          await archiveSet(set.code)
          message.success(t('questionSets.actions.deleted', { title: set.title }))
          if (afterArchive) navigate(afterArchive)
        } catch (error) {
          message.error(apiErrorMessage(error))
        }
      },
    })

  /** The set's counts changed after a game was made from it. */
  const refreshSet = async (code: string) => {
    try {
      upsert((await questionSetApi.getQuestionSet(code)).summary)
    } catch {
      // The list catches up on its next load.
    }
  }

  const dialogs = (
    <>
      <UseSetModal
        open={!!using}
        sets={sets}
        presetCode={using?.code}
        onClose={() => setUsing(null)}
        onUsed={(code) => void refreshSet(code)}
      />
      <QuestionSetFormModal
        open={!!editing}
        set={editing}
        onClose={() => setEditing(undefined)}
        onSubmit={async (request) => {
          const saved = await update(editing!.code, request)
          onEdited?.(saved)
          message.success(t('questionSets.actions.saved'))
        }}
      />
    </>
  )

  return {
    /** Use this set, or pick one in the dialog. */
    use: (set?: QuestionSetSummaryResponse) => setUsing({ code: set?.code }),
    edit: setEditing,
    copy: (set: QuestionSetSummaryResponse) => void copy(set),
    archive,
    dialogs,
  }
}
