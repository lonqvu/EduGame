import { Popover } from 'antd'
import type { ReactNode } from 'react'
import { gameGuide, isGuideGame } from '@/game-engine/gameGuide'
import { gameRegistry } from '@/game-engine/registry'
import type { ChooserEntry } from '@/pages/choose-game/chooserEntries'
import { isSetGame } from '@/utils/questionSets'

const STEP_COLORS = ['#3563E9', '#F28C28', '#2E9E6A']

interface GameTileProps {
  entry: ChooserEntry
  /** "Phổ biến": among the first of its group. */
  popular: boolean
  /** "Chơi ngay" is opening this game. */
  opening: boolean
  onPlay: () => void
}

/**
 * A small card of the chooser: picture, name, who plays and how long. The whole card plays the game; hovering it shows
 * what the game is and its first three steps (touch screens open the game at once, its introduction has the rules).
 */
export function GameTile({ entry, popular, opening, onPlay }: GameTileProps) {
  const def = gameRegistry[entry.template.type]
  return (
    <Popover
      content={<GamePreview entry={entry} />}
      placement="bottom"
      mouseEnterDelay={0.4}
      arrow
      styles={{ container: { padding: 0, borderRadius: 16 } }}
    >
      <button
        type="button"
        onClick={onPlay}
        disabled={opening}
        aria-busy={opening}
        aria-label={`Chơi ngay ${entry.name}`}
        className="group flex w-full min-w-0 cursor-pointer flex-col border-0 bg-transparent p-0 text-left font-[inherit] text-ink outline-none disabled:cursor-wait"
      >
        <span className="relative block overflow-hidden rounded-[14px] border-2 border-transparent transition group-hover:border-primary group-hover:shadow-[0_6px_16px_rgba(53,99,233,0.22)] group-focus-visible:border-primary">
          <img src={entry.art} alt="" loading="lazy" className="block aspect-[2/1] w-full object-cover" />
          {def.isNew ? (
            <Ribbon className="bg-[#2E9E6A] text-white">Mới</Ribbon>
          ) : (
            popular && <Ribbon className="bg-[#FFE7A3] text-[#8A5A00]">Phổ biến</Ribbon>
          )}
          <span
            aria-hidden="true"
            className={`absolute inset-0 m-auto flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-[0_4px_12px_rgba(53,99,233,0.45)] transition ${
              opening ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            }`}
          >
            {opening ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <PlayTriangle />}
          </span>
        </span>
        <span className="mt-[7px] px-0.5 text-[13px] leading-tight font-black max-sm:line-clamp-2 sm:truncate sm:text-[14.5px]">{entry.name}</span>
        <span className="truncate px-0.5 text-[12px] text-ink-muted">
          👥 {def.players}
          <span className="max-sm:hidden"> · ⏱ {def.duration}</span>
        </span>
      </button>
    </Popover>
  )
}

/** What the hover shows: the goal, the first three steps of a round (games with a guide), who plays, how long. */
function GamePreview({ entry }: { entry: ChooserEntry }) {
  const type = entry.template.type
  const def = gameRegistry[type]
  const guide = !entry.pickMode && isGuideGame(type) ? gameGuide(type, undefined) : null
  return (
    <div className="flex w-[300px] flex-col gap-1.5 px-[14px] py-3">
      <span className="text-[15px] font-black">{entry.name}</span>
      <span className="text-[13.5px] leading-snug text-[#3F4B68]">{guide?.goal ?? entry.description}</span>
      {guide && (
        <ol className="m-0 mt-1 flex list-none flex-col gap-[5px] p-0">
          {guide.steps.slice(0, 3).map((step, i) => (
            <li key={step.title} className="flex items-start gap-2 text-[13px] leading-snug text-[#3F4B68]">
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11.5px] font-black text-white"
                style={{ background: STEP_COLORS[i] }}
              >
                {i + 1}
              </span>
              {step.text}
            </li>
          ))}
        </ol>
      )}
      <span className="mt-1 flex flex-wrap gap-1.5">
        <Chip>👥 {def.players}</Chip>
        <Chip>⏱ {def.duration}</Chip>
        {isSetGame(type) && <Chip>❓ Dùng bộ câu hỏi</Chip>}
      </span>
    </div>
  )
}

function Ribbon({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[11px] font-black ${className}`}>{children}</span>
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[#F2F5FA] px-2.5 py-0.5 text-[12px] whitespace-nowrap text-[#5B6580]">{children}</span>
}

export function PlayTriangle({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
    </svg>
  )
}
