import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useReducer, useState } from 'react'
import { CheckIcon, ChevronRightIcon } from '@/components/ui/icons'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { GROUP_COLORS } from '@/game-engine/sorting/groupColors'
import { initialSorting, playableSortSets, sortingReducer } from '@/game-engine/sorting/sortingRound'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, SortSet } from '@/types/game'
import { useSound } from '@/sound/useSound'

const WRONG_SHOWN_MS = 900

interface SortingScreenProps {
  game: GameSummary
  sets: SortSet[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Phân loại": one card at a time; the team whose turn it is says which basket, the teacher taps that
 * basket. Right: the card goes in and the team scores. Wrong: it goes back to the bottom of the deck. Turns pass on
 * every card.
 */
export function SortingScreen({ game, sets, settings }: SortingScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.SORTING)
  const deal = () => playableSortSets(sets)
  const [playable, setPlayable] = useState(deal)
  const [state, dispatch] = useReducer(
    sortingReducer,
    { teamCount: rules.teams, deck: playable[0]?.cards.map((c) => c.id) ?? [] },
    initialSorting,
  )
  const sound = useSound()
  const backTo = editPath(game.id)

  useEffect(() => {
    if (!state.lastWrong) return
    const timer = setTimeout(() => dispatch({ type: 'clearWrong' }), WRONG_SHOWN_MS)
    return () => clearTimeout(timer)
  }, [state.lastWrong])

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có bộ phân loại nào đủ 2 giỏ có tên và 2 thẻ đã chọn giỏ." backTo={backTo} />
  }

  const restart = () => {
    const next = deal()
    setPlayable(next)
    dispatch({ type: 'restart', teamCount: rules.teams, deck: next[0].cards.map((c) => c.id) })
  }

  if (state.finished) {
    return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Phân loại đúng nhiều thẻ nhất" streakUnit="thẻ" />
  }

  const set = playable[state.setIndex]
  const byId = new Map(set.cards.map((c) => [c.id, c]))
  const card = state.lastWrong ? byId.get(state.lastWrong.cardId) : byId.get(state.deck[0])
  const team = state.teams[state.turn]
  const complete = state.deck.length === 0
  const isLast = state.setIndex === playable.length - 1
  const wrongGroup = state.lastWrong?.groupId

  return (
    <PlayFrame title={game.title} progress={`Bộ ${state.setIndex + 1} / ${playable.length} · Còn ${state.deck.length} thẻ`} backTo={backTo}>
      <TeamBar teams={state.teams} activeId={complete ? null : team.id} />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
        {set.text && <h2 className="m-0 font-display text-[32px] leading-tight font-extrabold">{set.text}</h2>}
        <div className="relative flex h-[150px] w-full items-center justify-center">
          <AnimatePresence mode="popLayout">
            {complete ? (
              <motion.span key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3 font-display text-[44px] font-extrabold">
                <CheckIcon size={44} className="text-success" />
                Đã phân loại xong!
              </motion.span>
            ) : (
              card && (
                <motion.div
                  key={`${card.id}-${state.deck.length}-${state.turn}`}
                  initial={{ y: -40, opacity: 0, rotate: -4 }}
                  animate={state.lastWrong ? { x: [0, -14, 14, -8, 8, 0], opacity: 1, y: 0, rotate: 0 } : { y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 120, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.4 }}
                  aria-label="Thẻ đang chờ"
                  className={`flex min-w-[320px] items-center justify-center rounded-[28px] border-[5px] bg-white px-10 py-6 font-display text-[52px] leading-none font-extrabold shadow-[0_8px_0_rgba(31,42,68,0.14)] ${
                    state.lastWrong ? 'border-danger' : 'border-white'
                  }`}
                >
                  {card.text}
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${set.groups.length}, minmax(0, 1fr))` }}>
        {set.groups.map((group, g) => {
          const color = GROUP_COLORS[g % GROUP_COLORS.length]
          const inside = set.cards.filter((c) => c.groupId === group.id && c.id in state.sorted)
          const wrong = wrongGroup === group.id
          return (
            <motion.button
              key={group.id}
              type="button"
              disabled={complete || !!state.lastWrong}
              onClick={() => {
                if (!card) return
                const rightGroupId = byId.get(state.deck[0])!.groupId
                if (group.id === rightGroupId) {
                  sound.play('drop')
                  sound.play('correct', { volume: 0.8 })
                } else {
                  sound.play('wrong')
                }
                dispatch({ type: 'drop', groupId: group.id, rightGroupId, points: rules.points })
              }}
              animate={wrong ? { x: [0, -10, 10, -6, 6, 0] } : {}}
              transition={{ duration: 0.45 }}
              aria-label={`Giỏ ${group.text}`}
              className="flex h-[188px] cursor-pointer flex-col overflow-hidden rounded-[26px] border-[5px] bg-white p-0 text-left font-[inherit] text-ink disabled:cursor-default"
              style={{ borderColor: wrong ? '#A3361A' : color }}
            >
              <span className="flex items-center justify-between px-5 py-2.5 font-display text-[28px] font-extrabold text-white" style={{ background: color }}>
                {group.text}
                <span className="text-xl">{inside.length}</span>
              </span>
              <span className="flex flex-1 flex-wrap content-start gap-1.5 overflow-hidden p-2.5">
                {inside.map((c) => {
                  const by = state.teams.find((t) => t.id === state.sorted[c.id])
                  return (
                    <motion.span
                      key={c.id}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-full border-2 bg-white px-3 py-1 text-[17px] font-extrabold"
                      style={{ borderColor: by?.color ?? color }}
                    >
                      {c.text}
                    </motion.span>
                  )
                })}
              </span>
            </motion.button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2.5 text-lg font-extrabold text-ink-soft">
          {complete ? (
            'Mọi thẻ đã vào đúng giỏ.'
          ) : state.lastWrong ? (
            'Chưa đúng giỏ, thẻ quay lại cuối chồng.'
          ) : (
            <>
              <span className="size-5 rounded-full" style={{ background: team.color }} />
              {team.name}: thẻ này bỏ vào giỏ nào?
            </>
          )}
        </span>
        <div className="flex shrink-0 gap-3">
          <button type="button" onClick={() => dispatch({ type: 'finish' })} className={`${playButtonClass} bg-white text-ink`}>
            Kết thúc
          </button>
          <button
            type="button"
            disabled={!complete}
            onClick={() => {
              sound.play('whoosh')
              dispatch({ type: 'nextSet', total: playable.length, deck: playable[state.setIndex + 1]?.cards.map((c) => c.id) ?? [] })
            }}
            className={`${playButtonClass} bg-primary text-white hover:brightness-110`}
          >
            {isLast ? 'Xem kết quả' : 'Bộ tiếp theo'}
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </div>
    </PlayFrame>
  )
}
