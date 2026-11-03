import { Alert, App, Breadcrumb, Button, Card, Col, Descriptions, Input, Modal, Row, Space, Spin, Statistic, Typography } from 'antd'
import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { changeTeacherRole, getAdminTeacher, lockTeacher, signOutTeacher, unblockTeacherLogin, unlockTeacher } from '@/api/adminApi'
import { AuditTable, PageTitle, RoleTag, StatusTag } from '@/admin/parts'
import { useRemote } from '@/admin/useRemote'
import { LoadError } from '@/components/ui/LoadState'
import type { AdminTeacher } from '@/types/api'
import { adminErrorMessage, count, dateTime } from '@/utils/admin'
import { relativeTimeLabel } from '@/utils/dateLabels'

const MAX_REASON = 300

/** /admin/accounts/:code — one account: what the teacher made, where they sign in, and what an admin can do to it. */
export function AccountPage() {
  const { t } = useTranslation()
  const { code = '' } = useParams()
  const { message, modal } = App.useApp()
  const { data: teacher, error, reload, replace } = useRemote(code, (signal) => getAdminTeacher(code, signal))
  const [busy, setBusy] = useState<string | null>(null)
  const [locking, setLocking] = useState(false)
  const [reason, setReason] = useState('')

  const run = async (what: string, action: () => Promise<AdminTeacher>, done: string) => {
    setBusy(what)
    try {
      replace(await action())
      message.success(done)
      return true
    } catch (e) {
      message.error(adminErrorMessage(e))
      return false
    } finally {
      setBusy(null)
    }
  }

  const confirm = (title: string, content: string, okText: string, onOk: () => Promise<unknown>, danger = false) =>
    modal.confirm({ title, content, okText, cancelText: t('common.cancel'), okButtonProps: { danger }, onOk })

  const crumbs = (
    <Breadcrumb
      className="!mb-3"
      items={[{ title: <Link to="/admin/accounts">{t('admin.teacher.back')}</Link> }, { title: teacher?.displayName ?? code }]}
    />
  )

  if (!teacher) {
    return (
      <>
        {crumbs}
        {error ? <LoadError onRetry={reload} /> : <Spin size="large" className="!flex justify-center py-20" />}
      </>
    )
  }

  const deleted = teacher.status === 'DELETED'
  const locked = teacher.status === 'LOCKED'
  const isAdmin = teacher.role === 'ADMIN'
  const canAct = !teacher.self && !deleted

  return (
    <>
      {crumbs}
      <PageTitle
        title={
          <Space size={10} wrap>
            {teacher.displayName}
            <StatusTag status={teacher.status} />
            <RoleTag role={teacher.role} />
          </Space>
        }
        text={teacher.email ?? teacher.username}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Space orientation="vertical" size={16} className="w-full">
            <Card title={t('admin.teacher.account')} size="small">
              <Descriptions column={{ xs: 1, md: 2 }} size="small">
                <Descriptions.Item label="Email">
                  {teacher.email ?? '—'}
                  {teacher.email && !teacher.emailVerified && <Typography.Text type="secondary">{t('admin.teacher.unverified')}</Typography.Text>}
                </Descriptions.Item>
                <Descriptions.Item label={t('admin.teacher.username')}>{teacher.username}</Descriptions.Item>
                <Descriptions.Item label={t('admin.teacher.phone')}>{teacher.phone ?? '—'}</Descriptions.Item>
                <Descriptions.Item label={t('admin.teacher.joined')}>{dateTime(teacher.createdAt)}</Descriptions.Item>
                <Descriptions.Item label={t('admin.teacher.lastActive')}>
                  {teacher.lastActiveAt ? relativeTimeLabel(teacher.lastActiveAt) : t('admin.noneYet')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title={t('admin.teacher.usage')} size="small">
              <Row gutter={[16, 16]}>
                <Figure label={t('admin.teacher.classrooms')} value={teacher.figures.classrooms} />
                <Figure label={t('admin.teacher.students')} value={teacher.figures.students} />
                <Figure label={t('admin.teacher.games')} value={teacher.figures.games} />
                <Figure label={t('admin.teacher.questionSets')} value={teacher.figures.questionSets} />
                <Figure label={t('admin.teacher.plays')} value={teacher.figures.plays} />
                <Figure label={t('admin.teacher.recentPlays')} value={teacher.figures.recentPlays} />
              </Row>
            </Card>

            <Card title={t('admin.teacher.devices')} size="small">
              <Typography.Paragraph className="!mb-3">
                <Trans i18nKey="admin.teacher.sessions" values={{ count: teacher.openSessions }} components={{ b: <b /> }} />
              </Typography.Paragraph>
              {teacher.devices.length ? (
                <ul className="m-0 list-none p-0">
                  {teacher.devices.map((d) => (
                    <li key={d.name} className="flex flex-wrap justify-between gap-2 border-t border-[#f0f0f0] py-2">
                      <span>{d.name}</span>
                      <Typography.Text type="secondary">{t('admin.teacher.lastSeen', { when: relativeTimeLabel(d.lastSeenAt) })}</Typography.Text>
                    </li>
                  ))}
                </ul>
              ) : (
                <Typography.Text type="secondary">{t('admin.teacher.noDevices')}</Typography.Text>
              )}
            </Card>
          </Space>
        </Col>

        <Col xs={24} xl={10}>
          <Card title={t('admin.teacher.actions')} size="small">
            {teacher.loginBlockedUntil && (
              <Alert
                type="warning"
                showIcon
                className="!mb-4"
                message={t('admin.teacher.blocked', { until: dateTime(teacher.loginBlockedUntil) })}
                action={
                  canAct && (
                    <Button size="small" loading={busy === 'unblock'} onClick={() => void run('unblock', () => unblockTeacherLogin(teacher.code), t('admin.teacher.unblocked'))}>
                      {t('admin.teacher.unblock')}
                    </Button>
                  )
                }
              />
            )}
            {teacher.self ? (
              <Typography.Text type="secondary">{t('admin.teacher.own')}</Typography.Text>
            ) : deleted ? (
              <Typography.Text type="secondary">{t('admin.teacher.deleted')}</Typography.Text>
            ) : (
              <div className="flex flex-col">
                <Action text={locked ? t('admin.teacher.unlockText') : isAdmin ? t('admin.teacher.adminLockText') : t('admin.teacher.lockText')}>
                  {locked ? (
                    <Button loading={busy === 'unlock'} onClick={() => void run('unlock', () => unlockTeacher(teacher.code), t('admin.teacher.unlocked'))}>
                      {t('admin.teacher.unlock')}
                    </Button>
                  ) : (
                    <Button danger disabled={isAdmin} loading={busy === 'lock'} onClick={() => setLocking(true)}>
                      {t('admin.teacher.lock')}
                    </Button>
                  )}
                </Action>
                <Action text={t('admin.teacher.signOutText')}>
                  <Button
                    loading={busy === 'signOut'}
                    disabled={teacher.openSessions === 0}
                    onClick={() =>
                      confirm(
                        t('admin.teacher.signOutConfirm'),
                        t('admin.teacher.signOutConfirmText', { name: teacher.displayName }),
                        t('admin.teacher.signOutOk'),
                        () => run('signOut', () => signOutTeacher(teacher.code), t('admin.teacher.signedOut')),
                      )
                    }
                  >
                    {t('admin.teacher.signOut')}
                  </Button>
                </Action>
                <Action text={isAdmin ? t('admin.teacher.revokeText') : t('admin.teacher.grantText')}>
                  <Button
                    loading={busy === 'role'}
                    disabled={!isAdmin && locked}
                    onClick={() =>
                      confirm(
                        isAdmin ? t('admin.teacher.revokeConfirm') : t('admin.teacher.grantConfirm'),
                        isAdmin
                          ? t('admin.teacher.revokeConfirmText', { name: teacher.displayName })
                          : t('admin.teacher.grantConfirmText', { name: teacher.displayName }),
                        isAdmin ? t('admin.teacher.revokeOk') : t('admin.teacher.grantOk'),
                        () =>
                          run(
                            'role',
                            () => changeTeacherRole(teacher.code, isAdmin ? 'TEACHER' : 'ADMIN'),
                            isAdmin ? t('admin.teacher.revoked') : t('admin.teacher.granted'),
                          ),
                        isAdmin,
                      )
                    }
                  >
                    {isAdmin ? t('admin.teacher.revoke') : t('admin.teacher.grant')}
                  </Button>
                </Action>
              </div>
            )}
          </Card>
        </Col>

        <Col span={24}>
          <Card title={t('admin.teacher.history')} size="small">
            <AuditTable entries={teacher.history} />
          </Card>
        </Col>
      </Row>

      <Modal
        open={locking}
        title={t('admin.teacher.lockConfirm', { name: teacher.displayName })}
        okText={t('admin.teacher.lock')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true }}
        confirmLoading={busy === 'lock'}
        onCancel={() => setLocking(false)}
        afterClose={() => setReason('')}
        onOk={async () => {
          if (await run('lock', () => lockTeacher(teacher.code, reason), t('admin.teacher.locked'))) setLocking(false)
        }}
      >
        <Typography.Paragraph type="secondary">{t('admin.teacher.lockConfirmText')}</Typography.Paragraph>
        <label htmlFor="lock-reason" className="mb-1 block font-semibold">
          {t('admin.teacher.reason')}
        </label>
        <Input.TextArea
          id="lock-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX_REASON}
          showCount
          autoSize={{ minRows: 2, maxRows: 5 }}
          placeholder={t('admin.teacher.reasonPlaceholder')}
        />
      </Modal>
    </>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <Col xs={12} md={8}>
      <Statistic title={label} value={value} formatter={(v) => count(Number(v))} styles={{ content: { fontSize: 20 } }} />
    </Col>
  )
}

function Action({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f0] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <Typography.Text type="secondary" className="min-w-[180px] flex-1">
        {text}
      </Typography.Text>
      {children}
    </div>
  )
}
