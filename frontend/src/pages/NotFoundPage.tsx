import { Button, Result } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

/** `message`: what was not found; by default, the page. */
export function NotFoundPage({ message }: { message?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Result
      status="404"
      title="404"
      subTitle={message ?? t('load.notFound')}
      extra={
        <Button type="primary" size="large" shape="round" onClick={() => navigate('/')}>
          {t('common.goHome')}
        </Button>
      }
    />
  )
}
