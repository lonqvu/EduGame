import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ChevronLeftIcon } from '@/components/ui/icons'
import { gameGuide, type GuideGameType } from '@/game-engine/gameGuide'
import { editPath, gameRegistry } from '@/game-engine/registry'
import { PLAY_DEFAULTS, readPlaySettings, type PlaySettings } from '@/game-engine/shared/gameSettings'
import { QUICK_SETTINGS, type QuickSetting } from '@/pages/game-start/quickSettings'
import { gameThumb } from '@/pages/home/homeAssets'
import { QuestionSourceModal } from '@/pages/play/QuestionSourceModal'
import type { GameSummary } from '@/types/game'

const STEP_COLORS = ['#3563E9', '#F28C28', '#2E9E6A', '#8B5CF6']
/** Settings worth a choice right before playing; the start page keeps the others. */
const INTRO_SETTINGS = ['teams', 'timeLimitSec'] as const
/** Time choices shown as chips (the start page offers them all). */
const INTRO_TIMES = [0, 15, 30, 60]

interface GameIntroProps {
  mode: GuideGameType
  game: GameSummary
  /** "Trắc nghiệm" */
  kindName: string
  settings: Record<string, unknown>
  /** Items with enough content to play. */
  playable: number
  onChange: (patch: Partial<PlaySettings>) => void
  onStart: () => void
}

/**
 * The first screen of a game on the projector, for the whole class: what the game is, how a round goes (from the
 * settings it is played with), the number of teams and the time per question, and a big "Bắt đầu" (or Enter).
 */
export function GameIntro({ mode, game, kindName, settings, playable, onChange, onStart }: GameIntroProps) {
  const guide = gameGuide(mode, settings)
  const current = readPlaySettings(settings, mode === 'GRID_BOARD' ? {} : PLAY_DEFAULTS[mode])
  const choices = QUICK_SETTINGS[mode].filter(
    (s): s is Extract<QuickSetting, { kind: 'select' }> => s.kind === 'select' && (INTRO_SETTINGS as readonly string[]).includes(s.key),
  )
  const ready = playable > 0
  const navigate = useNavigate()
  const location = useLocation()
  // Back where the teacher came from (the game chooser, the home page...); opened directly, to the games.
  const goBack = () => (location.key === 'default' ? navigate('/games/new') : navigate(-1))
  const [choosing, setChoosing] = useState(false)

  useEffect(() => {
    // Enter in the dialog is the dialog's.
    if (!ready || choosing) return
    const onKey = (e: KeyboardEvent) => {
      // Enter on a button presses it; on the team / time chips (just picked) it starts, as anywhere else.
      const onButton = e.target instanceof HTMLButtonElement && e.target.getAttribute('role') !== 'radio'
      if (e.key !== 'Enter' || e.repeat || onButton) return
      e.preventDefault()
      onStart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, choosing, onStart])

  return (
    <section aria-label={`Giới thiệu trò chơi ${game.title}`} className="flex h-full flex-col gap-4 px-10 py-7">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Quay lại"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-ink hover:text-primary-ink"
        >
          <ChevronLeftIcon size={22} />
        </button>
        <span className="rounded-full bg-white px-5 py-2 text-[18px] font-extrabold">{kindName}</span>
        <span className={`rounded-full px-4 py-2 text-[16px] font-bold ${game.sample ? 'bg-[#FFF1C2] text-[#7A5600]' : 'bg-white text-ink'}`}>
          📚 {game.sample ? 'Câu hỏi mẫu' : 'Câu hỏi của cô'}
        </span>
        <button
          type="button"
          onClick={() => setChoosing(true)}
          aria-haspopup="dialog"
          className="h-11 cursor-pointer rounded-full border-2 border-primary bg-white px-5 font-[inherit] text-[16px] font-extrabold text-primary-ink hover:bg-primary hover:text-white"
        >
          Đổi câu hỏi
        </button>
      </div>
      <QuestionSourceModal open={choosing} mode={mode} kindName={kindName} current={game} onClose={() => setChoosing(false)} />

      <div className="flex min-h-0 flex-1 flex-col gap-5 rounded-[32px] bg-white px-10 py-7">
        <div className="flex items-center gap-7">
          <img src={gameThumb(mode)} alt="" className="aspect-[2/1] w-[200px] shrink-0 rounded-[20px]" />
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="m-0 font-display text-[40px] leading-tight font-extrabold text-[#1A2440]">{game.title}</h1>
            <p className="m-0 text-[21px] leading-snug text-ink-soft">{guide.goal}</p>
          </div>
        </div>

        <ol aria-label="Cách chơi" className="m-0 grid list-none grid-cols-4 gap-4 p-0">
          {guide.steps.slice(0, 4).map((step, i) => (
            <li key={step.title} className="flex flex-col items-center gap-2 rounded-[22px] bg-projector px-4 py-5 text-center">
              <span
                className="flex size-[48px] shrink-0 items-center justify-center rounded-full text-[24px] font-black text-white"
                style={{ background: STEP_COLORS[i % STEP_COLORS.length] }}
              >
                {i + 1}
              </span>
              <span className="font-display text-[21px] leading-tight font-extrabold">{step.title}</span>
              <span className="text-[16px] leading-snug text-ink-soft">{step.text}</span>
            </li>
          ))}
        </ol>

        {choices.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-line-soft pt-5">
            {choices.map((setting) => (
              <Choice key={setting.key} setting={setting} value={current[setting.key]} onChange={(value) => onChange({ [setting.key]: value })} />
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-[72px] items-center justify-end gap-5">
        {ready ? (
          <>
            <span className="text-[17px] font-bold text-ink-soft">Nhấn Enter hoặc</span>
            <button
              type="button"
              autoFocus
              onClick={onStart}
              className="flex h-[68px] cursor-pointer items-center gap-3 rounded-full border-0 bg-primary px-12 font-[inherit] text-[30px] font-black text-white shadow-[0_10px_26px_rgba(53,99,233,0.4)] hover:brightness-110 focus-visible:ring-4 focus-visible:ring-primary/40"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
              </svg>
              Bắt đầu
            </button>
          </>
        ) : (
          <div role="alert" className="flex items-center gap-4 rounded-[20px] bg-white px-6 py-4">
            <span className="text-[18px] font-bold">Chưa có {gameRegistry[mode].itemUnit} nào đủ nội dung để chơi.</span>
            <Link to={editPath(game.id)} className="rounded-full bg-primary px-6 py-3 text-[18px] font-extrabold text-white hover:text-white">
              Soạn nội dung
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

/** One setting as big chips the teacher can click on the projector. */
function Choice({
  setting,
  value,
  onChange,
}: {
  setting: Extract<QuickSetting, { kind: 'select' }>
  value: number | undefined
  onChange: (value: number) => void
}) {
  const options =
    setting.key === 'timeLimitSec'
      ? setting.options.filter((o) => INTRO_TIMES.includes(o.value) || o.value === value)
      : setting.options
  return (
    <div role="radiogroup" aria-label={setting.label} className="flex items-center gap-2">
      <span className="mr-1 text-[17px] font-extrabold text-ink-soft">{setting.label}</span>
      {options.map((o) => {
        const checked = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(o.value)}
            className={`h-11 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-[16px] font-extrabold ${
              checked ? 'bg-primary text-white' : 'bg-[#EEF2F8] text-ink hover:text-primary-ink'
            }`}
          >
            {o.value === 0 && setting.key === 'timeLimitSec' ? 'Không giới hạn' : o.label}
          </button>
        )
      })}
    </div>
  )
}
