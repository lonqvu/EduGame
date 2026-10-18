import { App } from 'antd'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { BellIcon, ChevronRightIcon, GamepadIcon, GlobeIcon, HomeIcon } from '@/components/ui/icons'
import { LoadError, PageLoading } from '@/components/ui/LoadState'
import { SaveState, SettingItem, SettingSelect, SettingsSection, SettingSwitch } from '@/pages/settings/SettingsParts'
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
  const teacher = useTeacherStore((s) => s.teacher)
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

  const { display, games, notifications } = settings
  const highlighted = (id: string) => hash === `#${id}`

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-[min(100%,300px)] flex-1 flex-col">
          <nav aria-label="Đường dẫn" className="flex items-center gap-3 text-[14.5px] text-ink-soft">
            <Link to="/" aria-label="Trang chủ" className="flex text-[#8A93A8] hover:text-primary">
              <HomeIcon size={20} />
            </Link>
            <Link to="/" className="text-ink-soft hover:text-primary">
              Trang chủ
            </Link>
            <ChevronRightIcon size={15} strokeWidth={2.4} />
            <span className="font-semibold text-ink">Cài đặt</span>
          </nav>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[32px] leading-[1.1] font-black tracking-[-0.01em] text-[#1A2440]">Cài đặt</h1>
            {ready && <SaveState saving={saving} />}
          </div>
          <p className="m-0 mt-2 text-[14.5px] text-[#4A5470]">Tùy chỉnh EduGame theo cách cô dạy. Mọi thay đổi được lưu tự động.</p>
        </div>
        <div className="order-first ml-auto sm:order-none">
          <TopBar teacherName={teacher?.name ?? ''} initial={teacher?.shortName.charAt(0).toUpperCase() ?? ''} />
        </div>
      </header>

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
              hint="EduGame hiện dùng tiếng Việt cho mọi màn hình."
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
            id="notifications"
            icon={<BellIcon size={17} />}
            title="Thông báo qua email"
            text={
              profile && !profile.email
                ? 'Tài khoản chưa có email nên EduGame chưa gửi được thông báo.'
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
