import type { ReactNode } from 'react'
import {
  BookOpenFilledIcon,
  CheckIcon,
  ChevronRightIcon,
  FileTextIcon,
  GamepadFilledIcon,
  LogoutIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  UsersFilledIcon,
} from '@/components/ui/icons'
import type { ProfileResponse } from '@/types/api'
import { avatarSrc, countLabel, formatPhone, joinedLabel, roleLabel } from '@/utils/profile'

/** White block of the profile page with an icon and a title. */
export function ProfileSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] bg-white p-[18px] shadow-[0_1px_2px_rgba(31,42,68,0.04)] sm:p-[22px]">
      <h2 className="m-0 flex items-center gap-2.5 text-[18px] leading-none font-black">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

const Sparkle = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`absolute ${className}`}>
    <path d="M12 0c.9 6.4 5.6 11.1 12 12-6.4.9-11.1 5.6-12 12-.9-6.4-5.6-11.1-12-12C6.4 11.1 11.1 6.4 12 0z" fill="currentColor" />
  </svg>
)

/** The teacher: picture, name, role, contact, account status, and "Chỉnh sửa hồ sơ". */
export function ProfileCard({ profile, onEdit }: { profile: ProfileResponse; onEdit: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(120deg,#EAF2FF_0%,#F4F8FF_55%,#FFF7E0_100%)] p-5 sm:p-7">
      <Sparkle className="top-5 right-[30%] size-4 text-[#FFD15C]" />
      <Sparkle className="top-10 right-10 size-6 text-[#FFD15C]" />
      <Sparkle className="right-[22%] bottom-6 size-3 text-[#8FB4FF]" />
      <span aria-hidden="true" className="absolute -top-14 -right-10 size-44 rounded-full bg-white/50" />

      <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
        <img
          src={avatarSrc(profile.avatar, profile.avatarUrl)}
          alt=""
          className="size-[112px] shrink-0 rounded-full border-4 border-white bg-[#FFE6C7] object-cover shadow-[0_6px_18px_rgba(31,42,68,0.12)] sm:size-[128px]"
        />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
            <h2 className="m-0 text-[24px] leading-tight font-black break-words">{profile.displayName}</h2>
            <span className="rounded-full bg-primary-soft px-2.5 py-[3px] text-[12.5px] font-bold text-primary-ink">{roleLabel(profile.role)}</span>
          </div>
          <dl className="m-0 flex flex-col gap-1.5 text-[14.5px] text-ink-soft">
            <ContactRow icon={<MailIcon size={18} />} label="Email" value={profile.email || 'Chưa có email'} />
            <ContactRow icon={<PhoneIcon size={18} />} label="Số điện thoại" value={formatPhone(profile.phone) || 'Chưa có số điện thoại'} />
          </dl>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#E3F6EA] px-3 py-1 text-[13px] font-bold text-success">
            <span className="flex size-4 items-center justify-center rounded-full bg-success text-white">
              <CheckIcon size={10} strokeWidth={3} />
            </span>
            Tài khoản đang hoạt động
          </span>
          {profile.memberSince && <span className="text-[13px] text-ink-muted">Tham gia EduGame từ: {joinedLabel(profile.memberSince)}</span>}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex h-[44px] shrink-0 cursor-pointer items-center gap-2 self-center rounded-[12px] border-0 bg-primary px-5 font-[inherit] text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(53,99,233,0.25)] hover:brightness-110 sm:self-end"
        >
          <PencilIcon size={18} />
          Chỉnh sửa hồ sơ
        </button>
      </div>
    </section>
  )
}

function ContactRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <dt className="flex shrink-0 text-ink-muted" title={label}>
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="m-0 min-w-0 truncate">{value}</dd>
    </div>
  )
}

const TILES = [
  { key: 'classrooms', label: 'Lớp đang quản lý', unit: 'lớp', icon: <UsersFilledIcon size={22} />, bg: 'bg-[#EAF1FE]', badge: 'bg-[#D5E3FD] text-primary' },
  { key: 'students', label: 'Tổng số học sinh', unit: 'học sinh', icon: <UsersFilledIcon size={22} />, bg: 'bg-[#E6F7EE]', badge: 'bg-[#CDEFDC] text-success' },
  { key: 'questionSets', label: 'Bộ câu hỏi đã tạo', unit: 'bộ câu hỏi', icon: <FileTextIcon size={22} />, bg: 'bg-[#FFF5DA]', badge: 'bg-[#FFE7A6] text-sun-ink' },
  { key: 'activities', label: 'Hoạt động đã tổ chức', unit: 'hoạt động', icon: <GamepadFilledIcon size={22} />, bg: 'bg-[#F1EBFF]', badge: 'bg-[#E1D5FF] text-[#7448D6]' },
] as const

/** The four figures of "Tổng quan hoạt động". */
export function ActivityOverview({ stats }: { stats: ProfileResponse['stats'] }) {
  return (
    <ProfileSection icon={<BookOpenFilledIcon size={17} />} title="Tổng quan hoạt động">
      <dl className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILES.map((t) => (
          <div key={t.key} className={`flex flex-col gap-2 rounded-[16px] p-4 ${t.bg}`}>
            <span className={`flex size-10 items-center justify-center rounded-full ${t.badge}`}>{t.icon}</span>
            <dt className="text-[13.5px] font-semibold text-ink-soft">{t.label}</dt>
            <dd className="m-0 flex flex-col">
              <span className="text-[28px] leading-none font-black">{countLabel(stats[t.key])}</span>
              <span className="mt-1 text-[13px] text-ink-muted">{t.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </ProfileSection>
  )
}

export interface SettingRow {
  key: string
  icon: ReactNode
  /** Background and color of the round icon, e.g. "bg-[#E3ECFF] text-primary". */
  tint: string
  title: string
  text: string
  /** Not available yet: shown with "Sắp có", still clickable to say so. */
  soon?: boolean
  onClick: () => void
}

/** "Cài đặt tài khoản": one row per setting, each opening it. */
export function SettingsList({ rows }: { rows: SettingRow[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {rows.map((row) => (
        <li key={row.key}>
          <button
            type="button"
            onClick={row.onClick}
            className="flex w-full cursor-pointer items-center gap-3.5 rounded-[14px] border border-line-soft bg-white px-4 py-3.5 text-left font-[inherit] text-ink transition hover:border-[#C9D9F5] hover:bg-[#FAFCFF]"
          >
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${row.tint}`}>{row.icon}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 text-[15.5px] font-extrabold">
                {row.title}
                {row.soon && <span className="rounded-full bg-chip px-2 py-0.5 text-[11.5px] font-bold text-ink-muted">Sắp có</span>}
              </span>
              <span className="text-[13.5px] text-ink-muted">{row.text}</span>
            </span>
            <ChevronRightIcon size={20} className="shrink-0 text-ink-muted" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function LogoutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border border-line-soft bg-white font-[inherit] text-[15.5px] font-bold text-danger hover:bg-[#FFF5F3]"
    >
      <LogoutIcon size={20} />
      Đăng xuất
    </button>
  )
}
