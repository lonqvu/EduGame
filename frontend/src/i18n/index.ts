import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from '@/i18n/locales/en'
import { vi } from '@/i18n/locales/vi'
import { readCachedDisplay } from '@/utils/settings'

/**
 * The languages of the app's screens. Vietnamese is the source and the fallback: a key English lacks shows in
 * Vietnamese rather than as a key.
 *
 * English is offered only where ENGLISH_ENABLED (development, or a build with VITE_ENGLISH=true) until every screen
 * is translated; elsewhere the app stays in Vietnamese whatever was saved.
 */
export type Language = 'vi' | 'en'

export const ENGLISH_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENGLISH === 'true'

export const LANGUAGES: Language[] = ENGLISH_ENABLED ? ['vi', 'en'] : ['vi']

/** The language to show for a saved choice (none, or one not offered: Vietnamese). */
export const shownLanguage = (saved: string | undefined): Language => (saved === 'en' && ENGLISH_ENABLED ? 'en' : 'vi')

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  // The language kept in this browser, so the first screen is already in it (no flash of Vietnamese).
  lng: shownLanguage(readCachedDisplay().language),
  fallbackLng: 'vi',
  // React escapes what it renders.
  interpolation: { escapeValue: false },
  returnNull: false,
})

/** Shows the screens in `language`, and says so to the browser (screen readers, spelling, hyphenation). */
export function applyLanguage(language: Language) {
  document.documentElement.lang = language
  if (i18n.language !== language) void i18n.changeLanguage(language)
}

export { i18n }
