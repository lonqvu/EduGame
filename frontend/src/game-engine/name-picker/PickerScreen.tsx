import { App } from 'antd'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type ComponentType, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { ChevronLeftIcon, FilledStarIcon, RefreshIcon } from '@/components/ui/icons'
import { Confetti } from '@/game-engine/name-picker/effects'
import { PICK_MODES, type PanelPlacement, type PickMode } from '@/game-engine/name-picker/modes'
import { PickModeMenu } from '@/game-engine/name-picker/PickModeMenu'
import type { PickSceneProps } from '@/game-engine/name-picker/sceneTypes'
import { BalloonScene } from '@/game-engine/name-picker/scenes/BalloonScene'
import { ClawScene } from '@/game-engine/name-picker/scenes/ClawScene'
import { FishingScene } from '@/game-engine/name-picker/scenes/FishingScene'
import { HorseRaceScene } from '@/game-engine/name-picker/scenes/HorseRaceScene'
import { RocketScene } from '@/game-engine/name-picker/scenes/RocketScene'
import { usePickRound } from '@/game-engine/name-picker/usePickRound'
import { useClassStore } from '@/store/classStore'
import { usePickerStore } from '@/store/pickerStore'

const SCENES: Record<PickMode, ComponentType<PickSceneProps>> = {
  horse: HorseRaceScene,
  balloon: BalloonScene,
  claw: ClawScene,
  fishing: FishingScene,
  rocket: RocketScene,
}

/** Projector: animated scene that calls one student, then lets the teacher award a star. */
export function PickerScreen({ mode }: { mode: PickMode }) {
  const config = PICK_MODES[mode]
  const Scene = SCENES[mode]
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const className = useClassStore((s) => s.className)
  const awardStars = useClassStore((s) => s.awardStars)
  const noRepeat = usePickerStore((s) => s.noRepeat)
  const setNoRepeat = usePickerStore((s) => s.setNoRepeat)
  const resetCalled = usePickerStore((s) => s.resetCalled)

  const round = usePickRound(config.slots)
  const [starred, setStarred] = useState(false)

  const start = () => {
    setStarred(false)
    round.start()
  }

  const giveStar = () => {
    if (!round.winner || starred) return
    awardStars(round.winner.id, 1)
    setStarred(true)
    message.success(`Đã thưởng 1 sao cho ${round.winner.name}`)
  }

  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  const startButton = round.allCalled ? (
    <BigButton onClick={resetCalled} icon={<RefreshIcon size={28} />}>
      Gọi lại từ đầu
    </BigButton>
  ) : (
    <BigButton onClick={start}>{config.startLabel}</BigButton>
  )

  const resultCard = round.winner && (
    <ResultCard
      layout={config.resultAt === 'bottom' ? 'row' : 'column'}
      label={config.resultLabel}
      name={round.winner.name}
      starred={starred}
      againLabel={config.againLabel}
      onAgain={start}
      onStar={giveStar}
      canAgain={!round.allCalled}
    />
  )

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0">
        <Scene key={round.runId} slots={round.slots} winnerSlot={round.winnerSlot} phase={round.phase} onFinish={round.finish} />
      </div>

      <header className="absolute inset-x-6 top-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={goBack}
            aria-label="Quay lại"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-ink hover:text-primary-ink"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <span className="rounded-full bg-white px-[18px] py-2 font-display text-[22px] font-extrabold">{config.title}</span>
          <span className="rounded-full bg-white/85 px-4 py-2 text-[17px] font-extrabold">{className}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-white/85 px-4 py-2 text-[17px] font-extrabold">
            Đã gọi {round.calledCount} / {round.total} bạn
          </span>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white/85 px-4 text-[15px] font-bold">
            <input
              type="checkbox"
              checked={noRepeat}
              onChange={(e) => setNoRepeat(e.target.checked)}
              className="size-5 accent-primary"
            />
            Không gọi lại
          </label>
          <PickModeMenu current={mode} />
        </div>
      </header>

      <Panel placement={round.phase === 'done' ? config.resultAt : config.idleAt}>
        <AnimatePresence mode="wait">
          {round.phase === 'idle' && (
            <PanelPop key="idle">
              <IdleContent placement={config.idleAt} prompt={config.prompt} button={startButton} />
            </PanelPop>
          )}
          {round.phase === 'run' && isSide(config.idleAt) && (
            <PanelPop key="run">
              <Card>
                <span className="text-lg font-bold text-ink-soft">{config.title}</span>
                <WaitingDots />
              </Card>
            </PanelPop>
          )}
          {round.phase === 'done' && (
            <PanelPop key={`done-${round.runId}`}>{resultCard}</PanelPop>
          )}
        </AnimatePresence>
      </Panel>

      {round.phase === 'done' && <Confetti key={round.runId} />}
    </div>
  )
}

