import { App, Button, Card, Modal, Segmented, Select, Space, Table, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { exportFeedback, getFeedbackScreenshot, listAdminFeedback, updateFeedbackStatus } from '@/api/adminApi'
import { PageTitle } from '@/admin/parts'
import { useRemote } from '@/admin/useRemote'
import { LoadError } from '@/components/ui/LoadState'
import type { AdminFeedback, FeedbackStatus } from '@/types/api'
import { adminErrorMessage, dateTime, FEEDBACK_STATUS_LABELS, feedbackKindLabel, oneOf, pageParam } from '@/utils/admin'
import { download } from '@/utils/download'
import { RATINGS } from '@/utils/feedback'

const PAGE_SIZE = 20
const FILTERS = ['NEW', 'SEEN', 'DONE', 'ALL'] as const
type Filter = (typeof FILTERS)[number]
const STATUSES: FeedbackStatus[] = ['NEW', 'SEEN', 'DONE']
const KIND_COLORS: Record<string, string> = { BUG: 'red', IDEA: 'gold', PRAISE: 'green', OTHER: 'default' }

/** /admin/feedback — what teachers and visitors sent from "Góp ý": read, mark, see the screenshot, download as CSV. */
export function FeedbackPage() {
  const { t } = useTranslation()
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
      if (data) replace({ ...data, items: data.items.map((f) => (f.code === updated.code ? updated : f)) })
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
    <>
      <PageTitle
        title={t('admin.feedback.title')}
        text={data ? t('admin.feedback.count', { count: data.total }) : t('admin.feedback.text')}
        extra={
          <>
            <Segmented<Filter>
              aria-label={t('admin.feedback.statusLabel')}
              value={filter}
              onChange={(value) => setParams(value === 'NEW' ? {} : { status: value }, { replace: true })}
              options={[...STATUSES.map((s) => ({ value: s as Filter, label: FEEDBACK_STATUS_LABELS[s] })), { value: 'ALL', label: t('admin.feedback.all') }]}
            />
            <Button onClick={() => void downloadCsv()} loading={exporting} disabled={!data?.total}>
              {t('admin.feedback.csv')}
            </Button>
          </>
        }
      />
      {error && !data ? (
        <LoadError onRetry={reload} />
      ) : (
        <Card size="small">
          <Table<AdminFeedback>
            rowKey="code"
            loading={loading}
            dataSource={data?.items ?? []}
            scroll={{ x: 960 }}
            locale={{ emptyText: filter === 'NEW' ? t('admin.feedback.noneNew') : t('admin.feedback.none') }}
            expandable={{ expandedRowRender: (f) => <Details feedback={f} />, expandRowByClick: true }}
            pagination={{
              current: page + 1,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              showSizeChanger: false,
              hideOnSinglePage: true,
              onChange: (next) => setParams({ ...(filter === 'NEW' ? {} : { status: filter }), ...(next > 1 ? { page: String(next - 1) } : {}) }),
            }}
            columns={[
              { title: t('admin.feedback.columns.date'), key: 'date', width: 140, render: (_, f) => dateTime(f.createdAt) },
              {
                title: t('admin.feedback.columns.kind'),
                key: 'kind',
                width: 140,
                render: (_, f) => {
                  const rating = RATINGS.find((r) => r.value === f.rating)
                  return (
                    <Space size={4}>
                      <Tag color={KIND_COLORS[f.kind]}>{feedbackKindLabel(f.kind)}</Tag>
                      {rating && <span title={rating.label}>{rating.emoji}</span>}
                    </Space>
                  )
                },
              },
              { title: t('admin.feedback.columns.from'), key: 'from', width: 200, render: (_, f) => <Sender feedback={f} /> },
              {
                title: t('admin.feedback.columns.message'),
                key: 'message',
                render: (_, f) => (
                  <Typography.Paragraph ellipsis={{ rows: 2 }} className="!mb-0">
                    {f.message}
                  </Typography.Paragraph>
                ),
              },
              {
                title: t('admin.feedback.columns.status'),
                key: 'status',
                width: 140,
                render: (_, f) => (
                  // Changing the status must not open or close the row.
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select<FeedbackStatus>
                      size="small"
                      aria-label={t('admin.feedback.itemStatus', { code: f.code })}
                      value={f.status}
                      onChange={(status) => void setStatus(f, status)}
                      options={STATUSES.map((s) => ({ value: s, label: FEEDBACK_STATUS_LABELS[s] }))}
                      style={{ width: 120 }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}
    </>
  )
}

function Sender({ feedback: f }: { feedback: AdminFeedback }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col">
      <span>{f.teacher?.displayName ?? (f.guest ? t('admin.feedback.guest') : t('admin.feedback.deletedAccount'))}</span>
      {f.teacher?.email && <span className="text-[12px] text-[rgba(0,0,0,0.45)]">{f.teacher.email}</span>}
    </div>
  )
}

/** The whole message and where it was sent from. */
function Details({ feedback: f }: { feedback: AdminFeedback }) {
  const { t } = useTranslation()
  const facts = [
    f.code,
    f.page && t('admin.feedback.page', { page: f.page }),
    f.device,
    f.viewport && t('admin.feedback.window', { size: f.viewport }),
    f.appVersion && t('admin.feedback.version', { version: f.appVersion }),
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-2 px-2">
      <Typography.Paragraph className="!mb-0 whitespace-pre-wrap">{f.message}</Typography.Paragraph>
      <Space wrap size={[16, 4]}>
        <Typography.Text type="secondary">{facts.join(' · ')}</Typography.Text>
        {f.teacher?.email &&
          (f.contactOk ? (
            <a href={`mailto:${f.teacher.email}?subject=${encodeURIComponent(t('admin.feedback.replySubject', { code: f.code }))}`}>{f.teacher.email}</a>
          ) : (
            <Typography.Text type="secondary">{t('admin.feedback.noContact', { email: f.teacher.email })}</Typography.Text>
          ))}
        {f.screenshotUrl && <ScreenshotButton url={f.screenshotUrl} code={f.code} />}
      </Space>
    </div>
  )
}

/** The screenshot needs the admin's token: fetched when asked for, shown in a dialog. */
function ScreenshotButton({ url, code }: { url: string; code: string }) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const open = async () => {
    setLoading(true)
    try {
      setSrc(URL.createObjectURL(await getFeedbackScreenshot(url)))
    } catch (e) {
      message.error(adminErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="small" loading={loading} onClick={() => void open()}>
        {t('admin.feedback.screenshot')}
      </Button>
      <Modal
        open={src !== null}
        title={t('admin.feedback.screenshotTitle', { code })}
        footer={null}
        width={960}
        onCancel={() => {
          if (src) URL.revokeObjectURL(src)
          setSrc(null)
        }}
        destroyOnHidden
      >
        {src && <img src={src} alt={t('admin.feedback.screenshotAlt', { code })} className="block h-auto w-full rounded border border-[#f0f0f0]" />}
      </Modal>
    </>
  )
}
