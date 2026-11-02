import { App as AntApp, ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import viVN from 'antd/locale/vi_VN'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { applyLanguage, shownLanguage } from '@/i18n'
import { router } from '@/router'
import { useSettingsStore } from '@/store/settingsStore'
import { antdTheme } from '@/theme/antdTheme'

/** The saved language on every screen, signed in or not (antd's own texts too: date pickers, empty lists...). */
export function AppRoot() {
  const language = shownLanguage(useSettingsStore((s) => s.settings.display.language))
  useEffect(() => applyLanguage(language), [language])
  return (
    <ConfigProvider locale={language === 'en' ? enUS : viVN} theme={antdTheme}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}