const isSide = (p: PanelPlacement) => p === 'left' || p === 'right'

const PANEL_POSITION: Record<PanelPlacement, string> = {
  bottom: 'inset-x-0 bottom-6 flex justify-center',
  top: 'inset-x-0 top-[150px] flex justify-center',
  right: 'top-[130px] right-12 w-[440px]',
  left: 'top-[110px] left-10 w-[420px]',
}

function Panel({ placement, children }: { placement: PanelPlacement; children: ReactNode }) {
  return <div className={`absolute ${PANEL_POSITION[placement]}`}>{children}</div>
}

function PanelPop({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', bounce: 0.45, duration: 0.55 }}
    >
      {children}
    </motion.div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="box-border flex flex-col items-center gap-3.5 rounded-[32px] bg-white p-[26px] text-center shadow-[0_8px_0_rgba(31,42,68,0.12)]">
      {children}
    </div>
  )
}

function IdleContent({ placement, prompt, button }: { placement: PanelPlacement; prompt: string; button: ReactNode }) {
  if (placement === 'bottom') return button
  if (placement === 'top') {
    return (
      <div className="flex flex-col items-center gap-3.5">
        <span className="font-display text-3xl font-extrabold text-ink-soft">{prompt}</span>
        {button}
      </div>
    )
  }
  return (
    <Card>
      <span className="font-display text-[32px] leading-[1.15] font-extrabold text-balance">{prompt}</span>
      {button}
    </Card>
  )
}

function WaitingDots() {
  return (
    <span className="flex items-end font-display text-5xl leading-none font-extrabold">
      Chờ chút
      {[0, 1, 2].map((i) => (
        <motion.span key={i} animate={{ y: [0, -8, 0] }} transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }}>
          .
        </motion.span>
      ))}
    </span>
  )
}

function BigButton({ onClick, icon, children }: { onClick: () => void; icon?: ReactNode; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ y: 3 }}
      className="flex h-[76px] cursor-pointer items-center gap-3 rounded-[26px] border-0 bg-primary px-10 font-display text-[28px] font-extrabold text-white shadow-[0_6px_0_#2449B8]"
    >
      {icon}
      {children}
    </motion.button>
  )
}

interface ResultCardProps {
  layout: 'row' | 'column'
  label: string
  name: string
  starred: boolean
  againLabel: string
  canAgain: boolean
  onAgain: () => void
  onStar: () => void
}

function ResultCard({ layout, label, name, starred, againLabel, canAgain, onAgain, onStar }: ResultCardProps) {
  const row = layout === 'row'
  const avatarSize = row ? 64 : 88
  return (
    <div
      className={`box-border flex rounded-[28px] bg-white shadow-[0_6px_0_rgba(31,42,68,0.12)] ${
        row ? 'items-center gap-6 py-3.5 pr-4 pl-[18px]' : 'flex-col items-center gap-3.5 rounded-[32px] p-[26px]'
      }`}
    >
      <div className={`flex items-center ${row ? 'gap-3.5' : 'flex-col gap-3.5'}`}>
        {!row && <span className="text-lg font-bold text-ink-soft">{label}</span>}
        <div className="relative">
          <Avatar name={name} size={avatarSize} className="font-display" />
          <AnimatePresence>
            {starred && (
              <motion.span
                className="absolute -top-2 -right-2"
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.6 }}
              >
                <FilledStarIcon size={row ? 30 : 36} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col">
          {row && <span className="text-base font-bold text-ink-soft">{label}</span>}
          <span className={`font-display leading-none font-extrabold ${row ? 'text-[40px]' : 'text-[52px]'}`}>{name}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAgain}
          disabled={!canAgain}
          className="flex h-14 cursor-pointer items-center gap-2 rounded-[18px] whitespace-nowrap border-0 bg-primary px-[22px] font-[inherit] text-lg font-extrabold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon size={22} />
          {againLabel}
        </button>
        <button
          type="button"
          onClick={onStar}
          disabled={starred}
          className="flex h-14 cursor-pointer items-center gap-2 rounded-[18px] whitespace-nowrap border-0 bg-sun px-[22px] font-[inherit] text-lg font-extrabold text-ink hover:brightness-95 disabled:cursor-default disabled:opacity-60"
        >
          <FilledStarIcon size={22} fill="#FFFFFF" stroke="#1F2A44" />
          {starred ? 'Đã thưởng sao' : 'Thưởng 1 sao'}
        </button>
      </div>
    </div>
  )
}
