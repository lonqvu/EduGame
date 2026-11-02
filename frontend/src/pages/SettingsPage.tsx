import { App, Slider } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { BellIcon, GamepadIcon, GlobeIcon, LockIcon, SpeakerIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { SaveState, SettingItem, SettingSelect, SettingsSection, SettingSwitch } from '@/pages/settings/SettingsParts'
import { playSound } from '@/sound/soundEngine'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'
import { useSettingsStore, type SettingsPatch } from '@/store/settingsStore'
import { useTeacherStore } from '@/store/teacherStore'
import { apiErrorMessage } from '@/utils/apiError'
import { fromChoice, GAME_DEFAULT_OPTIONS, hasGameDefaults, toChoice, type GameDefaultKey } from '@/utils/settings'

/** The defaults for new games, with the keys of their name and hint (settings.games.*). */
const GAME_DEFAULTS = [
  { key: 'teams', label: 'teams', hint: 'teamsHint' },
  { key: 'timeLimitSec', label: 'timeLimit', hint: 'timeLimitHint' },
  { key: 'allowSteal', label: 'allowSteal', hint: 'allowStealHint' },
  { key: 'shuffleItems', label: 'shuffle', hint: 'shuffleHint' },
] as const satisfies readonly { key: GameDefaultKey; label: string; hint: string }[]

/**
 * /settings — "Cài đặt": display, defaults of new games, notification mails. Every change saves by itself; a visitor's
 * in their browser (the mails need an account).
 */
export function SettingsPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const settings = useSettingsStore((s) => s.settings)
  const status = useSettingsStore((s) => s.status)
  const saving = useSettingsStore((s) => s.saving)
  const load = useSettingsStore((s) => s.load)
  const update = useSettingsStore((s) => s.update)
  const loadTeacher = useTeacherStore((s) => s.load)
  const profile = useProfileStore((s) => s.profile)
  const loadProfile = useProfileStore((s) => s.load)
  const { hash } = useLocation()
  const guest = useAuthStore((s) => s.status !== 'signedIn')

  useEffect(() => {
    void load()
    void loadTeacher()
    void loadProfile()
  }, [load, loadTeacher, loadProfile])

  // Opened from the profile ("Thông báo", "Ngôn ngữ & hiển thị"): show that section.
  const ready = status === 'ready'
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [ready, hash])

  const change = (patch: SettingsPatch) =>
    update(patch).catch((e: unknown) => message.error(t('settings.saveFailed', { reason: apiErrorMessage(e) })))

  const { display, games, notifications, sound } = settings
  const [volumeDraft, setVolumeDraft] = useState<number | null>(null)
  const highlighted = (id: string) => hash === `#${id}`

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('settings.title')}
        text={guest ? t('settings.introGuest') : t('settings.intro')}
        badge={ready && <SaveState saving={saving} />}
      />

      {status === 'error' ? (
        <LoadError onRetry={() => void load()} />
      ) : !ready ? (
        <PageLoading />
      ) : (
        <>
          <SettingsSection id="display" icon={<GlobeIcon size={17} />} title={t('settings.display.title')} highlighted={highlighted('display')}>
            <SettingItem
              id="set-reduce-motion"
              label={t('settings.display.reduceMotion')}
              hint={t('settings.display.reduceMotionHint')}
              control={
                <SettingSwitch
                  labelledBy="set-reduce-motion"
                  checked={display.reduceMotion}
                  onChange={(reduceMotion) => void change({ display: { reduceMotion } })}
                />
              }
            />
            <SettingItem
              id="set-fullscreen"
              label={t('settings.display.fullscreen')}
              hint={t('settings.display.fullscreenHint')}
              control={
                <SettingSwitch
                  labelledBy="set-fullscreen"
                  checked={display.fullscreenOnStart}
                  onChange={(fullscreenOnStart) => void change({ display: { fullscreenOnStart } })}
                />
              }
            />
          </SettingsSection>

          <SettingsSection
            id="games"
            icon={<GamepadIcon size={17} />}
            title={t('settings.games.title')}
            text={t('settings.games.text')}
            highlighted={highlighted('games')}
            action={
              hasGameDefaults(games) && (
                <button
                  type="button"
                  onClick={() => void change({ games: { teams: null, timeLimitSec: null, allowSteal: null, shuffleItems: null } })}
                  className="cursor-pointer rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[14px] font-bold text-ink-soft hover:border-primary hover:text-primary"
                >
                  {t('settings.games.reset')}
                </button>
              )
            }
          >
            {GAME_DEFAULTS.map(({ key, label, hint }) => (
              <SettingItem
                key={key}
                id={`set-${key}`}
                label={t(`settings.games.${label}`)}
                hint={t(`settings.games.${hint}`)}
                control={
                  <SettingSelect
                    labelledBy={`set-${key}`}
                    value={toChoice(games, key)}
                    options={GAME_DEFAULT_OPTIONS[key]}
                    onChange={(choice) => void change({ games: { [key]: fromChoice(key, choice) } })}
                  />
                }
              />
            ))}
          </SettingsSection>

          <SettingsSection
            id="sound"
            icon={<SpeakerIcon size={17} />}
            title={t('settings.sound.title')}
            text={t('settings.sound.text')}
            highlighted={highlighted('sound')}
          >
            <SettingItem
              id="set-sound"
              label={t('settings.sound.effects')}
              hint={t('settings.sound.effectsHint')}
              control={<SettingSwitch labelledBy="set-sound" checked={sound.enabled} onChange={(enabled) => void change({ sound: { enabled } })} />}
            />
            <SettingItem
              id="set-volume"
              label={t('settings.sound.volume')}
              hint={t('settings.sound.volumeHint')}
              control={
                <div className="flex w-[220px] items-center gap-3">
                  <Slider
                    className="flex-1"
                    min={0}
                    max={100}
                    step={5}
                    disabled={!sound.enabled}
                    value={volumeDraft ?? sound.volume}
                    onChange={setVolumeDraft}
                    onChangeComplete={(volume: number) => {
                      setVolumeDraft(null)
                      void change({ sound: { volume } }).then(() => playSound('correct'))
                    }}
                    ariaLabelForHandle={t('settings.sound.volume')}
                  />
                  <span className="w-10 text-right text-[14px] font-bold tabular-nums">{volumeDraft ?? sound.volume}%</span>
                </div>
              }
            />
            <SettingItem
              id="set-music"
              label={t('settings.sound.music')}
              hint={t('settings.sound.musicHint')}
              control={
                <SettingSwitch
                  labelledBy="set-music"
                  checked={sound.music}
                  onChange={(music) => void change({ sound: { music } })}
                />
              }
            />
          </SettingsSection>

          <SettingsSection
            id="notifications"
            icon={<BellIcon size={17} />}
            title={t('settings.notifications.title')}
            text={
              guest
                ? t('settings.notifications.textGuest')
                : profile && !profile.email
                  ? t('settings.notifications.textNoEmail')
                  : t('settings.notifications.text', { email: profile?.email ?? t('settings.notifications.accountEmail') })
            }
            highlighted={highlighted('notifications')}
          >
            {guest ? (
              <SettingItem
                id="set-notifications-sign-in"
                label={t('settings.notifications.signInTitle')}
                hint={t('settings.notifications.signInHint')}
                control={
                  <Link
                    to="/login?from=%2Fsettings%23notifications"
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 font-extrabold text-white hover:bg-primary-ink hover:text-white"
                  >
                    <LockIcon size={16} strokeWidth={2.2} />
                    {t('settings.notifications.signIn')}
                  </Link>
                }
              />
            ) : (
              <>
                <SettingItem
                  id="set-new-sign-in"
                  label={t('settings.notifications.newSignIn')}
                  hint={t('settings.notifications.newSignInHint')}
                  control={
                    <SettingSwitch
                      labelledBy="set-new-sign-in"
                      checked={notifications.newSignInEmail}
                      onChange={(newSignInEmail) => void change({ notifications: { newSignInEmail } })}
                    />
                  }
                />
                <SettingItem
                  id="set-password-changed"
                  label={t('settings.notifications.passwordChanged')}
                  hint={t('settings.notifications.passwordChangedHint')}
                  control={
                    <SettingSwitch
                      labelledBy="set-password-changed"
                      checked={notifications.passwordChangedEmail}
                      onChange={(passwordChangedEmail) => void change({ notifications: { passwordChangedEmail } })}
                    />
                  }
                />
              </>
            )}
          </SettingsSection>
        </>
      )}
    </div>
  )
}
