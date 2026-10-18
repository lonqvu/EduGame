import { App, Button, Form, Input, Modal } from 'antd'
import { useEffect, useState } from 'react'
import { changePassword, signOutOthers } from '@/api/userApi'
import { LockIcon, LogoutIcon } from '@/components/ui/icons'
import { apiErrorMessage } from '@/utils/apiError'
import { MIN_PASSWORD, passwordTooLong } from '@/utils/authRules'

interface PasswordValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const othersLabel = (n: number) => (n > 0 ? `Đã đăng xuất ${n} thiết bị khác.` : 'Không có thiết bị nào khác đang đăng nhập.')

/**
 * "Bảo mật tài khoản": a new password (every other device is signed out, this one stays) and signing out of the
 * other devices on its own, e.g. after using a shared school computer.
 */
export function SecurityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<PasswordValues>()
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  const submit = async ({ currentPassword, newPassword }: PasswordValues) => {
    setSaving(true)
    try {
      const { otherSessions } = await changePassword(currentPassword, newPassword)
      message.success(`Đã đổi mật khẩu. ${othersLabel(otherSessions)}`)
      onClose()
    } catch (error) {
      message.error(apiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const confirmSignOut = () =>
    modal.confirm({
      title: 'Đăng xuất khỏi các thiết bị khác?',
      content: 'Mọi máy tính, điện thoại khác đang đăng nhập tài khoản này sẽ phải đăng nhập lại. Máy này vẫn giữ đăng nhập.',
      okText: 'Đăng xuất thiết bị khác',
      cancelText: 'Hủy',
      onOk: async () => {
        setSigningOut(true)
        try {
          message.success(othersLabel((await signOutOthers()).otherSessions))
        } catch (error) {
          message.error(apiErrorMessage(error))
        } finally {
          setSigningOut(false)
        }
      },
    })

  return (
    <Modal open={open} title="Bảo mật tài khoản" footer={null} onCancel={onClose} forceRender width={560}>
      <div className="flex flex-col gap-5 pt-2">
        <section className="flex flex-col gap-3">
          <h3 className="m-0 flex items-center gap-2 text-[16px] font-black">
            <LockIcon size={19} className="text-primary" />
            Đổi mật khẩu
          </h3>
          <Form<PasswordValues> form={form} layout="vertical" requiredMark={false} onFinish={(v) => void submit(v)}>
            <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Cô nhập mật khẩu hiện tại nhé' }]}>
              <Input.Password size="large" autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="Mật khẩu mới"
              dependencies={['currentPassword']}
              rules={[
                { required: true, message: 'Cô nhập mật khẩu mới nhé' },
                { min: MIN_PASSWORD, message: `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự` },
                { validator: (_, v: string) => (v && passwordTooLong(v) ? Promise.reject(new Error(passwordTooLong(v) as string)) : Promise.resolve()) },
                ({ getFieldValue }) => ({
                  validator: (_, v: string) =>
                    v && v === getFieldValue('currentPassword')
                      ? Promise.reject(new Error('Mật khẩu mới cần khác mật khẩu hiện tại'))
                      : Promise.resolve(),
                }),
              ]}
            >
              <Input.Password size="large" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Nhập lại mật khẩu mới"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Cô nhập lại mật khẩu mới nhé' },
                ({ getFieldValue }) => ({
                  validator: (_, v: string) =>
                    !v || v === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu nhập lại chưa khớp')),
                }),
              ]}
            >
              <Input.Password size="large" autoComplete="new-password" />
            </Form.Item>
            <p className="m-0 mb-3 text-[13px] text-ink-muted">Sau khi đổi, các thiết bị khác sẽ phải đăng nhập lại bằng mật khẩu mới.</p>
            <Button type="primary" size="large" htmlType="submit" loading={saving} className="rounded-[12px] font-bold">
              Đổi mật khẩu
            </Button>
          </Form>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-line-soft pt-5">
          <h3 className="m-0 flex items-center gap-2 text-[16px] font-black">
            <LogoutIcon size={19} className="text-primary" />
            Thiết bị đăng nhập
          </h3>
          <p className="m-0 text-[14px] text-ink-soft">
            Đã đăng nhập trên máy tính ở trường hay máy của người khác? Cô đăng xuất các thiết bị đó, máy này vẫn giữ đăng nhập.
          </p>
          <Button size="large" onClick={confirmSignOut} loading={signingOut} className="self-start rounded-[12px] font-bold">
            Đăng xuất khỏi các thiết bị khác
          </Button>
        </section>
      </div>
    </Modal>
  )
}
