import { admin } from '@/i18n/locales/vi/admin'
import { app } from '@/i18n/locales/vi/app'
import { auth } from '@/i18n/locales/vi/auth'
import { chooser } from '@/i18n/locales/vi/chooser'
import { classes } from '@/i18n/locales/vi/classes'
import { editor } from '@/i18n/locales/vi/editor'
import { errors } from '@/i18n/locales/vi/errors'
import { feedback } from '@/i18n/locales/vi/feedback'
import { games } from '@/i18n/locales/vi/games'
import { home } from '@/i18n/locales/vi/home'
import { play } from '@/i18n/locales/vi/play'
import { profile } from '@/i18n/locales/vi/profile'
import { questionSets } from '@/i18n/locales/vi/questionSets'
import { registry } from '@/i18n/locales/vi/registry'
import { reports } from '@/i18n/locales/vi/reports'
import { settings } from '@/i18n/locales/vi/settings'
import { start } from '@/i18n/locales/vi/start'

/**
 * Vietnamese, the source language: every key starts here (one file per area in vi/), en.ts follows its shape
 * (checked by TypeScript, and by locales.test.ts for the {{placeholders}}). Rules: src/i18n/GLOSSARY.md.
 *
 * A key with a count has the forms `_one` and `_other` (Vietnamese writes both the same; English differs).
 */
export const vi = {
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
}

export type Translation = typeof vi
