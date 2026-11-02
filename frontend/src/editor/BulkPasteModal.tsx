import { Input, Modal } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EditorDefinition } from '@/editor/editorDefinitions'
import type { ItemDraft } from '@/types/game'

interface BulkPasteModalProps {
  open: boolean
  paste: EditorDefinition['paste']
  /** "3 câu hỏi" */
  count: EditorDefinition['count']
  onClose: () => void
  onAdd: (drafts: ItemDraft[]) => void
}

export function BulkPasteModal({ open, paste, count, onClose, onAdd }: BulkPasteModalProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const drafts = paste.parse(text)

  const submit = () => {
    onAdd(drafts)
    setText('')
    onClose()
  }

  return (
    <Modal
      open={open}
      title={<span className="font-display text-2xl font-extrabold">{paste.title}</span>}
      okText={drafts.length ? t('editor.paste.add', { items: count(drafts.length) }) : t('editor.paste.addNone')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: drafts.length === 0 }}
      onOk={submit}
      onCancel={onClose}
      width={640}
    >
      <p className="mb-3 text-ink-soft">{paste.hint}</p>
      <Input.TextArea
        aria-label={t('editor.paste.label')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={paste.placeholder}
        autoSize={{ minRows: 6, maxRows: 14 }}
        className="text-lg"
      />
    </Modal>
  )
}
