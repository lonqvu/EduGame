import { App, Button, Checkbox, Modal, Select, Spin, Upload } from 'antd'
import { useMemo, useState } from 'react'
import { DocumentIcon, FileTextIcon } from '@/components/ui/icons'
import { apiErrorMessage } from '@/utils/apiError'
import {
  ClassListFileError,
  type Detection,
  detectNameColumns,
  extractNames,
  readClassListFile,
  reviewNames,
  type Rows,
  STATUS_NOTES,
} from '@/utils/classListFile'
import { MAX_STUDENTS } from '@/utils/classrooms'

const TEMPLATE = '/assets/classes/mau-danh-sach-lop.xlsx'

interface ImportStudentsModalProps {
  open: boolean
  /** "Lớp 3A" */
  classTitle: string
  /** Names already in the class (not ticked when the file has them too) */
  inClass: string[]
  onClose: () => void
  onAdd: (names: string[]) => Promise<unknown>
}

/**
 * "Nhập từ file": the teacher picks an Excel or CSV class list, checks the names found (and the column they come
 * from), then adds the ticked ones at the end of the class list. The file never leaves the browser: only the names
 * are sent.
 */
export function ImportStudentsModal(props: ImportStudentsModalProps) {
  // Each opening starts from choosing a file.
  return props.open ? <ImportDialog {...props} /> : null
}

interface Loaded {
  fileName: string
  rows: Rows
  detection: Detection
}

