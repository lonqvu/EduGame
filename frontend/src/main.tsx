import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import { App as AntApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { RouterProvider } from 'react-router'
import { router } from '@/router'
import { antdTheme } from '@/theme/antdTheme'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <ConfigProvider locale={viVN} theme={antdTheme}>
        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
)
