import { admin } from '@/i18n/locales/en/admin'
import { app } from '@/i18n/locales/en/app'
import { auth } from '@/i18n/locales/en/auth'
import { chooser } from '@/i18n/locales/en/chooser'
import { classes } from '@/i18n/locales/en/classes'
import { editor } from '@/i18n/locales/en/editor'
import { errors } from '@/i18n/locales/en/errors'
import { feedback } from '@/i18n/locales/en/feedback'
import { games } from '@/i18n/locales/en/games'
import { home } from '@/i18n/locales/en/home'
import { play } from '@/i18n/locales/en/play'
import { profile } from '@/i18n/locales/en/profile'
import { questionSets } from '@/i18n/locales/en/questionSets'
import { registry } from '@/i18n/locales/en/registry'
import { reports } from '@/i18n/locales/en/reports'
import { settings } from '@/i18n/locales/en/settings'
import { start } from '@/i18n/locales/en/start'
import { utilities } from '@/i18n/locales/en/utilities'
import type { Strings } from '@/i18n/locales/types'
import type { Translation } from '@/i18n/locales/vi'

/**
 * English. Same keys as vi.ts (TypeScript refuses a missing or extra one). Not a word-for-word translation: written
 * as an English-speaking teacher would read it, with the terms of src/i18n/GLOSSARY.md.
 */
export const en: Strings<Translation> = {
  ...app,
  admin,
  auth,
  chooser,
  classes,
  editor,
  errors,
  feedback,
  games,
  home,
  play,
  profile,
  questionSets,
  registry,
  reports,
  settings,
  start,
  utilities,
}
