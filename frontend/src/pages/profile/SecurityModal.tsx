import { App, Button, Form, Input, Modal } from 'antd'
import i18n from 'i18next'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { changePassword, signOutOthers } from '@/api/userApi'
import { LockIcon, LogoutIcon } from '@/components/ui/icons'
import { apiErrorMessage } from '@/utils/apiError'
import { MIN_PASSWORD, passwordTooLong } from '@/utils/authRules'

interface PasswordValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const othersLabel = (count: number) =>
  count > 0 ? i18n.t('profile.security.othersSignedOut', { count }) : i18n.t('profile.security.noOthers')

/**
 * "Bảo mật tài khoản": a new password (every other device is signed out, this one stays) and signing out of the
 * other devices on its own, e.g. after using a shared school computer.
 */
export function SecurityModal({ open, hasPassword, onPasswordSet, onClose }: {
  open: boolean
  /** false: signed up with Google, the first password is set without a current one. */
  hasPassword: boolean
  /** A password was set or changed (the profile reloads: `hasPassword` may have changed). */
  onPasswordSet: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
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
      const { otherSessions } = await changePassword(hasPassword ? currentPassword : undefined, newPassword)
      message.success(t('profile.security.changed', { others: othersLabel(otherSessions) }))
      onPasswordSet()
      onClose()
    } catch (error) {
      message.error(apiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const confirmSignOut = () =>
    modal.confirm({
      title: t('profile.security.signOutOthersConfirm'),
      content: t('profile.security.signOutOthersText'),
      okText: t('profile.security.signOutOthersOk'),
      cancelText: t('common.cancel'),
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
    <Modal open={open} title={t('profile.security.title')} footer={null} onCancel={onClose} forceRender width={560}>
      <div className="flex flex-col gap-5 pt-2">
        <section className="flex flex-col gap-3">
          <h3 className="m-0 flex items-center gap-2 text-[16px] font-black">
            <LockIcon size={19} className="text-primary" />
            {hasPassword ? t('profile.security.changePassword') : t('profile.security.setPassword')}
          </h3>
          {!hasPassword && <p className="m-0 text-[14px] text-ink-muted">{t('profile.security.setPasswordText')}</p>}
          <Form<PasswordValues> form={form} layout="vertical" requiredMark={false} onFinish={(v) => void submit(v)}>
            {hasPassword && (
              <Form.Item name="currentPassword" label={t('profile.security.currentPassword')} rules={[{ required: true, message: t('profile.security.currentRequired') }]}>
                <Input.Password size="large" autoComplete="current-password" />
              </Form.Item>
            )}
            <Form.Item
              name="newPassword"
              label={t('profile.security.newPassword')}
              dependencies={['currentPassword']}
              rules={[
                { required: true, message: t('profile.security.newRequired') },
                { min: MIN_PASSWORD, message: t('profile.security.tooShort', { count: MIN_PASSWORD }) },
                { validator: (_, v: string) => (v && passwordTooLong(v) ? Promise.reject(new Error(passwordTooLong(v) as string)) : Promise.resolve()) },
                ({ getFieldValue }) => ({
                  validator: (_, v: string) =>
                    v && v === getFieldValue('currentPassword')
                      ? Promise.reject(new Error(t('profile.security.samePassword')))
                      : Promise.resolve(),
                }),
              ]}
            >
              <Input.Password size="large" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label={t('profile.security.confirm')}
              dependencies={['newPassword']}
              rules={[
                { required: true, message: t('profile.security.confirmRequired') },
                ({ getFieldValue }) => ({
                  validator: (_, v: string) =>
                    !v || v === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error(t('profile.security.mismatch'))),
                }),
              ]}
            >
              <Input.Password size="large" autoComplete="new-password" />
            </Form.Item>
            <p className="m-0 mb-3 text-[13px] text-ink-muted">{t('profile.security.afterChange')}</p>
            <Button type="primary" size="large" htmlType="submit" loading={saving} className="rounded-[12px] font-bold">
              {hasPassword ? t('profile.security.changePassword') : t('profile.security.setPassword')}
            </Button>
          </Form>
        </section>

        <section className="flex flex-col gap-2.5 border-t border-line-soft pt-5">
          <h3 className="m-0 flex items-center gap-2 text-[16px] font-black">
            <LogoutIcon size={19} className="text-primary" />
            {t('profile.security.devices')}
          </h3>
          <p className="m-0 text-[14px] text-ink-soft">
            {t('profile.security.devicesText')}
          </p>
          <Button size="large" onClick={confirmSignOut} loading={signingOut} className="self-start rounded-[12px] font-bold">
            {t('profile.security.signOutOthers')}
          </Button>
        </section>
      </div>
    </Modal>
  )
}
