import { App, Button, Input, Modal } from 'antd'
import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import {
  changeTeacherRole,
  getAdminTeacher,
  lockTeacher,
  signOutTeacher,
  unblockTeacherLogin,
  unlockTeacher,
} from '@/api/adminApi'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { AdminCard, AdminHeader, RoleTag, StatusTag } from '@/pages/admin/AdminParts'
import { AuditList } from '@/pages/admin/AuditList'
import { useRemote } from '@/pages/admin/useRemote'
import type { AdminTeacher } from '@/types/api'
import { adminErrorMessage, count, dateTime } from '@/utils/admin'
import { relativeTimeLabel } from '@/utils/dateLabels'

const MAX_REASON = 300
/** Where a teacher's page sits. */

/** /admin/teachers/:code — one account: what the teacher made, where they sign in, and what an admin can do to it. */
export function AdminTeacherPage() {
  const { t } = useTranslation()
  const back = { to: '/admin/teachers', label: t('admin.teachers.title') }
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

  if (!teacher) {
    return (
      <div className="flex flex-col gap-5">
        <AdminHeader title={t('admin.teachers.title')} text="" back={back} />
        {error ? <LoadError onRetry={reload} /> : <PageLoading />}
      </div>
    )
  }

  const deleted = teacher.status === 'DELETED'
  const locked = teacher.status === 'LOCKED'
  const isAdmin = teacher.role === 'ADMIN'
  const canAct = !teacher.self && !deleted

  return (
    <div className="flex flex-col gap-5">
      <AdminHeader
        title={teacher.displayName}
        text={teacher.email ?? teacher.username}
        back={back}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminCard title={t('admin.teacher.account')}>
          <dl className="m-0 grid grid-cols-[140px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[14.5px]">
            <Row label={t('admin.teacher.status')}>
              <span className="flex flex-wrap items-center gap-2">
                <StatusTag status={teacher.status} />
                <RoleTag role={teacher.role} />
              </span>
            </Row>
            <Row label="Email">
              {teacher.email ?? '—'}
              {teacher.email && !teacher.emailVerified && <span className="text-ink-muted">{t('admin.teacher.unverified')}</span>}
            </Row>
            <Row label={t('admin.teacher.username')}>{teacher.username}</Row>
            <Row label={t('admin.teacher.phone')}>{teacher.phone ?? '—'}</Row>
            <Row label="Tham gia">{dateTime(teacher.createdAt)}</Row>
            <Row label={t('admin.teacher.lastActive')}>{teacher.lastActiveAt ? relativeTimeLabel(teacher.lastActiveAt) : t('admin.noneYet')}</Row>
          </dl>
        </AdminCard>

        <AdminCard title={t('admin.teacher.usage')}>
          <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Figure label={t('admin.teacher.classrooms')} value={teacher.figures.classrooms} />
            <Figure label={t('admin.teacher.students')} value={teacher.figures.students} />
            <Figure label={t('admin.teacher.games')} value={teacher.figures.games} />
            <Figure label={t('admin.teacher.questionSets')} value={teacher.figures.questionSets} />
            <Figure label={t('admin.teacher.plays')} value={teacher.figures.plays} />
            <Figure label={t('admin.teacher.recentPlays')} value={teacher.figures.recentPlays} />
          </dl>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminCard title={t('admin.teacher.signIn')}>
          <p className="m-0 text-[14.5px]">
            <Trans i18nKey="admin.teacher.sessions" values={{ count: teacher.openSessions }} components={{ b: <b /> }} />
          </p>
          {teacher.loginBlockedUntil && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-[#FFF4E5] px-4 py-3 text-[14px]">
              <span>{t('admin.teacher.blocked', { until: dateTime(teacher.loginBlockedUntil) })}</span>
              {canAct && (
                <Button
                  size="small"
                  loading={busy === 'unblock'}
                  onClick={() => void run('unblock', () => unblockTeacherLogin(teacher.code), t('admin.teacher.unblocked'))}
                >
                  {t('admin.teacher.unblock')}
                </Button>
              )}
            </div>
          )}
          {teacher.devices.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {teacher.devices.map((d) => (
                <li key={d.name} className="flex flex-wrap justify-between gap-2 text-[14px]">
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-ink-muted">{t('admin.teacher.lastSeen', { when: relativeTimeLabel(d.lastSeenAt) })}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title={t('admin.teacher.actions')}>
          {teacher.self ? (
            <p className="m-0 text-[14px] text-ink-muted">{t('admin.teacher.own')}</p>
          ) : deleted ? (
            <p className="m-0 text-[14px] text-ink-muted">{t('admin.teacher.deleted')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <Action
                text={locked ? t('admin.teacher.unlockText') : isAdmin ? t('admin.teacher.adminLockText') : t('admin.teacher.lockText')}
              >
                {locked ? (
                  <Button
                    loading={busy === 'unlock'}
                    onClick={() => void run('unlock', () => unlockTeacher(teacher.code), t('admin.teacher.unlocked'))}
                  >
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
              <Action
                text={
                  isAdmin
                    ? t('admin.teacher.revokeText')
                    : t('admin.teacher.grantText')
                }
              >
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
        </AdminCard>
      </div>

      <AdminCard title={t('admin.teacher.history')}>
        <AuditList entries={teacher.history} />
      </AdminCard>

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
        <div className="flex flex-col gap-2 pt-1">
          <p className="m-0 text-[14.5px] text-ink-soft">{t('admin.teacher.lockConfirmText')}</p>
          <label htmlFor="lock-reason" className="text-[14px] font-bold">
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
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] bg-[#F6F8FC] px-4 py-3">
      <dt className="text-[13px] font-semibold text-ink-soft">{label}</dt>
      <dd className="m-0 text-[22px] font-black tabular-nums">{count(value)}</dd>
    </div>
  )
}

function Action({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft pb-3 last:border-b-0 last:pb-0">
      <span className="min-w-[200px] flex-1 text-[14px] text-ink-soft">{text}</span>
      {children}
    </div>
  )
}
