import { Dropdown } from 'antd'
import { useTranslation } from 'react-i18next'
import { CheckIcon, ChevronDownIcon, GlobeIcon } from '@/components/ui/icons'
import { LANGUAGES, shownLanguage, type Language } from '@/i18n'
import { useSettingsStore } from '@/store/settingsStore'

const LOOKS = { pill: 'bg-white px-3', icon: 'w-10 bg-surface-soft', row: 'w-full bg-surface-soft px-4' }

/**
 * "🌐 VI ▾" next to the account chip: the language of the screens, each named in its own language. Saved with the
 * settings (in this browser for a visitor). Hidden while only Vietnamese is offered.
 *
 * `look`: "pill" beside the account (white), "icon" the globe alone (grey, on the white bar of tablets), "row" the
 * whole name (grey, in the menu drawer of phones).
 */
export function LanguageSwitch({ look = 'pill', className = '' }: { look?: 'pill' | 'icon' | 'row'; className?: string }) {
  const { t } = useTranslation()
  const saved = useSettingsStore((s) => s.settings.display.language)
  const update = useSettingsStore((s) => s.update)
  const current = shownLanguage(saved)
  if (LANGUAGES.length < 2) return null

  const pick = (language: Language) => {
    if (language !== current) void update({ display: { language } }).catch(() => undefined)
  }
  return (
    <Dropdown
      trigger={['click']}
      placement={look === 'row' ? 'topLeft' : 'bottomRight'}
      menu={{
        selectable: true,
        selectedKeys: [current],
        items: LANGUAGES.map((l) => ({
          key: l,
          label: (
            <span lang={l} className="flex min-w-[150px] items-center justify-between gap-3 py-0.5 text-[15px] font-bold">
              <span>
                {t(`languages.${l}`)}
                {/* English is offered (in development) before it is finished. */}
                {l === 'en' && <span className="ml-2 text-[12px] font-semibold text-ink-muted">{t('topBar.languageBeta')}</span>}
              </span>
              {l === current && <CheckIcon size={16} strokeWidth={2.6} className="text-primary" />}
            </span>
          ),
          onClick: () => pick(l),
        })),
      }}
    >
      <button
        type="button"
        aria-label={t('topBar.language', { name: t(`languages.${current}`) })}
        className={`flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border-0 font-[inherit] text-[14px] font-extrabold text-[#3F4B68] hover:text-primary ${LOOKS[look]} ${className}`}
      >
        <GlobeIcon size={18} />
        {look === 'pill' && current.toUpperCase()}
        {look === 'row' && <span className="flex-1 text-left">{t(`languages.${current}`)}</span>}
        {look !== 'icon' && <ChevronDownIcon size={14} strokeWidth={2.6} />}
      </button>
    </Dropdown>
  )
}
