import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import { AppRoot } from '@/AppRoot'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <AppRoot />
    </StyleProvider>
  </StrictMode>,
)