function ImportDialog({ classTitle, inClass, onClose, onAdd }: ImportStudentsModalProps) {
  const { message } = App.useApp()
  const [loaded, setLoaded] = useState<Loaded>()
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [columnKey, setColumnKey] = useState<string>()
  /** Ticks the teacher changed, by row; the others follow the review. */
  const [ticks, setTicks] = useState<Map<number, boolean>>(new Map())
  const [saving, setSaving] = useState(false)

  const read = async (file: File) => {
    setReading(true)
    setError('')
    try {
      const rows = await readClassListFile(file)
      const detection = detectNameColumns(rows)
      setLoaded({ fileName: file.name, rows, detection })
      setColumnKey(detection.choice?.key)
      setTicks(new Map())
    } catch (e) {
      setError(e instanceof ClassListFileError ? e.message : 'Không đọc được file này. Cô chọn file Excel (.xlsx) hoặc CSV nhé.')
    } finally {
      setReading(false)
    }
  }

  const column = loaded?.detection.choices.find((c) => c.key === columnKey)
  const candidates = useMemo(() => {
    if (!loaded || !column) return []
    return reviewNames(extractNames(loaded.rows, loaded.detection.headerRow, column.columns), inClass)
  }, [loaded, column, inClass])
  const isTicked = (row: number, fallback: boolean) => ticks.get(row) ?? fallback
  const chosen = candidates.filter((c) => c.status !== 'too-long' && isTicked(c.row, c.selected))
  const room = MAX_STUDENTS - inClass.length
  const tooMany = chosen.length > room

  const tick = (row: number, value: boolean) => setTicks((t) => new Map(t).set(row, value))
  const tickAll = (value: boolean) => setTicks(new Map(candidates.filter((c) => c.status !== 'too-long').map((c) => [c.row, value])))

  const add = async () => {
    setSaving(true)
    try {
      await onAdd(chosen.map((c) => c.name))
      message.success(`Đã thêm ${chosen.length} học sinh vào ${classTitle}`)
      onClose()
    } catch (e) {
      message.error(apiErrorMessage(e))
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={`Nhập danh sách ${classTitle} từ file`}
      onCancel={onClose}
      width={640}
      footer={
        loaded
          ? [
              <Button key="cancel" onClick={onClose}>
                Hủy
              </Button>,
              <Button key="add" type="primary" loading={saving} disabled={!chosen.length || tooMany} onClick={() => void add()}>
                {chosen.length ? `Thêm ${chosen.length} học sinh` : 'Thêm học sinh'}
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={onClose}>
                Hủy
              </Button>,
            ]
      }
    >
      {!loaded ? (
        <div className="flex flex-col gap-3 pt-2">
          <Upload.Dragger
            accept=".xlsx,.csv,.txt"
            showUploadList={false}
            disabled={reading}
            beforeUpload={(file) => {
              void read(file)
              return false
            }}
          >
            <div className="flex flex-col items-center gap-2 px-4 py-6">
              {reading ? (
                <Spin />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <FileTextIcon size={28} />
                </span>
              )}
              <span className="text-[16px] font-extrabold text-ink">{reading ? 'Đang đọc file…' : 'Kéo thả file vào đây, hoặc bấm để chọn'}</span>
              <span className="text-[13.5px] text-ink-muted">File Excel (.xlsx) hoặc CSV, tối đa 2 MB. Chỉ lấy họ tên học sinh.</span>
            </div>
          </Upload.Dragger>
          {error && (
            <p role="alert" className="m-0 rounded-[12px] bg-[#FDECEC] px-3.5 py-2.5 text-[14px] font-bold text-danger">
              {error}
            </p>
          )}
          <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13.5px] text-ink-muted">
            Dùng được file xuất từ vnEdu, SMAS hay danh sách lớp tự soạn.
            <a href={TEMPLATE} download="mau-danh-sach-lop.xlsx" className="inline-flex items-center gap-1 font-bold">
              <DocumentIcon size={15} /> Tải file mẫu
            </a>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-surface-soft px-3.5 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-[14px] font-bold">
              <FileTextIcon size={18} className="shrink-0 text-primary" />
              <span className="truncate">{loaded.fileName}</span>
            </span>
            <Button size="small" type="link" onClick={() => setLoaded(undefined)} className="px-0 font-bold">
              Chọn file khác
            </Button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-ink-soft">Cột họ tên học sinh</span>
            <Select
              aria-label="Cột họ tên học sinh"
              value={columnKey}
              placeholder="Chọn cột chứa tên các em"
              onChange={(key) => {
                setColumnKey(key)
                setTicks(new Map())
              }}
              options={loaded.detection.choices.map((c) => ({ value: c.key, label: c.label }))}
            />
          </label>

          {!column ? (
            <p role="status" className="m-0 rounded-[12px] bg-[#FFF6E5] px-3.5 py-2.5 text-[14px] text-sun-ink">
              Không tìm thấy cột “Họ và tên” trong file. Cô chọn cột chứa tên các em ở trên nhé.
            </p>
          ) : candidates.length === 0 ? (
            <p role="status" className="m-0 rounded-[12px] bg-[#FFF6E5] px-3.5 py-2.5 text-[14px] text-sun-ink">
              Cột này không có tên học sinh nào. Cô thử chọn cột khác nhé.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 text-[13.5px]">
                <span className="text-ink-muted">Tìm thấy {candidates.length} tên</span>
                <span className="flex gap-3">
                  <button type="button" onClick={() => tickAll(true)} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-bold text-primary">
                    Chọn tất cả
                  </button>
                  <button type="button" onClick={() => tickAll(false)} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-bold text-ink-muted">
                    Bỏ chọn
                  </button>
                </span>
              </div>
              <ul aria-label="Học sinh trong file" className="m-0 flex max-h-[300px] list-none flex-col overflow-y-auto rounded-[12px] border border-line-soft p-0">
                {candidates.map((c) => (
                  <li key={c.row} className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-b-0">
                    <Checkbox
                      checked={c.status !== 'too-long' && isTicked(c.row, c.selected)}
                      disabled={c.status === 'too-long'}
                      onChange={(e) => tick(c.row, e.target.checked)}
                      aria-label={c.name}
                    />
                    <span className="w-[58px] shrink-0 text-[12.5px] text-ink-muted tabular-nums">Dòng {c.row}</span>
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold">{c.name}</span>
                    {c.status !== 'new' && (
                      <span className="shrink-0 rounded-full bg-[#FFF1C7] px-2 py-0.5 text-[12px] font-bold text-sun-ink">{STATUS_NOTES[c.status]}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p role="status" className={`m-0 text-[14px] ${tooMany ? 'font-bold text-danger' : 'text-ink-muted'}`}>
            {tooMany
              ? `Lớp còn chỗ cho ${room} học sinh (tối đa ${MAX_STUDENTS}), cô bỏ chọn ${chosen.length - room} em nhé.`
              : `Đã chọn ${chosen.length} em, thêm vào cuối danh sách. Lớp còn chỗ cho ${room} em.`}
          </p>
        </div>
      )}
    </Modal>
  )
}
