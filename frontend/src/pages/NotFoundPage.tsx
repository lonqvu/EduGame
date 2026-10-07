import { Button, Result } from 'antd'
import { useNavigate } from 'react-router'

export function NotFoundPage({ message = 'Trang bạn tìm không tồn tại.' }: { message?: string }) {
  const navigate = useNavigate()

  return (
    <Result
      status="404"
      title="404"
      subTitle={message}
      extra={
        <Button type="primary" size="large" shape="round" onClick={() => navigate('/')}>
          Về trang chủ
        </Button>
      }
    />
  )
}
