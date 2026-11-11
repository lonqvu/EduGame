import { App } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { SearchIcon } from '@/components/ui/icons'
import type { Translation } from '@/i18n/locales/vi'
import { fold } from '@/utils/classrooms'

type ToolKey = keyof Translation['utilities']['tools']
type Group = 'make' | 'files'

interface Utility {
  key: ToolKey
  group: Group
  icon: string
  tint: string
  /** Its page; none: still being built ("Sắp có"). */
  to?: string
}

const UTILITIES: Utility[] = [
  { key: 'handwriting', group: 'make', icon: '✍️', tint: '#EDE4FF', to: '/utilities/handwriting' },
  { key: 'math', group: 'make', icon: '➕', tint: '#E3F6EC' },
  { key: 'dictation', group: 'make', icon: '🔊', tint: '#FFF1D6' },
  { key: 'flashcards', group: 'make', icon: '🃏', tint: '#E3ECFF' },
  { key: 'fonts', group: 'files', icon: '🔤', tint: '#FDE8E8' },
  { key: 'imagesToPdf', group: 'files', icon: '🖼️', tint: '#E1F1FB' },
  { key: 'pdf', group: 'files', icon: '📑', tint: '#FFF6D6' },
  { key: 'compress', group: 'files', icon: '🗜️', tint: '#F2F5FA' },
  { key: 'qr', group: 'files', icon: '🔳', tint: '#F2F5FA' },
  { key: 'ocr', group: 'files', icon: '📷', tint: '#F2F5FA' },
]

const GROUPS: Group[] = ['make', 'files']

/**
 * /utilities — "Tiện ích": tools for preparing lessons and handling files, apart from the class. They run in the
 * browser (nothing is uploaded), so visitors use them too. A tool not built yet shows "Sắp có".
 */
export function UtilitiesPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<Group | 'all'>('all')

  const words = fold(query).split(/\s+/).filter(Boolean)
  const shown = UTILITIES.filter(
    (u) =>
      (group === 'all' || u.group === group) &&
      words.every((w) => fold(`${t(`utilities.tools.${u.key}.name`)} ${t(`utilities.tools.${u.key}.text`)}`).includes(w)),
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('utilities.title')} text={t('utilities.text')} />

      <div className="flex flex-wrap items-center gap-2 rounded-[16px] bg-white p-2 shadow-[0_4px_14px_rgba(31,42,68,0.07)]">
        <label className="flex h-10 min-w-0 flex-[1_1_100%] items-center gap-2.5 rounded-full bg-[#F2F5FA] px-4 focus-within:ring-2 focus-within:ring-primary/40 md:flex-[0_1_320px]">
          <SearchIcon size={17} className="shrink-0 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('utilities.search')}
            aria-label={t('utilities.searchLabel')}
            className="min-w-0 flex-1 border-0 bg-transparent font-[inherit] text-[14.5px] text-ink outline-none"
          />
        </label>
        <div role="radiogroup" aria-label={t('utilities.groups')} className="flex flex-wrap gap-1.5">
          {(['all', ...GROUPS] as const).map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={group === g}
              onClick={() => setGroup(g)}
              className={`h-9 cursor-pointer rounded-full border-0 px-3.5 font-[inherit] text-[14px] font-extrabold whitespace-nowrap ${
                group === g ? 'bg-primary text-white' : 'bg-[#F2F5FA] text-[#3D4766] hover:bg-primary-soft'
              }`}
            >
              {g === 'all' ? t('utilities.all') : t(`utilities.${g}.chip`)}
            </button>
          ))}
        </div>
      </div>

      <p className="m-0 rounded-[14px] bg-[#EAF7EF] px-4 py-2.5 text-[13.5px] font-bold text-[#1E6B43]">{t('utilities.privacy')}</p>

      {shown.length === 0 ? (
        <p className="m-0 rounded-[18px] bg-white px-4 py-8 text-center text-[15px] text-ink-muted">{t('utilities.noMatch', { query })}</p>
      ) : (
        GROUPS.map((g) => {
          const tools = shown.filter((u) => u.group === g)
          if (tools.length === 0) return null
          return (
            <section key={g} aria-label={t(`utilities.${g}.title`)} className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                <h2 className="m-0 text-[20px] font-black">{t(`utilities.${g}.title`)}</h2>
                <span className="text-[13.5px] text-ink-muted">{t(`utilities.${g}.text`)}</span>
              </div>
              <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[520px]:grid-cols-2 xl:grid-cols-4">
                {tools.map((u) => (
                  <li key={u.key}>
                    <UtilityTile utility={u} onSoon={(name) => message.info(t('utilities.soonMessage', { name }))} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}

function UtilityTile({ utility, onSoon }: { utility: Utility; onSoon: (name: string) => void }) {
  const { t } = useTranslation()
  const name = t(`utilities.tools.${utility.key}.name`)
  const body = (
    <>
      <span aria-hidden="true" className="flex size-[52px] items-center justify-center rounded-[14px] text-[26px]" style={{ background: utility.tint }}>
        {utility.icon}
      </span>
      <span className="text-[16px] font-black text-ink">{name}</span>
      <span className="text-[13px] leading-snug text-ink-muted">{t(`utilities.tools.${utility.key}.text`)}</span>
      <span
        className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-[11.5px] font-black ${
          utility.to ? 'bg-[#2E9E6A] text-white' : 'bg-[#EEF2FA] text-[#5B6580]'
        }`}
      >
        {utility.to ? t('utilities.isNew') : t('utilities.soon')}
      </span>
    </>
  )
  const look =
    'relative flex h-full w-full flex-col items-start gap-2 rounded-[18px] border-2 border-transparent bg-white p-4 text-left font-[inherit] transition'
  return utility.to ? (
    <Link to={utility.to} className={`${look} hover:border-primary hover:shadow-[0_6px_16px_rgba(53,99,233,0.18)]`}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={() => onSoon(name)} aria-label={`${name} (${t('utilities.soon')})`} className={`${look} cursor-pointer opacity-80 hover:opacity-100`}>
      {body}
    </button>
  )
}
