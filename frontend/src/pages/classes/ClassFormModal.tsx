import { App, Button, Form, Input, Modal, Select } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarPicker } from '@/pages/classes/classUi'
import type { ApiError, ClassroomResponse, CreateClassroomRequest } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { CLASS_AVATARS, classAvatar, type ClassAvatar, MAX_NAME_LENGTH, schoolYearOptions, schoolYearOf } from '@/utils/classrooms'

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
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
  /** @param importList a new class whose list comes from a file next ("Tạo lớp và nhập danh sách") */
  onSubmit: (values: CreateClassroomRequest, importList: boolean) => Promise<unknown>
}

/** Create a class, or edit one: name, grade, school year, school and its animal. */
export function ClassFormModal({ open, classroom, classrooms, onClose, onSubmit }: ClassFormModalProps) {
  const { t } = useTranslation()
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

  // Which create button was pressed: read when the form is valid (after antd's validation), shown on the button.
  const importList = useRef(false)
  const [importing, setImporting] = useState(false)

  const submit = async (values: FormValues) => {
    setSaving(true)
    try {
      await onSubmit({
        name: values.name.trim(),
        grade: values.grade,
        schoolYear: values.schoolYear,
        schoolName: values.schoolName.trim(),
        avatar: values.avatar,
      }, importList.current)
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
      title={editing ? t('classes.form.editTitle') : t('classes.form.createTitle')}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        !editing && (
          <Button
            key="import"
            loading={saving && importing}
            disabled={saving}
            onClick={() => {
              importList.current = true
              setImporting(true)
              form.submit()
            }}
          >
            {t('classes.form.createAndImport')}
          </Button>
        ),
        <Button
          key="save"
          type="primary"
          loading={saving && !importing}
          disabled={saving}
          onClick={() => {
            importList.current = false
            setImporting(false)
            form.submit()
          }}
        >
          {editing ? t('common.saveChanges') : t('classes.form.create')}
        </Button>,
      ]}
      forceRender
      width={520}
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} onFinish={(v) => void submit(v)} className="pt-2">
        <Form.Item
          name="name"
          label={t('classes.form.name')}
          rules={[
            { required: true, whitespace: true, message: t('classes.form.nameRequired') },
            { max: MAX_NAME_LENGTH, message: t('classes.form.nameTooLong', { count: MAX_NAME_LENGTH }) },
          ]}
        >
          <Input size="large" placeholder={t('classes.form.namePlaceholder')} maxLength={MAX_NAME_LENGTH} autoFocus />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item name="grade" label={t('classes.form.grade')}>
            <Select size="large" options={GRADES.map((grade) => ({ value: grade, label: t('classes.grade', { grade }) }))} />
          </Form.Item>
          <Form.Item name="schoolYear" label={t('classes.form.schoolYear')}>
            <Select
              size="large"
              options={[...years.map((year) => ({ value: year, label: t('classes.schoolYear', { year }) })), { value: NO_YEAR, label: t('classes.form.noYear') }]}
            />
          </Form.Item>
        </div>
        <Form.Item name="schoolName" label={t('classes.form.school')} rules={[{ max: 100, message: t('classes.form.schoolTooLong') }]}>
          <Input size="large" placeholder={t('classes.form.schoolPlaceholder')} maxLength={100} />
        </Form.Item>
        <Form.Item name="avatar" label={t('classes.icon')} className="mb-1">
          <AvatarPicker options={CLASS_AVATARS} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
