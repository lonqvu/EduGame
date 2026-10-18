import { App, Form, Input, Modal } from 'antd'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckIcon, PlusIcon } from '@/components/ui/icons'
import { squarePicture } from '@/pages/profile/squarePicture'
import { useProfileStore } from '@/store/profileStore'
import type { ProfileResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import {
  AVATAR_LABELS,
  AVATARS,
  avatarSrc,
  formatPhone,
  MAX_DISPLAY_NAME,
  phoneError,
  pictureError,
  UPLOADED,
} from '@/utils/profile'

interface FormValues {
  displayName: string
  phone: string
  avatar: string
}

/** A picture the teacher picked on this computer, not sent yet: sent with "Lưu thay đổi". */
interface Picked {
  blob: Blob
  /** blob: URL for the preview; revoked when replaced or when the dialog closes. */
  url: string
}

/**
 * "Thông tin cá nhân": name, phone and picture. The picture is one of the drawings or the teacher's own, uploaded
 * when the form is saved (cut to a square here, checked and re-encoded by the backend). The email signs the teacher
 * in and is not changed here.
 */
export function EditProfileModal({ open, profile, onClose }: { open: boolean; profile: ProfileResponse; onClose: () => void }) {
  const { message } = App.useApp()
  const save = useProfileStore((s) => s.save)
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [reading, setReading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const avatar = Form.useWatch('avatar', form)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({ displayName: profile.displayName, phone: formatPhone(profile.phone), avatar: profile.avatar ?? 'teacher' })
  }, [open, profile, form])

  // A new pick drops the previous preview.
  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.url)
  }, [picked])

  /** Closing forgets a picture picked but not saved. */
  const close = () => {
    setPicked(null)
    onClose()
  }

  const choosePicture = async (file: File | undefined) => {
    if (!file) return
    const error = pictureError(file)
    if (error) {
      message.error(error)
      return
    }
    setReading(true)
    try {
      const blob = await squarePicture(file)
      setPicked({ blob, url: URL.createObjectURL(blob) })
      form.setFieldValue('avatar', UPLOADED)
    } catch {
      message.error('Không đọc được ảnh này, cô chọn ảnh khác nhé.')
    } finally {
      setReading(false)
    }
  }

  const submit = async (values: FormValues) => {
    setSaving(true)
    try {
      const keepsOwn = values.avatar === UPLOADED
      // The teacher drawing is the default: no avatar is stored for it.
      await save({ ...values, avatar: values.avatar === 'teacher' ? '' : values.avatar }, keepsOwn ? picked?.blob : undefined)
      message.success('Đã lưu hồ sơ.')
      close()
    } catch (error) {
      message.error(apiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  // The teacher's own picture: the one just picked, else the one uploaded before.
  const ownPicture = picked?.url ?? (profile.avatarUrl ? avatarSrc(UPLOADED, profile.avatarUrl) : null)
  const current = avatar ?? 'teacher'

  return (
    <Modal
      open={open}
      title="Thông tin cá nhân"
      okText="Lưu thay đổi"
      cancelText="Hủy"
      onOk={() => form.submit()}
      onCancel={close}
      confirmLoading={saving}
      okButtonProps={{ disabled: reading }}
      forceRender
      width={560}
    >
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} onFinish={(v) => void submit(v)} className="pt-2">
        <Form.Item name="avatar" hidden>
          <Input />
        </Form.Item>
        <div className="mb-4 flex flex-col gap-2">
          <span className="text-[14px]">Ảnh đại diện</span>
          <div role="radiogroup" aria-label="Ảnh đại diện" className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={reading}
              aria-label="Tải ảnh của cô lên"
              title="Tải ảnh lên"
              className="flex size-[52px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full border-2 border-dashed border-[#B7C7E6] bg-[#F4F8FF] p-0 text-primary transition outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              <PlusIcon size={18} strokeWidth={2.6} />
              <span className="text-[9.5px] leading-none font-bold">{reading ? '…' : 'Tải ảnh'}</span>
            </button>
            {ownPicture && (
              <AvatarChoice checked={current === UPLOADED} label="Ảnh của cô" onSelect={() => form.setFieldValue('avatar', UPLOADED)}>
                <img src={ownPicture} alt="" className="size-full object-cover" />
              </AvatarChoice>
            )}
            {AVATARS.map((key) => (
              <AvatarChoice key={key} checked={current === key} label={AVATAR_LABELS[key]} onSelect={() => form.setFieldValue('avatar', key)}>
                <img src={avatarSrc(key)} alt="" className="size-full object-cover" />
              </AvatarChoice>
            ))}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
              void choosePicture(e.target.files?.[0])
              // The same file can be picked again after a refusal.
              e.target.value = ''
            }}
          />
          <span className="text-[12.5px] text-ink-muted">Ảnh JPG, PNG… tối đa 15 MB; ảnh được cắt vuông ở giữa.</span>
        </div>
        <Form.Item
          name="displayName"
          label="Họ và tên"
          rules={[
            { required: true, whitespace: true, message: 'Cô nhập họ và tên nhé' },
            { max: MAX_DISPLAY_NAME, message: `Tối đa ${MAX_DISPLAY_NAME} ký tự` },
          ]}
        >
          <Input size="large" maxLength={MAX_DISPLAY_NAME} placeholder="VD: Cô Lan" autoComplete="name" />
        </Form.Item>
        <Form.Item label="Email" extra="Email dùng để đăng nhập nên chưa đổi được ở đây.">
          <Input size="large" value={profile.email ?? ''} disabled />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Số điện thoại (không bắt buộc)"
          className="mb-1"
          rules={[{ validator: (_, value: string) => (phoneError(value ?? '') ? Promise.reject(new Error(phoneError(value ?? '') as string)) : Promise.resolve()) }]}
        >
          <Input size="large" placeholder="VD: 0987 654 321" inputMode="tel" autoComplete="tel" maxLength={20} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function AvatarChoice({ checked, label, onSelect, children }: { checked: boolean; label: string; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onSelect}
      className={`relative size-[52px] cursor-pointer overflow-hidden rounded-full border-[3px] bg-[#FFE6C7] p-0 transition outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        checked ? 'border-primary shadow-[0_4px_12px_rgba(53,99,233,0.3)]' : 'border-transparent hover:border-[#C9D9F5]'
      }`}
    >
      {children}
      {checked && (
        <span className="absolute right-0 bottom-0 flex size-[18px] items-center justify-center rounded-full bg-primary text-white">
          <CheckIcon size={11} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
