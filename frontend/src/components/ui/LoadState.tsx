import { Button, Result, Spin } from 'antd'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <Result
      status="warning"
      title={t('load.errorTitle')}
      subTitle={t('load.errorText')}
      extra={
        <Button type="primary" size="large" shape="round" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      }
    />
  )
}
