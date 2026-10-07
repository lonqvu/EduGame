import { Input, Modal } from 'antd'
import { useState } from 'react'
import { parseBulkQuestions } from '@/editor/parseBulkQuestions'
import type { Question } from '@/types/game'

interface BulkPasteModalProps {
  open: boolean
  onClose: () => void
  onAdd: (drafts: Omit<Question, 'id'>[]) => void
}

const PLACEHOLDER = 'Con gì kêu meo meo? = Con mèo\n25 + 13 = ? = 38\nThủ đô của Việt Nam? = Hà Nội'

export function BulkPasteModal({ open, onClose, onAdd }: BulkPasteModalProps) {
  const [text, setText] = useState('')
  const drafts = parseBulkQuestions(text, 20)

  const submit = () => {
    onAdd(drafts)
    setText('')
    onClose()
  }

  return (
    <Modal
      open={open}
      title={<span className="font-display text-2xl font-extrabold">Dán nhiều câu hỏi</span>}
      okText={drafts.length ? `Thêm ${drafts.length} câu` : 'Thêm câu hỏi'}
      cancelText="Hủy"
      okButtonProps={{ disabled: drafts.length === 0 }}
      onOk={submit}
      onCancel={onClose}
      width={640}
    >
      <p className="mb-3 text-ink-soft">Mỗi dòng một câu. Đáp án đặt sau dấu “=”.</p>
      <Input.TextArea
        aria-label="Danh sách câu hỏi"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        autoSize={{ minRows: 6, maxRows: 14 }}
        className="text-lg"
      />
    </Modal>
  )
}
