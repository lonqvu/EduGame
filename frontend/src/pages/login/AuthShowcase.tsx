import type { CSSProperties, ReactNode } from 'react'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { BookOpenFilledIcon, FilledStarIcon, UsersFilledIcon } from '@/components/ui/icons'

export interface ShowcaseFeature {
  icon: ReactNode
  /** Background of the round badge, e.g. `bg-[#E3ECFF]`. */
  badge: string
  title: string
  text: string
}

/** What the left half of an auth page shows (see showcaseContent.tsx). */
export interface ShowcaseContent {
  title: ReactNode
  /** Font size of the title; long titles use a smaller one. */
  titleClass: string
  subtitle: ReactNode
  features: ShowcaseFeature[]
  image: {
    src: string
    alt: string
    /** Position and size inside the panel (absolute, right aligned). */
    className: string
    /** Fade into the sky: always on the left, at the top and bottom when the art does not end there. */
    fadeTop: boolean
    fadeBottom: boolean
  }
  /** The stats card at the bottom ("10.000+ Giáo viên tin dùng"...). */
  stats: boolean
  /** Background decoration: green foliage (login) or white clouds. */
  ground: 'foliage' | 'clouds'
}

const STATS: { icon: ReactNode; badge: string; value: string; label: string }[] = [
  { icon: <UsersFilledIcon size={28} className="text-[#F06A5B]" />, badge: 'bg-[#FFE4E0]', value: '10.000+', label: 'Giáo viên tin dùng' },
  { icon: <BookOpenFilledIcon size={26} className="text-primary" />, badge: 'bg-[#E3ECFF]', value: '100+', label: 'Trò chơi tương tác' },
  { icon: <FilledStarIcon size={28} stroke="#F5B400" fill="#FFC928" />, badge: 'bg-sun-soft', value: '500.000+', label: 'Học sinh tham gia' },
]

function fadeMask({ fadeTop, fadeBottom }: ShowcaseContent['image']): CSSProperties {
  const mask = [
    'linear-gradient(to right, transparent 0, #000 16%)',
    `linear-gradient(to bottom, ${fadeTop ? 'transparent 0, #000 24%' : '#000 0'}, #000 ${fadeBottom ? '86%' : '100%'}, transparent 100%)`,
  ].join(', ')
  return { maskImage: mask, maskComposite: 'intersect', WebkitMaskImage: mask, WebkitMaskComposite: 'source-in' }
}

/**
 * Left half of the sign-in, sign-up and forgotten-password pages (screens from 1280 px; narrower ones show the
 * form alone). The illustrations are cut from the designs; each narrows on smaller screens so it never runs under
 * the text.
 */
export function AuthShowcase({ content }: { content: ShowcaseContent }) {
  const { title, titleClass, subtitle, features, image, stats, ground } = content
  return (
    <section
      aria-label="Giới thiệu EduGame"
      className="relative hidden min-h-dvh w-[59%] shrink-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#E6F4FE_0%,#F0F8FE_42%,#EAF5FD_72%,#D9EEFB_100%)] xl:flex"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {ground === 'foliage' ? (
          <>
            <div className="absolute -bottom-24 -left-24 size-[340px] rounded-full bg-[#4E8E5E] opacity-70 blur-[60px]" />
            <div className="absolute -bottom-28 left-[38%] h-[200px] w-[46%] rounded-full bg-[#B9D474] opacity-55 blur-[70px]" />
            <div className="absolute -right-20 -bottom-24 size-[260px] rounded-full bg-[#6FA86A] opacity-50 blur-[60px]" />
          </>
        ) : (
          <>
            <div className="absolute -bottom-20 -left-16 h-[220px] w-[48%] rounded-full bg-white opacity-90 blur-[40px]" />
            <div className="absolute -right-10 -bottom-24 h-[200px] w-[40%] rounded-full bg-white opacity-70 blur-[50px]" />
            <div className="absolute top-[30%] -left-24 size-[300px] rounded-full bg-[#DCEBFA] opacity-70 blur-[70px]" />
          </>
        )}
      </div>

      <img src={image.src} alt={image.alt} className={`absolute right-0 object-cover ${image.className}`} style={fadeMask(image)} />

      <div className="relative flex flex-1 flex-col px-[7.6%] pt-[clamp(24px,3.7vh,36px)] pb-[clamp(24px,6vh,58px)]">
        <BrandLogo size={46} />

        <div className="mt-[clamp(36px,7.5vh,72px)] max-w-[54%] min-w-[360px]">
          <h1 className={`m-0 leading-[1.12] font-black tracking-[-0.015em] text-[#14213D] ${titleClass}`}>{title}</h1>
          <p className="mt-[clamp(14px,2.4vh,22px)] mb-0 text-[clamp(17px,1.25vw,21px)] leading-[1.55] font-semibold text-ink-soft">
            {subtitle}
          </p>

          <ul className="m-0 mt-[clamp(20px,3.4vh,32px)] flex list-none flex-col gap-[clamp(12px,2vh,18px)] p-0">
            {features.map((f) => (
              <li key={f.title} className="flex items-center gap-[18px]">
                <span className={`flex size-[62px] shrink-0 items-center justify-center rounded-full ${f.badge}`}>
                  {f.icon}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[16px] leading-tight font-extrabold text-[#14213D]">{f.title}</span>
                  <span className="text-[14px] leading-tight font-semibold text-ink-muted">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {stats && (
          <div className="relative mt-auto grid w-[88%] max-w-[760px] min-w-[480px] grid-cols-3 gap-2 rounded-[24px] bg-white/85 px-[clamp(14px,1.3vw,22px)] py-[18px] shadow-[0_8px_30px_rgba(31,42,68,0.08)] backdrop-blur-md">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-center gap-[clamp(8px,0.85vw,14px)]">
                <span className={`flex size-[clamp(46px,3.5vw,58px)] shrink-0 items-center justify-center rounded-full ${s.badge}`}>{s.icon}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-[clamp(16px,1.1vw,19px)] leading-none font-black text-[#14213D]">{s.value}</span>
                  <span className="text-[clamp(12px,0.85vw,14px)] leading-tight font-semibold whitespace-nowrap text-ink-muted">{s.label}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
