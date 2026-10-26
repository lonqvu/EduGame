import { App, Slider } from 'antd'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { BellIcon, GamepadIcon, GlobeIcon, SpeakerIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { SaveState, SettingItem, SettingSelect, SettingsSection, SettingSwitch } from '@/pages/settings/SettingsParts'
import { playSound } from '@/sound/soundEngine'
import { useProfileStore } from '@/store/profileStore'
import { useSettingsStore, type SettingsPatch } from '@/store/settingsStore'
import { useTeacherStore } from '@/store/teacherStore'
import { apiErrorMessage } from '@/utils/apiError'
import { fromChoice, GAME_DEFAULT_OPTIONS, hasGameDefaults, toChoice, type GameDefaultKey } from '@/utils/settings'

const GAME_DEFAULTS: { key: GameDefaultKey; label: string; hint: string }[] = [
  { key: 'teams', label: 'Số đội', hint: 'Cho các trò chia lớp thành đội ngẫu nhiên.' },
  { key: 'timeLimitSec', label: 'Thời gian mỗi câu', hint: 'Trắc nghiệm, Rung chuông vàng, Đua thuyền.' },
  { key: 'allowSteal', label: 'Cho đội khác giành quyền', hint: 'Khi một đội trả lời sai.' },
  { key: 'shuffleItems', label: 'Xáo trộn thứ tự câu hỏi', hint: 'Mỗi lần chơi một thứ tự khác.' },
]

/** /settings — "Cài đặt": display, defaults of new games, notification mails. Every change saves by itself. */
export function SettingsPage() {
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
    update(patch).catch((e: unknown) => message.error(`Chưa lưu được cài đặt. ${apiErrorMessage(e)}`))

  const { display, games, notifications, sound } = settings
  const [volumeDraft, setVolumeDraft] = useState<number | null>(null)
  const highlighted = (id: string) => hash === `#${id}`

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cài đặt"
        text="Tùy chỉnh Lớp Vui theo cách cô dạy. Mọi thay đổi được lưu tự động."
        badge={ready && <SaveState saving={saving} />}
      />

      {status === 'error' ? (
        <LoadError onRetry={() => void load()} />
      ) : !ready ? (
        <PageLoading />
      ) : (
        <>
          <SettingsSection id="display" icon={<GlobeIcon size={17} />} title="Hiển thị & trình chiếu" highlighted={highlighted('display')}>
            <SettingItem
              id="set-reduce-motion"
              label="Giảm hiệu ứng chuyển động"
              hint="Tắt các hiệu ứng động trên mọi màn hình. Nên bật khi máy tính hoặc máy chiếu chạy chậm."
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
              label="Toàn màn hình khi bắt đầu trò chơi"
              hint="Bấm “Bắt đầu trò chơi” là màn chiếu mở toàn màn hình. Nhấn Esc để thoát."
              control={
                <SettingSwitch
                  labelledBy="set-fullscreen"
                  checked={display.fullscreenOnStart}
                  onChange={(fullscreenOnStart) => void change({ display: { fullscreenOnStart } })}
                />
              }
            />
            <SettingItem
              id="set-language"
              label="Ngôn ngữ"
              hint="Lớp Vui hiện dùng tiếng Việt cho mọi màn hình."
              control={<span className="text-[15px] font-bold text-ink-soft">Tiếng Việt</span>}
            />
          </SettingsSection>

          <SettingsSection
            id="games"
            icon={<GamepadIcon size={17} />}
            title="Trò chơi mới"
            text="Áp dụng khi cô tạo trò chơi mới. Trò chơi đã có giữ nguyên; cô vẫn đổi được cho từng trò ở trang Bắt đầu trò chơi."
            highlighted={highlighted('games')}
            action={
              hasGameDefaults(games) && (
                <button
                  type="button"
                  onClick={() => void change({ games: { teams: null, timeLimitSec: null, allowSteal: null, shuffleItems: null } })}
                  className="cursor-pointer rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[14px] font-bold text-ink-soft hover:border-primary hover:text-primary"
                >
                  Đặt lại theo từng trò
                </button>
              )
            }
          >
            {GAME_DEFAULTS.map(({ key, label, hint }) => (
              <SettingItem
                key={key}
                id={`set-${key}`}
                label={label}
                hint={hint}
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
            title="Âm thanh"
            text="Âm thanh của các trò chơi trên màn chiếu. Trên màn chiếu, nút loa ở góc dưới (hoặc phím M) tắt và bật nhanh."
            highlighted={highlighted('sound')}
          >
            <SettingItem
              id="set-sound"
              label="Âm thanh trong trò chơi"
              hint="Tiếng trả lời đúng, sai, đếm giờ, chuông, vỗ tay khi thắng…"
              control={<SettingSwitch labelledBy="set-sound" checked={sound.enabled} onChange={(enabled) => void change({ sound: { enabled } })} />}
            />
            <SettingItem
              id="set-volume"
              label="Âm lượng"
              hint="Thả tay để nghe thử."
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
                    ariaLabelForHandle="Âm lượng"
                  />
                  <span className="w-10 text-right text-[14px] font-bold tabular-nums">{volumeDraft ?? sound.volume}%</span>
                </div>
              }
            />
            <SettingItem
              id="set-music"
              label="Nhạc nền"
              hint="Nhạc vui nhẹ khi chơi, dồn dập hơn ở những giây cuối."
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
            title="Thông báo qua email"
            text={
              profile && !profile.email
                ? 'Tài khoản chưa có email nên Lớp Vui chưa gửi được thông báo.'
                : `Gửi tới ${profile?.email ?? 'email của tài khoản'} để cô biết ngay khi tài khoản có thay đổi.`
            }
            highlighted={highlighted('notifications')}
          >
            <SettingItem
              id="set-new-sign-in"
              label="Đăng nhập trên thiết bị mới"
              hint="Khi tài khoản đăng nhập trên trình duyệt hoặc máy chưa dùng bao giờ."
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
              label="Mật khẩu được thay đổi"
              hint="Khi mật khẩu được đổi trong Hồ sơ của tôi."
              control={
                <SettingSwitch
                  labelledBy="set-password-changed"
                  checked={notifications.passwordChangedEmail}
                  onChange={(passwordChangedEmail) => void change({ notifications: { passwordChangedEmail } })}
                />
              }
            />
          </SettingsSection>
        </>
      )}
    </div>
  )
}
