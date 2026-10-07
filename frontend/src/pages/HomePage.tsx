import { App } from 'antd'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { GameLogo } from '@/components/ui/GameLogo'
import { FilledStarIcon, PlayIcon, PlusIcon, StarIcon, UsersIcon } from '@/components/ui/icons'
import { playPath } from '@/game-engine/registry'
import { DEMO_TEACHER, GAME_TEMPLATES } from '@/mocks/demoData'
import { useClassStore } from '@/store/classStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'

const RECENT_LIMIT = 3
const TOP_STARS = 5

export function HomePage() {
  const { message } = App.useApp()
  const games = useGameLibraryStore((s) => s.games)
  const className = useClassStore((s) => s.className)
  const students = useClassStore((s) => s.students)

  const recent = games.slice(0, RECENT_LIMIT)
  const topStars = [...students].sort((a, b) => b.stars - a.stars).slice(0, TOP_STARS)
  const startTarget = recent[0] ? playPath(recent[0]) : '/games/new'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-8"
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 text-ink">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-sun">
            <StarIcon size={28} />
          </span>
          <span className="font-display text-[28px] font-extrabold">EduGame</span>
        </Link>
        <div className="flex items-center gap-3 rounded-full bg-white py-1.5 pr-[18px] pl-1.5">
          <Avatar name={DEMO_TEACHER.name.replace('Cô ', '')} tint="#FFC3A8" />
          <span className="font-bold">{DEMO_TEACHER.name}</span>
        </div>
      </header>

      <section className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display text-[44px] leading-[1.1] font-extrabold">
          Chào {DEMO_TEACHER.greetingName}!
        </h1>
        <p className="m-0 text-[22px] text-ink-soft">Hôm nay lớp mình chơi gì nhỉ?</p>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
        <ActionCard
          to={startTarget}
          variant="blue"
          icon={<PlayIcon size={34} />}
          title="Bắt đầu chơi"
          subtitle="Chọn lớp và trò chơi, lên màn chiếu"
        />
        <ActionCard
          to="/games/new"
          variant="yellow"
          icon={<PlusIcon size={34} strokeWidth={2.2} />}
          title="Tạo trò chơi"
          subtitle="Soạn câu hỏi trong vài phút"
        />
        <ActionCard
          onClick={() => message.info('Trang "Lớp của tôi" đang được hoàn thiện.')}
          variant="green"
          icon={<UsersIcon size={34} />}
          title="Lớp của tôi"
          subtitle="Danh sách học sinh, ngôi sao"
        />
      </section>

      <section className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 rounded-[28px] bg-white p-7">
          <h2 className="m-0 font-display text-[26px] font-extrabold">Trò chơi gần đây</h2>
          {recent.map((game) => (
            <div key={game.id} className="flex items-center gap-4 rounded-[20px] bg-surface-soft p-3.5">
              <div className="w-24 shrink-0">
                <GameLogo type={game.type} className="rounded-[14px]" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[19px] font-extrabold">{game.title}</span>
                <span className="text-base text-ink-soft">
                  {GAME_TEMPLATES.find((t) => t.type === game.type)?.name} · {game.className} · {game.sizeLabel}
                </span>
              </div>
              <Link
                to={playPath(game)}
                className="flex min-h-12 items-center rounded-full bg-primary px-6 font-extrabold text-white hover:text-white hover:brightness-110"
              >
                Chơi
              </Link>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 rounded-[28px] bg-white p-7">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 font-display text-[26px] font-extrabold">Ngôi sao tuần này</h2>
            <span className="text-base text-ink-soft">{className}</span>
          </div>
          <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
            {topStars.map((student, i) => (
              <li key={student.id} className="flex items-center gap-3">
                <span className="w-6 font-extrabold text-ink-soft">{i + 1}</span>
                <Avatar name={student.name} />
                <span className="flex-1 font-bold">{student.name}</span>
                <span className="flex items-center gap-1 font-extrabold">
                  <FilledStarIcon />
                  {student.stars}
                </span>
              </li>
            ))}
          </ol>
          <Link
            to="/tools/wheel"
            className="mt-1.5 flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-dashed border-line-strong font-extrabold text-ink hover:border-primary hover:text-primary-ink"
          >
            Thưởng sao cho học sinh
          </Link>
        </div>
      </section>
    </motion.div>
  )
}

const CARD_VARIANTS = {
  blue: {
    card: 'bg-primary text-white hover:text-white',
    bg: '/assets/backgrounds/card-blue.svg',
    iconBox: 'bg-white/20 text-white',
    subtitle: 'text-white',
  },
  yellow: {
    card: 'bg-white text-ink hover:text-ink',
    bg: '/assets/backgrounds/card-yellow.svg',
    iconBox: 'bg-sun-soft text-ink',
    subtitle: 'text-ink-soft',
  },
  green: {
    card: 'bg-white text-ink hover:text-ink',
    bg: '/assets/backgrounds/card-green.svg',
    iconBox: 'bg-[#DDF4E7] text-ink',
    subtitle: 'text-ink-soft',
  },
} as const

interface ActionCardProps {
  variant: keyof typeof CARD_VARIANTS
  icon: ReactNode
  title: string
  subtitle: string
  to?: string
  onClick?: () => void
}

function ActionCard({ variant, icon, title, subtitle, to, onClick }: ActionCardProps) {
  const v = CARD_VARIANTS[variant]
  const className = `flex min-h-[180px] flex-col gap-4 rounded-[28px] bg-cover bg-right-bottom bg-no-repeat p-7 text-left transition-transform hover:-translate-y-1 ${v.card}`
  const content = (
    <>
      <span className={`flex size-16 items-center justify-center rounded-[20px] ${v.iconBox}`}>{icon}</span>
      <span className="font-display text-[30px] leading-[1.1] font-extrabold">{title}</span>
      <span className={`text-lg ${v.subtitle}`}>{subtitle}</span>
    </>
  )
  const style = { backgroundImage: `url(${v.bg})` }

  return to ? (
    <Link to={to} className={className} style={style}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={`cursor-pointer border-0 font-[inherit] ${className}`} style={style}>
      {content}
    </button>
  )
}
