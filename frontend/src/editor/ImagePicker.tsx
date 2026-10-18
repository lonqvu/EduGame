import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { uploadGameImage } from '@/api/assetApi'
import { apiErrorMessage } from '@/utils/apiError'
import { ACCEPTED_IMAGE_TYPES, assetSrc, ImageFileError, prepareImage } from '@/utils/images'

interface ImagePickerProps {
  /** Code of the game the image is uploaded to. */
  gameId: string
  value?: string
  onChange: (url: string | undefined) => void
}

interface Upload {
  /** Local preview while the file goes up. */
  preview: string
  /** 0–1. */
  progress: number
  controller: AbortController
}

/**
 * Image of a question: picked, dropped or pasted, shrunk in the browser, then uploaded at once. The question only
 * gets the server URL once the upload is done, so a half-uploaded image is never saved.
 */
export function ImagePicker({ gameId, value, onChange }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [upload, setUpload] = useState<Upload>()
  const [error, setError] = useState<string>()

  const uploadRef = useRef(upload)
  useEffect(() => {
    uploadRef.current = upload
  })
  // Switching to another question stops an upload still going.
  useEffect(
    () => () => {
      uploadRef.current?.controller.abort()
      if (uploadRef.current) URL.revokeObjectURL(uploadRef.current.preview)
    },
    [],
  )

  const pick = async (file: File | undefined) => {
    if (!file || upload) return
    setError(undefined)
    const controller = new AbortController()
    const preview = URL.createObjectURL(file)
    setUpload({ preview, progress: 0, controller })
    try {
      const ready = await prepareImage(file)
      if (controller.signal.aborted) return
      const asset = await uploadGameImage(gameId, ready, {
        signal: controller.signal,
        onProgress: (progress) => setUpload((u) => (u && { ...u, progress })),
      })
      onChange(asset.url)
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof ImageFileError ? e.message : apiErrorMessage(e))
    } finally {
      URL.revokeObjectURL(preview)
      setUpload((u) => (u?.controller === controller ? undefined : u))
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void pick(e.dataTransfer.files[0])
  }

  const onPaste = (e: ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    void pick(file)
  }

  const shown = upload?.preview ?? assetSrc(value)
  const percent = Math.round((upload?.progress ?? 0) * 100)

  return (
    <div className="flex flex-col gap-2">
      <span className="font-extrabold">
        Hình ảnh <span className="font-semibold text-ink-soft">(không bắt buộc)</span>
      </span>
      <div
        role="group"
        aria-label="Hình của câu hỏi"
        tabIndex={0}
        onPaste={onPaste}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-wrap items-center gap-[18px] rounded-[18px] border-2 border-dashed p-[22px] outline-none focus-visible:border-primary ${
          dragging ? 'border-primary bg-primary-soft' : error ? 'border-danger bg-[#FFF6F5]' : 'border-line-strong bg-[#FAFBFE]'
        }`}
      >
        <div className="relative h-[90px] w-[120px] shrink-0 overflow-hidden rounded-[14px]">
          {shown ? (
            <img src={shown} alt="Hình của câu hỏi" className={`h-full w-full object-cover ${upload ? 'opacity-50' : ''}`} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#FFE3D8] text-center text-sm font-bold text-[#8A3A16]">
              Chưa có hình
            </div>
          )}
          {upload && (
            <div className="absolute inset-x-2 bottom-2 h-2 overflow-hidden rounded-full bg-white/80">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(percent, 6)}%` }} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {upload ? (
            <span role="status" className="font-bold text-primary-ink">
              Đang tải ảnh lên… {percent}%
            </span>
          ) : (
            <span className="text-ink-soft">Kéo ảnh vào đây, dán ảnh (Ctrl+V) hoặc</span>
          )}
          <div className="flex flex-wrap gap-2">
            {upload ? (
              <button
                type="button"
                onClick={() => upload.controller.abort()}
                className="min-h-12 cursor-pointer self-start rounded-full border-2 border-line bg-white px-5 py-2.5 font-[inherit] font-extrabold text-ink hover:border-danger"
              >
                Hủy tải
              </button>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="min-h-12 cursor-pointer self-start rounded-full border-2 border-line bg-white px-5 py-2.5 font-[inherit] font-extrabold text-ink hover:border-primary"
              >
                {value ? 'Đổi ảnh' : 'Chọn ảnh từ máy'}
              </button>
            )}
            {value && !upload && (
              <button
                type="button"
                onClick={() => {
                  setError(undefined)
                  onChange(undefined)
                }}
                className="min-h-12 cursor-pointer border-0 bg-transparent px-3 font-[inherit] font-bold text-danger hover:underline"
              >
                Bỏ hình
              </button>
            )}
          </div>
          <span className="text-[13px] text-ink-soft">PNG, JPG, GIF hoặc WEBP. Ảnh lớn được tự thu nhỏ.</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            hidden
            aria-label="Chọn ảnh từ máy"
            onChange={(e) => {
              void pick(e.target.files?.[0])
              // The same file can be picked again after an error.
              e.target.value = ''
            }}
          />
        </div>
      </div>
      {error && (
        <span role="alert" className="text-[15px] font-bold text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
