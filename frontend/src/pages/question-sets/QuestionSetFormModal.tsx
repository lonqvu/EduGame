import { App, Form, Input, Modal, Select } from 'antd'
import { useEffect, useState } from 'react'
import type { QuestionSetRequest, QuestionSetSummaryResponse, SubjectCode } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { MAX_DESCRIPTION, MAX_TITLE, SUBJECTS } from '@/utils/questionSets'

/** 0 = "Mọi khối" (no grade). */
const GRADES = [{ value: 0, label: 'Mọi khối' }, ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Lớp ${i + 1}` }))]

interface FormValues {
  title: string
  subject: SubjectCode
  grade: number
  description: string
}

interface QuestionSetFormModalProps {
  open: boolean
  /** The set being edited; none to create one. */
  set?: QuestionSetSummaryResponse
  /** Subject and grade a new set starts with (the filters the teacher is looking at). */
  defaults?: { subject?: SubjectCode; grade?: number }
  onClose: () => void
  /** Saves; rejects with the API error to show. */
  onSubmit: (request: QuestionSetRequest) => Promise<unknown>
}

/** Create a set, or edit its title, subject, grade and description. */
export function QuestionSetFormModal({ open, set, defaults, onClose, onSubmit }: QuestionSetFormModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue(
      set
        ? { title: set.title, subject: set.subject, grade: set.grade ?? 0, description: set.description ?? '' }
        : { title: '', subject: defaults?.subject ?? 'TOAN', grade: defaults?.grade ?? 0, description: '' },
    )
  }, [open, set, defaults, form])

  const submit = async (values: FormValues) => {
    setSaving(true)
    try {
      await onSubmit({
        title: values.title.trim(),
        subject: values.subject,
        // Editing sends 0 to clear the grade; a new set simply has none.
        grade: values.grade || (set ? 0 : undefined),
        description: values.description.trim(),
      })
      onClose()
    } catch (error) {
      message.error(apiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={set ? 'Sửa thông tin bộ câu hỏi' : 'Tạo bộ câu hỏi mới'}
      okText={set ? 'Lưu thay đổi' : 'Tạo bộ câu hỏi'}
      cancelText="Hủy"
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={saving}
      forceRender
      width={540}
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} onFinish={(v) => void submit(v)} className="pt-2">
        <Form.Item
          name="title"
          label="Tên bộ câu hỏi"
          rules={[
            { required: true, whitespace: true, message: 'Cô đặt tên cho bộ câu hỏi nhé' },
            { max: MAX_TITLE, message: `Tên dài tối đa ${MAX_TITLE} ký tự` },
          ]}
        >
          <Input size="large" placeholder="VD: Toán lớp 2 - Phép cộng trong phạm vi 100" maxLength={MAX_TITLE} showCount autoFocus />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item name="subject" label="Môn học">
            <Select size="large" options={SUBJECTS.map((s) => ({ value: s.code, label: s.label }))} />
          </Form.Item>
          <Form.Item name="grade" label="Khối lớp">
            <Select size="large" options={GRADES} />
          </Form.Item>
        </div>
        <Form.Item name="description" label="Mô tả (không bắt buộc)" className="mb-1">
          <Input.TextArea
            placeholder="Bộ câu hỏi dùng để làm gì, cho bài học nào..."
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={MAX_DESCRIPTION}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
