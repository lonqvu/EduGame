import { motion } from 'motion/react'
import type { TeamScore } from '@/game-engine/shared/teamScore'

interface TeamBarProps {
  teams: TeamScore[]
  /** Team whose turn it is / that is answering: framed in its color. */
  activeId?: string | null
  /** Small line under the active team's name. */
  activeLabel?: string
  /** Makes the teams buttons (e.g. "which team won the buzzer?"). */
  onPick?: (teamId: string) => void
  /** Teams that cannot be picked now (already answered wrong). */
  disabledIds?: string[]
}

/** Projector: one card per team with its score. */
export function TeamBar({ teams, activeId, activeLabel = 'Đến lượt', onPick, disabledIds = [] }: TeamBarProps) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}>
      {teams.map((team) => {
        const active = team.id === activeId
        const disabled = disabledIds.includes(team.id)
        const content = (
          <>
            <span className="size-10 shrink-0 rounded-full" style={{ background: team.color }} />
            <span className="flex min-w-0 flex-1 flex-col text-left">
              <span className="truncate text-xl font-extrabold">{team.name}</span>
              {active && <span className="text-[15px] font-extrabold text-[#9A4A00]">{activeLabel}</span>}
              {disabled && <span className="text-[15px] font-bold text-ink-soft">Đã trả lời</span>}
            </span>
            <motion.span
              key={team.score}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              className="font-display text-[40px] font-extrabold"
            >
              {team.score}
            </motion.span>
          </>
        )
        const className = `box-border flex h-[84px] items-center gap-3 rounded-[22px] border-4 bg-white px-4 py-2 font-[inherit] text-ink transition-colors ${
          disabled ? 'opacity-50' : ''
        }`
        const style = { borderColor: active ? team.color : '#FFFFFF' }
        return onPick ? (
          <button
            key={team.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onPick(team.id)}
            className={`${className} cursor-pointer hover:brightness-95 disabled:cursor-not-allowed`}
            style={style}
          >
            {content}
          </button>
        ) : (
          <div key={team.id} className={className} style={style}>
            {content}
          </div>
        )
      })}
    </div>
  )
}
