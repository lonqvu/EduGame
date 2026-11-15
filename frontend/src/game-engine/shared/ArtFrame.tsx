import i18n from 'i18next'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { GameBackButton } from '@/game-engine/shared/PlayFrame'
import type { TeamScore } from '@/game-engine/shared/teamScore'
import { SoundToggle } from '@/sound/SoundToggle'

/**
 * The header of a game screen painted with its own art (Rương vàng, Hái hoa dân chủ): the game's round home and
 * sound buttons, the title on a wooden board, then `right` (timer, progress).
 */
export function ArtHeader({ backTo, home, sound, title, right }: { backTo: string; home: string; sound: string; title: string; right?: ReactNode }) {
  return (
    <div className="relative flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <GameBackButton
          backTo={backTo}
          className="size-[50px] bg-transparent p-0 hover:brightness-110"
          icon={<img src={home} alt="" className="size-[50px]" />}
        />
        <SoundToggle
          className="size-[50px] bg-transparent p-0 hover:brightness-110"
          icon={(enabled) => (
            <span className="relative block size-[50px]">
              <img src={sound} alt="" className={`size-[50px] ${enabled ? '' : 'grayscale'}`} />
              {!enabled && <span aria-hidden="true" className="absolute inset-x-2 top-1/2 h-[4px] -rotate-45 rounded bg-[#E5484D]" />}
            </span>
          )}
        />
        <h1 className="m-0 truncate rounded-full border-[3px] border-[#6B3A1A] bg-[linear-gradient(#B8733A,#8E5226)] px-6 py-1 font-display text-[24px] font-extrabold text-[#FFE27A] shadow-[0_3px_0_#5C3216] [text-shadow:0_2px_0_#6B3A1A]">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">{right}</div>
    </div>
  )
}

/** One card per team: its colour, name and score; the team whose turn it is glows, with `activeLabel`. */
export function ArtTeamCards({ teams, activeId, activeLabel = i18n.t('play.common.yourTurn') }: { teams: TeamScore[]; activeId: string; activeLabel?: string }) {
  return (
    <div className="relative grid gap-3" style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}>
      {teams.map((team) => {
        const active = team.id === activeId
        return (
          <div
            key={team.id}
            className={`flex h-[64px] items-center gap-3 rounded-full border-[3px] px-2 pr-5 transition-transform ${active ? 'scale-[1.02] shadow-[0_0_14px_#FFB21E]' : ''}`}
            style={{
              borderColor: active ? '#FFB21E' : 'rgba(255,255,255,0.9)',
              background: `linear-gradient(color-mix(in srgb, ${team.color} 12%, white), color-mix(in srgb, ${team.color} 28%, white))`,
            }}
          >
            <span className="size-[48px] shrink-0 rounded-full border-[3px] border-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]" style={{ background: team.color }} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[20px] font-extrabold">{team.name}</span>
              {active && (
                <span className="w-max rounded-full bg-[linear-gradient(#FFB347,#F07A1A)] px-2.5 text-[13px] leading-[1.5] font-extrabold text-white">
                  {activeLabel}
                </span>
              )}
            </span>
            <motion.span key={team.score} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="font-display text-[34px] font-extrabold">
              {team.score}
            </motion.span>
          </div>
        )
      })}
    </div>
  )
}
