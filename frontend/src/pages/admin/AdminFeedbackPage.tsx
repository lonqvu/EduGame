import { App, Button, Modal, Pagination, Segmented, Select, Tag } from 'antd'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { exportFeedback, getFeedbackScreenshot, listAdminFeedback, updateFeedbackStatus } from '@/api/adminApi'
import { ImageIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { AdminCard, AdminHeader } from '@/pages/admin/AdminParts'
import { useRemote } from '@/pages/admin/useRemote'
import type { AdminFeedback, AdminFeedbackPage as FeedbackPage, FeedbackStatus } from '@/types/api'
import { adminErrorMessage, count, dateTime, FEEDBACK_STATUS_LABELS, feedbackKindLabel, oneOf, pageParam } from '@/utils/admin'
import { download } from '@/utils/download'
import { FEEDBACK_KINDS, RATINGS } from '@/utils/feedback'

const PAGE_SIZE = 20
const FILTERS = ['NEW', 'SEEN', 'DONE', 'ALL'] as const
type Filter = (typeof FILTERS)[number]
const STATUSES: FeedbackStatus[] = ['NEW', 'SEEN', 'DONE']
const KIND_COLORS: Record<string, string> = { BUG: 'red', IDEA: 'gold', PRAISE: 'green', OTHER: 'default' }

/** /admin/feedback — what teachers sent from "Góp ý": read, mark, look at the screenshot, download as CSV. */
export function AdminFeedbackPage() {
  const { message } = App.useApp()
  const [params, setParams] = useSearchParams()
  const filter = oneOf<Filter>(params.get('status'), FILTERS, 'NEW')
  const page = pageParam(params.get('page'))
  const statuses: FeedbackStatus[] = filter === 'ALL' ? [] : [filter]
  const { data, loading, error, reload, replace } = useRemote(`${filter}|${page}`, (signal) =>
    listAdminFeedback({ status: statuses, page, size: PAGE_SIZE }, signal),
  )
  const [exporting, setExporting] = useState(false)

  const setStatus = async (item: AdminFeedback, status: FeedbackStatus) => {
    try {
      const updated = await updateFeedbackStatus(item.code, status)
      if (data) replace({ ...data, items: data.items.map((f) => (f.code === updated.code ? updated : f)) } satisfies FeedbackPage)
    } catch (e) {
      message.error(adminErrorMessage(e))
    }
  }

  const downloadCsv = async () => {
    setExporting(true)
    try {
      download(`gop-y-lop-vui-${new Date().toISOString().slice(0, 10)}.csv`, await exportFeedback(statuses))
    } catch (e) {
      message.error(adminErrorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title="Góp ý" text="Những gì giáo viên gửi từ nút Góp ý: lỗi, đề xuất, lời khen. Đánh dấu khi đã xem hoặc đã xử lý." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          aria-label="Trạng thái góp ý"
          value={filter}
          onChange={(value) => setParams(value === 'NEW' ? {} : { status: value }, { replace: true })}
          options={[
            { value: 'NEW', label: FEEDBACK_STATUS_LABELS.NEW },
            { value: 'SEEN', label: FEEDBACK_STATUS_LABELS.SEEN },
            { value: 'DONE', label: FEEDBACK_STATUS_LABELS.DONE },
            { value: 'ALL', label: 'Tất cả' },
          ]}
        />
        <div className="flex items-center gap-3">
          {data && <span className="text-[14px] text-ink-muted">{count(data.total)} góp ý</span>}
          <Button onClick={() => void downloadCsv()} loading={exporting} disabled={!data?.total}>
            Tải file CSV
          </Button>
        </div>
      </div>

      {!data ? (
        error ? (
          <LoadError onRetry={reload} />
        ) : (
          <PageLoading />
        )
      ) : data.items.length === 0 ? (
        <AdminCard>
          <p className="m-0 py-6 text-center text-[15px] text-ink-muted">
            {filter === 'NEW' ? 'Không có góp ý mới. Đội đã đọc hết rồi!' : 'Không có góp ý nào.'}
          </p>
        </AdminCard>
      ) : (
        <div aria-busy={loading} className={`flex flex-col gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <ul aria-label="Danh sách góp ý" className="m-0 flex list-none flex-col gap-3 p-0">
            {data.items.map((f) => (
              <FeedbackItem key={f.code} feedback={f} onStatus={(status) => void setStatus(f, status)} />
            ))}
          </ul>
          {data.total > PAGE_SIZE && (
            <Pagination
              className="self-center"
              current={page + 1}
              pageSize={PAGE_SIZE}
              total={data.total}
              showSizeChanger={false}
              onChange={(next) => setParams({ ...(filter === 'NEW' ? {} : { status: filter }), ...(next > 1 ? { page: String(next - 1) } : {}) })}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FeedbackItem({ feedback: f, onStatus }: { feedback: AdminFeedback; onStatus: (status: FeedbackStatus) => void }) {
  const kind = FEEDBACK_KINDS.find((k) => k.kind === f.kind)
  const rating = RATINGS.find((r) => r.value === f.rating)
  return (
    <li aria-label={`Góp ý ${f.code}`} className="flex flex-col gap-3 rounded-[18px] bg-white p-[18px] shadow-[0_1px_2px_rgba(31,42,68,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <Tag color={KIND_COLORS[f.kind]} className="m-0">
              {kind?.emoji} {feedbackKindLabel(f.kind)}
            </Tag>
            {rating && (
              <span title={rating.label} className="text-[18px]">
                {rating.emoji} <span className="sr-only">{rating.label}</span>
              </span>
            )}
            <span className="font-bold">{f.teacher?.displayName ?? 'Tài khoản đã xoá'}</span>
            {f.teacher?.email &&
              (f.contactOk ? (
                <a href={`mailto:${f.teacher.email}?subject=${encodeURIComponent('Lớp vui trả lời góp ý ' + f.code)}`} className="text-[14px]">
                  {f.teacher.email}
                </a>
              ) : (
                <span className="text-[14px] text-ink-muted">{f.teacher.email} (không muốn được liên hệ)</span>
              ))}
          </span>
          <span className="text-[13px] text-ink-muted">
            {dateTime(f.createdAt)} · {f.code}
          </span>
        </div>
        <Select<FeedbackStatus>
          aria-label={`Trạng thái góp ý ${f.code}`}
          value={f.status}
          onChange={onStatus}
          options={STATUSES.map((s) => ({ value: s, label: FEEDBACK_STATUS_LABELS[s] }))}
          className="w-[130px]"
        />
      </div>
      <p className="m-0 text-[15px] leading-[1.55] break-words whitespace-pre-wrap">{f.message}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
        {f.page && <span>Trang: {f.page}</span>}
        {(f.device || f.viewport) && <span>{[f.device, f.viewport && `cửa sổ ${f.viewport}`].filter(Boolean).join(', ')}</span>}
        {f.appVersion && <span>Bản {f.appVersion}</span>}
        {f.screenshotUrl && <ScreenshotButton url={f.screenshotUrl} code={f.code} />}
      </div>
    </li>
  )
}

/** The screenshot needs the admin's token: fetched when asked for, shown in a dialog. */
function ScreenshotButton({ url, code }: { url: string; code: string }) {
  const { message } = App.useApp()
  const [src, setSrc] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [loading, setLoading] = useState(false)

  const open = async () => {
    setLoading(true)
    try {
      setSrc(URL.createObjectURL(await getFeedbackScreenshot(url)))
      setShown(true)
    } catch (e) {
      message.error(adminErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="small" icon={<ImageIcon size={15} />} loading={loading} onClick={() => void open()}>
        Xem ảnh màn hình
      </Button>
      <Modal
        open={shown}
        title={`Ảnh màn hình · ${code}`}
        footer={null}
        width={960}
        onCancel={() => setShown(false)}
        afterClose={() => {
          if (src) URL.revokeObjectURL(src)
          setSrc(null)
        }}
        destroyOnHidden
      >
        {src && <img src={src} alt={`Ảnh màn hình góp ý ${code}`} className="block h-auto w-full rounded-[10px] border border-line-soft" />}
      </Modal>
    </>
  )
}
