import { App, Input, Modal } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiErrorMessage } from '@/utils/apiError'
import { MAX_NAME_LENGTH, MAX_STUDENTS, parseStudentNames } from '@/utils/classrooms'

interface AddStudentsModalProps {
  open: boolean
  /** Students already in the class */
  studentCount: number
  onClose: () => void
  onAdd: (names: string[]) => Promise<unknown>
}

/** One name per line, typed or pasted from a class list; numbering is dropped. */
export function AddStudentsModal({ open, studentCount, onClose, onAdd }: AddStudentsModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  // Each opening starts empty.
  const [shownOpen, setShownOpen] = useState(open)
  if (open !== shownOpen) {
    setShownOpen(open)
    if (open) setText('')
  }

  const names = parseStudentNames(text)
  const room = MAX_STUDENTS - studentCount
  const tooLong = names.find((n) => n.length > MAX_NAME_LENGTH)
  const problem =
    names.length > room
      ? t('classes.add.tooMany', { room, max: MAX_STUDENTS, extra: names.length - room })
      : tooLong
        ? t('classes.add.tooLong', { name: tooLong.slice(0, 24), max: MAX_NAME_LENGTH })
        : ''

  const add = async () => {
    setSaving(true)
    try {
      await onAdd(names)
      message.success(t('classes.add.added', { count: names.length }))
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
      title={t('classes.add.title')}
      okText={names.length ? t('classes.add.submit', { count: names.length }) : t('classes.add.title')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !names.length || !!problem }}
      confirmLoading={saving}
      onOk={() => void add()}
      onCancel={onClose}
      width={520}
    >
      <label htmlFor="student-names" className="mb-2 block pt-1 text-[14.5px] text-ink-soft">
        {t('classes.add.hint')}
      </label>
      <Input.TextArea
        id="student-names"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoSize={{ minRows: 7, maxRows: 14 }}
        placeholder={t('classes.add.placeholder')}
        autoFocus
        status={problem ? 'error' : undefined}
      />
      <p role="status" className={`mt-2 mb-0 text-[14px] ${problem ? 'text-danger' : 'text-ink-muted'}`}>
        {problem || (names.length ? t('classes.add.willAdd', { count: names.length }) : t('classes.add.room', { count: room }))}
      </p>
    </Modal>
  )
}

interface RenameStudentModalProps {
  /** The student being renamed; none when closed. */
  student?: { id: number; displayName: string }
  onClose: () => void
  onRename: (id: number, name: string) => Promise<unknown>
}

export function RenameStudentModal({ student, onClose, onRename }: RenameStudentModalProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  // Each opening starts from the student's name.
  const [shownStudent, setShownStudent] = useState(student)
  if (student !== shownStudent) {
    setShownStudent(student)
    if (student) setName(student.displayName)
  }

  const trimmed = name.trim()
  const save = async () => {
    if (!student || !trimmed) return
    setSaving(true)
    try {
      await onRename(student.id, trimmed)
      onClose()
    } catch (error) {
      message.error(apiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!student}
      title={t('classes.add.renameTitle')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !trimmed || trimmed === student?.displayName }}
      confirmLoading={saving}
      onOk={() => void save()}
      onCancel={onClose}
      width={420}
    >
      <Input
        aria-label={t('classes.add.name')}
        size="large"
        value={name}
        maxLength={MAX_NAME_LENGTH}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={() => void save()}
        autoFocus
        className="mt-2"
      />
    </Modal>
  )
}
