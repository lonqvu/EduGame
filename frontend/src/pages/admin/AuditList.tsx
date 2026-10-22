import type { AdminAuditEntry } from '@/types/api'
import { ACTION_LABELS, auditDetail, dateTime } from '@/utils/admin'

/** Lines of the admin log, newest first. `withTarget`: also say who or what it was done to. */
export function AuditList({ entries, withTarget = false }: { entries: AdminAuditEntry[]; withTarget?: boolean }) {
  if (!entries.length) return <p className="m-0 text-[14px] text-ink-muted">Chưa có thao tác nào.</p>
  return (
    <ol aria-label="Nhật ký quản trị" className="m-0 flex list-none flex-col p-0">
      {entries.map((e) => {
        const detail = auditDetail(e)
        return (
          <li key={e.id} className="flex flex-col gap-0.5 border-b border-line-soft py-3 first:pt-0 last:border-b-0 last:pb-0">
            <span className="text-[14.5px]">
              <b>{ACTION_LABELS[e.action] ?? e.action}</b>
              {withTarget && e.targetLabel && <span className="text-ink-soft"> · {e.targetLabel}</span>}
            </span>
            {detail && <span className="text-[13.5px] text-ink-soft">{detail}</span>}
            <span className="text-[13px] text-ink-muted">
              {e.actorName} · {dateTime(e.createdAt)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
