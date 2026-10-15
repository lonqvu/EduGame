import { Modal, Select, Switch } from 'antd'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PROJECTOR_BOARD_BG } from '@/components/projector/ProjectorStage'
import { BookOpenFilledIcon, BulbIcon, ClockIcon, EyeIcon, FileTextIcon, PlayIcon, SettingsIcon, UsersIcon } from '@/components/ui/icons'
import type { GameGuide, GuideGameType } from '@/game-engine/gameGuide'
import { gameRegistry } from '@/game-engine/registry'
import type { PlaySettings } from '@/game-engine/shared/gameSettings'
import { gameThumb } from '@/pages/home/homeAssets'
import { SubjectTag } from '@/pages/home/homeUi'
import { GameScreen } from '@/pages/play/GameScreen'
import { optionsWith, type QuickSetting } from '@/pages/game-start/quickSettings'
import type { GameItem, GameSummary } from '@/types/game'
import { gradeLabel } from '@/utils/gameMapping'

/** White block of the start page, with a title row. */
export function StartCard({ icon, title, action, className = '', children }: {
  icon: ReactNode
  title: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`flex flex-col gap-4 rounded-[20px] bg-white p-[18px] shadow-[0_1px_2px_rgba(31,42,68,0.04)] sm:p-[22px] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2.5 text-[18px] leading-none font-black">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** The game: its picture, name, kind and the facts a teacher checks before playing. */
export function GameInfoCard({ mode, game, kind, description, items }: {
  mode: GuideGameType
  game: GameSummary
  kind: string
  description: string
  /** "8 câu" */
  items: ReactNode
}) {
  const facts = [
    { icon: <BookOpenFilledIcon size={20} />, label: 'Môn học', value: <SubjectTag subject={game.subject} /> },
    { icon: <UsersIcon size={20} />, label: 'Khối lớp', value: gradeLabel(game.grade) },
    { icon: <FileTextIcon size={20} />, label: 'Nội dung', value: items },
    { icon: <ClockIcon size={20} />, label: 'Thời lượng', value: gameRegistry[mode].duration },
  ]
  return (
    <StartCard icon={<FileTextIcon size={18} />} title="Thông tin trò chơi">
      <div className="flex flex-col gap-4 sm:flex-row">
        <img src={gameThumb(mode)} alt="" className="aspect-[2/1] w-full shrink-0 rounded-[14px] sm:w-[220px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="m-0 text-[21px] leading-tight font-black break-words">{game.title}</h3>
            {kind && <span className="rounded-full bg-[#EDE4FF] px-2.5 py-[3px] text-[12.5px] font-bold text-[#7448D6]">{kind}</span>}
          </div>
          {description && <p className="m-0 text-[14.5px] leading-[1.5] text-ink-soft">{description}</p>}
        </div>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="flex min-w-0 items-center gap-2.5 rounded-[12px] bg-surface-soft px-3 py-2.5">
            <span className="flex shrink-0 text-ink-muted">{f.icon}</span>
            <span className="flex min-w-0 flex-col">
              <dt className="text-[12.5px] text-ink-muted">{f.label}</dt>
              <dd className="m-0 truncate text-[14.5px] font-bold">{f.value}</dd>
            </span>
          </div>
        ))}
      </dl>
    </StartCard>
  )
}

/** Numbered rules, as they are said to the class. */
export function RulesCard({ guide, onProject }: { guide: GameGuide; onProject: () => void }) {
  return (
    <StartCard
      icon={<BookOpenFilledIcon size={18} />}
      title="Luật chơi"
      action={
        <button
          type="button"
          onClick={onProject}
          className="flex h-[38px] cursor-pointer items-center gap-2 rounded-full border border-primary bg-white px-4 font-[inherit] text-[14px] font-bold text-primary hover:bg-primary-soft"
        >
          <PlayIcon size={16} />
          Trình chiếu luật chơi
        </button>
      }
    >
      <p className="m-0 rounded-[12px] bg-sun-pale px-4 py-3 text-[15px] leading-[1.5]">
        <strong>Mục tiêu:</strong> {guide.goal}
      </p>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {guide.rules.map((rule, i) => (
          <li key={rule} className="flex items-start gap-3 text-[15px] leading-[1.5]">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-black text-white">
              {i + 1}
            </span>
            <span className="pt-[2px]">{rule}</span>
          </li>
        ))}
      </ol>
      <p className="m-0 border-t border-line-soft pt-3 text-[15px] font-bold text-success">{guide.winner}</p>
    </StartCard>
  )
}

const STEP_TINTS = ['bg-primary-soft text-primary', 'bg-sun-soft text-sun-ink', 'bg-[#DDF5E8] text-success', 'bg-[#EDE4FF] text-[#7448D6]']

/** The flow of a round, step by step. */
export function StepsCard({ guide }: { guide: GameGuide }) {
  return (
    <StartCard icon={<PlayIcon size={18} />} title="Cách chơi">
      <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {guide.steps.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-2 rounded-[14px] border border-line-soft p-3.5">
            <span className={`flex size-9 items-center justify-center rounded-full text-[16px] font-black ${STEP_TINTS[i % STEP_TINTS.length]}`}>
              {i + 1}
            </span>
            <span className="text-[15px] font-black">{step.title}</span>
            <span className="text-[13.5px] leading-[1.45] text-ink-soft">{step.text}</span>
          </li>
        ))}
      </ol>
    </StartCard>
  )
}

const STAGE_WIDTH = 1280
const STAGE_HEIGHT = 720

/** The real projector screen, shrunk to the box's width. Inert: a picture of the game, nothing to click. */
function ScreenPreview({ mode, game, items, settings }: { mode: GuideGameType; game: GameSummary; items: GameItem[]; settings: Record<string, unknown> }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / STAGE_WIDTH))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={box}
      inert
      aria-hidden="true"
      className="relative aspect-video w-full overflow-hidden rounded-[14px] bg-cover bg-center select-none"
      style={{ backgroundImage: `url(${PROJECTOR_BOARD_BG})` }}
    >
      {scale > 0 && (
        <div
          className="absolute top-0 left-0 origin-top-left text-ink"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
        >
          <GameScreen mode={mode} game={game} items={items} settings={settings} />
        </div>
      )}
    </div>
  )
}

/** What the class will see, with a larger view on demand. */
export function PreviewCard(props: { mode: GuideGameType; game: GameSummary; items: GameItem[]; settings: Record<string, unknown> }) {
  const [large, setLarge] = useState(false)
  return (
    <StartCard
      icon={<EyeIcon size={18} />}
      title="Xem trước màn chiếu"
      action={
        <button
          type="button"
          onClick={() => setLarge(true)}
          className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[14px] font-bold text-primary hover:text-primary-ink"
        >
          Xem lớn
        </button>
      }
    >
      {/* The screen has buttons of its own: the click target lies over it instead of around it. */}
      <div className="relative">
        <ScreenPreview {...props} />
        <button
          type="button"
          onClick={() => setLarge(true)}
          aria-label="Xem lớn màn chiếu"
          className="absolute inset-0 cursor-zoom-in rounded-[14px] border-0 bg-transparent p-0 hover:bg-white/10"
        />
      </div>
      <Modal open={large} onCancel={() => setLarge(false)} footer={null} width="min(1100px, 94vw)" centered destroyOnHidden title="Xem trước màn chiếu">
        <ScreenPreview {...props} />
      </Modal>
    </StartCard>
  )
}

/** The rules this game's projector reads, changed in place and saved with the game. */
export function QuickSettingsCard({ settings, current, saving, onChange }: {
  settings: QuickSetting[]
  current: PlaySettings
  saving: boolean
  onChange: (patch: Partial<PlaySettings>) => void
}) {
  return (
    <StartCard
      icon={<SettingsIcon size={18} />}
      title="Cài đặt nhanh"
      action={settings.length > 0 && <span className="text-[13px] text-ink-muted">{saving ? 'Đang lưu…' : 'Đã lưu'}</span>}
    >
      {settings.length === 0 ? (
        <p className="m-0 text-[14px] leading-[1.5] text-ink-soft">
          Trò này chơi với 4 đội cố định; điểm của từng ô được đặt cho mỗi câu hỏi trong trình soạn.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {settings.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0">
              <span className="flex min-w-0 flex-col">
                <span id={`quick-${s.key}`} className="text-[14.5px] font-semibold">{s.label}</span>
                {s.kind === 'toggle' && s.hint && <span className="text-[12.5px] text-ink-muted">{s.hint}</span>}
              </span>
              {s.kind === 'select' ? (
                <Select
                  aria-labelledby={`quick-${s.key}`}
                  value={current[s.key]}
                  options={optionsWith(s, current)}
                  onChange={(value: number) => onChange({ [s.key]: value })}
                  className="w-[150px] shrink-0"
                />
              ) : (
                <Switch aria-labelledby={`quick-${s.key}`} checked={current[s.key]} onChange={(value) => onChange({ [s.key]: value })} />
              )}
            </li>
          ))}
        </ul>
      )}
    </StartCard>
  )
}

/** How to drive the projector, and a reminder to show the rules first: for the teacher only. */
export function TeacherTipsCard({ notes }: { notes: string[] }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-[20px] bg-[#E9F7EF] p-[18px] sm:p-[22px]">
      <h2 className="m-0 flex items-center gap-2 text-[16px] font-black text-success">
        <BulbIcon size={20} />
        Gợi ý cho cô
      </h2>
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.5] text-ink-soft">
        <li>Trình chiếu luật chơi trước khi bắt đầu để cả lớp nắm rõ cách tham gia.</li>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}
