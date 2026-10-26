import { App, Button, Input, Modal } from 'antd'
import { useState, type ReactNode } from 'react'
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
import { adminErrorMessage, count, dateTime, ROLE_LABELS } from '@/utils/admin'
import { relativeTimeLabel } from '@/utils/dateLabels'

const MAX_REASON = 300
/** Where a teacher's page sits. */
const TEACHERS = { to: '/admin/teachers', label: 'Giáo viên' }

/** /admin/teachers/:code — one account: what the teacher made, where they sign in, and what an admin can do to it. */
export function AdminTeacherPage() {
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
    modal.confirm({ title, content, okText, cancelText: 'Huỷ', okButtonProps: { danger }, onOk })

  if (!teacher) {
    return (
      <div className="flex flex-col gap-5">
        <AdminHeader title="Giáo viên" text="" back={TEACHERS} />
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
        back={TEACHERS}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminCard title="Tài khoản">
          <dl className="m-0 grid grid-cols-[140px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[14.5px]">
            <Row label="Trạng thái">
              <span className="flex flex-wrap items-center gap-2">
                <StatusTag status={teacher.status} />
                <RoleTag role={teacher.role} />
              </span>
            </Row>
            <Row label="Email">
              {teacher.email ?? '—'}
              {teacher.email && !teacher.emailVerified && <span className="text-ink-muted"> (chưa xác nhận)</span>}
            </Row>
            <Row label="Tên đăng nhập">{teacher.username}</Row>
            <Row label="Số điện thoại">{teacher.phone ?? '—'}</Row>
            <Row label="Tham gia">{dateTime(teacher.createdAt)}</Row>
            <Row label="Hoạt động gần nhất">{teacher.lastActiveAt ? relativeTimeLabel(teacher.lastActiveAt) : 'Chưa dùng'}</Row>
          </dl>
        </AdminCard>

        <AdminCard title="Đã dùng Lớp Vui">
          <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Figure label="Lớp học" value={teacher.figures.classrooms} />
            <Figure label="Học sinh" value={teacher.figures.students} />
            <Figure label="Trò chơi" value={teacher.figures.games} />
            <Figure label="Bộ câu hỏi" value={teacher.figures.questionSets} />
            <Figure label="Lượt chơi" value={teacher.figures.plays} />
            <Figure label="Lượt chơi 30 ngày" value={teacher.figures.recentPlays} />
          </dl>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminCard title="Đăng nhập">
          <p className="m-0 text-[14.5px]">
            Đang đăng nhập trên <b>{teacher.openSessions}</b> trình duyệt.
          </p>
          {teacher.loginBlockedUntil && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-[#FFF4E5] px-4 py-3 text-[14px]">
              <span>Bị chặn đăng nhập (nhập sai mật khẩu nhiều lần) đến {dateTime(teacher.loginBlockedUntil)}.</span>
              {canAct && (
                <Button
                  size="small"
                  loading={busy === 'unblock'}
                  onClick={() => void run('unblock', () => unblockTeacherLogin(teacher.code), 'Đã mở chặn đăng nhập.')}
                >
                  Mở chặn
                </Button>
              )}
            </div>
          )}
          {teacher.devices.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {teacher.devices.map((d) => (
                <li key={d.name} className="flex flex-wrap justify-between gap-2 text-[14px]">
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-ink-muted">Lần cuối {relativeTimeLabel(d.lastSeenAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Thao tác">
          {teacher.self ? (
            <p className="m-0 text-[14px] text-ink-muted">Đây là tài khoản của cô. Thông tin của mình cô sửa ở Hồ sơ của tôi.</p>
          ) : deleted ? (
            <p className="m-0 text-[14px] text-ink-muted">Tài khoản đã xoá, không còn thao tác nào.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <Action
                text={locked ? 'Cho giáo viên đăng nhập lại.' : isAdmin ? 'Bỏ quyền quản trị trước khi khoá.' : 'Không đăng nhập được nữa, mọi thiết bị bị đăng xuất ngay.'}
              >
                {locked ? (
                  <Button
                    loading={busy === 'unlock'}
                    onClick={() => void run('unlock', () => unlockTeacher(teacher.code), 'Đã mở khoá tài khoản.')}
                  >
                    Mở khoá tài khoản
                  </Button>
                ) : (
                  <Button danger disabled={isAdmin} loading={busy === 'lock'} onClick={() => setLocking(true)}>
                    Khoá tài khoản
                  </Button>
                )}
              </Action>
              <Action text="Khi giáo viên mất máy hoặc dùng chung máy. Mật khẩu giữ nguyên.">
                <Button
                  loading={busy === 'signOut'}
                  disabled={teacher.openSessions === 0}
                  onClick={() =>
                    confirm(
                      'Đăng xuất mọi thiết bị?',
                      `${teacher.displayName} sẽ phải đăng nhập lại trên tất cả thiết bị.`,
                      'Đăng xuất',
                      () => run('signOut', () => signOutTeacher(teacher.code), 'Đã đăng xuất mọi thiết bị.'),
                    )
                  }
                >
                  Đăng xuất mọi thiết bị
                </Button>
              </Action>
              <Action
                text={
                  isAdmin
                    ? 'Tài khoản thành giáo viên thường và bị đăng xuất ngay.'
                    : 'Được xem trang Quản trị, khoá tài khoản và đọc góp ý.'
                }
              >
                <Button
                  loading={busy === 'role'}
                  disabled={!isAdmin && locked}
                  onClick={() =>
                    confirm(
                      isAdmin ? 'Bỏ quyền quản trị?' : 'Cấp quyền quản trị?',
                      isAdmin
                        ? `${teacher.displayName} sẽ không vào được trang Quản trị nữa.`
                        : `${teacher.displayName} sẽ quản lý được mọi tài khoản giáo viên. Chỉ cấp cho người trong đội Lớp Vui.`,
                      isAdmin ? 'Bỏ quyền' : 'Cấp quyền',
                      () =>
                        run(
                          'role',
                          () => changeTeacherRole(teacher.code, isAdmin ? 'TEACHER' : 'ADMIN'),
                          isAdmin ? 'Đã bỏ quyền quản trị.' : `Đã cấp quyền ${ROLE_LABELS.ADMIN.toLowerCase()}.`,
                        ),
                      isAdmin,
                    )
                  }
                >
                  {isAdmin ? 'Bỏ quyền quản trị' : 'Cấp quyền quản trị'}
                </Button>
              </Action>
            </div>
          )}
        </AdminCard>
      </div>

      <AdminCard title="Lịch sử quản trị">
        <AuditList entries={teacher.history} />
      </AdminCard>

      <Modal
        open={locking}
        title={`Khoá tài khoản ${teacher.displayName}?`}
        okText="Khoá tài khoản"
        cancelText="Huỷ"
        okButtonProps={{ danger: true }}
        confirmLoading={busy === 'lock'}
        onCancel={() => setLocking(false)}
        afterClose={() => setReason('')}
        onOk={async () => {
          if (await run('lock', () => lockTeacher(teacher.code, reason), 'Đã khoá tài khoản.')) setLocking(false)
        }}
      >
        <div className="flex flex-col gap-2 pt-1">
          <p className="m-0 text-[14.5px] text-ink-soft">Giáo viên bị đăng xuất ngay và không đăng nhập được cho tới khi được mở khoá.</p>
          <label htmlFor="lock-reason" className="text-[14px] font-bold">
            Lý do (ghi vào nhật ký)
          </label>
          <Input.TextArea
            id="lock-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_REASON}
            showCount
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="VD: Tài khoản bị lộ mật khẩu"
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
