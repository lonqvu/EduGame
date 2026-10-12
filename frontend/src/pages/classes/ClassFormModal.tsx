import { App, Form, Input, Modal, Select } from 'antd'
import { useEffect, useState } from 'react'
import { AvatarPicker } from '@/pages/classes/classUi'
import type { ApiError, ClassroomResponse, CreateClassroomRequest } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { CLASS_AVATARS, classAvatar, type ClassAvatar, MAX_NAME_LENGTH, schoolYearOptions, schoolYearOf } from '@/utils/classrooms'

const GRADES = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Khối ${i + 1}` }))
const NO_YEAR = ''

interface FormValues {
  name: string
  grade: number
  schoolYear: string
  schoolName: string
  avatar: ClassAvatar
}

interface ClassFormModalProps {
  open: boolean
  /** The class being edited; none to create one. */
  classroom?: ClassroomResponse
  /** The teacher's classes, for the suggested school and an avatar not used yet. */
  classrooms: ClassroomResponse[]
  onClose: () => void
  /** Saves; rejects with the API error to show. */
  onSubmit: (values: CreateClassroomRequest) => Promise<unknown>
}

/** Create a class, or edit one: name, grade, school year, school and its animal. */
export function ClassFormModal({ open, classroom, classrooms, onClose, onSubmit }: ClassFormModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const [today] = useState(() => new Date())
  const editing = !!classroom

  useEffect(() => {
    if (!open) return
    if (classroom) {
      form.setFieldsValue({
        name: classroom.name,
        grade: classroom.grade,
        schoolYear: classroom.schoolYear ?? NO_YEAR,
        schoolName: classroom.schoolName ?? '',
        avatar: classAvatar(classroom),
      })
    } else {
      const used = new Set(classrooms.map(classAvatar))
      form.setFieldsValue({
        name: '',
        grade: classrooms[0]?.grade ?? 1,
        schoolYear: schoolYearOf(today),
        // Most teachers teach in one school: suggest the one of their latest class.
        schoolName: [...classrooms].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find((c) => c.schoolName)?.schoolName ?? '',
        avatar: CLASS_AVATARS.find((a) => !used.has(a)) ?? CLASS_AVATARS[0],
      })
    }
  }, [open, classroom, classrooms, form, today])

  const years = schoolYearOptions(today)
  if (classroom?.schoolYear && !years.includes(classroom.schoolYear)) years.unshift(classroom.schoolYear)

  const submit = async (values: FormValues) => {
    setSaving(true)
    try {
      await onSubmit({
        name: values.name.trim(),
        grade: values.grade,
        schoolYear: values.schoolYear,
        schoolName: values.schoolName.trim(),
        avatar: values.avatar,
      })
      onClose()
    } catch (error) {
      if ((error as ApiError)?.code === 'CLASSROOM_NAME_TAKEN') {
        form.setFields([{ name: 'name', errors: [apiErrorMessage(error)] }])
      } else {
        message.error(apiErrorMessage(error))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Sửa thông tin lớp' : 'Tạo lớp học mới'}
      okText={editing ? 'Lưu thay đổi' : 'Tạo lớp học'}
      cancelText="Hủy"
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={saving}
      forceRender
      width={520}
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} onFinish={(v) => void submit(v)} className="pt-2">
        <Form.Item
          name="name"
          label="Tên lớp"
          rules={[
            { required: true, whitespace: true, message: 'Cô nhập tên lớp nhé' },
            { max: MAX_NAME_LENGTH, message: `Tên lớp dài tối đa ${MAX_NAME_LENGTH} ký tự` },
          ]}
        >
          <Input size="large" placeholder="VD: 1A, 2B, Lớp Sao Mai" maxLength={MAX_NAME_LENGTH} autoFocus />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item name="grade" label="Khối lớp">
            <Select size="large" options={GRADES} />
          </Form.Item>
          <Form.Item name="schoolYear" label="Năm học">
            <Select
              size="large"
              options={[...years.map((y) => ({ value: y, label: `Năm học ${y}` })), { value: NO_YEAR, label: 'Không ghi năm học' }]}
            />
          </Form.Item>
        </div>
        <Form.Item name="schoolName" label="Trường" rules={[{ max: 100, message: 'Tên trường dài tối đa 100 ký tự' }]}>
          <Input size="large" placeholder="VD: Tiểu học Kim Đồng" maxLength={100} />
        </Form.Item>
        <Form.Item name="avatar" label="Biểu tượng lớp" className="mb-1">
          <AvatarPicker options={CLASS_AVATARS} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
