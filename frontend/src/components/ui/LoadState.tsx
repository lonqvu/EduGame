import { Button, Result, Spin } from 'antd'

/** Centered spinner while a page's data loads. */
export function PageLoading() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center">
      <Spin size="large" />
    </div>
  )
}

/** The page's data could not be loaded (backend down, network...). */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Result
      status="warning"
      title="Chưa tải được dữ liệu"
      subTitle="Cô kiểm tra kết nối mạng rồi thử lại nhé."
      extra={
        <Button type="primary" size="large" shape="round" onClick={onRetry}>
          Thử lại
        </Button>
      }
    />
  )
}
