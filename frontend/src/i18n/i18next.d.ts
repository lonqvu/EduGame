import 'i18next'
import type { Translation } from '@/i18n/locales/vi'

// t('nav.home') is checked against vi.ts: a key that does not exist does not compile.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: Translation }
  }
}
