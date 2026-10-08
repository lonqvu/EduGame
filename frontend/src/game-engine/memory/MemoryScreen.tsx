import { motion } from 'motion/react'
import { useEffect, useReducer, useState } from 'react'
import { CheckIcon, ChevronRightIcon } from '@/components/ui/icons'
import {
  initialMemoryRound,
  isShowingMiss,
  memoryReducer,
  playableMemorySets,
  type MemoryCard,
} from '@/game-engine/memory/memoryRound'
import { readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, PairSet } from '@/types/game'

/** Height left for the cards on the 720px stage. */
const GRID_HEIGHT = 432
const GAP = 12

interface MemoryScreenProps {
  game: GameSummary
  sets: PairSet[]
  settings: Record<string, unknown>
}

/** Rows of the card grid: few cards stay big, 24 cards make 4 rows of 6. */
const rowsFor = (cards: number) => (cards <= 4 ? 1 : cards <= 8 ? 2 : cards <= 15 ? 3 : 4)

/**
 * Projector: every card face down. The team whose turn it is turns two; a pair scores and the team plays again,
 * otherwise the cards turn back and the next team plays.
 */
export function MemoryScreen({ game, sets, settings }: MemoryScreenProps) {
  const rules = readPlaySettings(settings, { teams: 2, points: 10 })
  const deal = () => playableMemorySets(sets)
  const [playable, setPlayable] = useState(deal)
  const [state, dispatch] = useReducer(memoryReducer, rules.teams, initialMemoryRound)
  const backTo = editPath(game.id)
  const showingMiss = isShowingMiss(state)

  useEffect(() => {
    if (!showingMiss) return
    const timer = setTimeout(() => dispatch({ type: 'hide' }), rules.flipBackDelayMs)
    return () => clearTimeout(timer)
  }, [showingMiss, rules.flipBackDelayMs])

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có bộ thẻ nào có ít nhất 2 cặp điền đủ hai thẻ để chơi." backTo={backTo} />
  }

  const restart = () => {
    dispatch({ type: 'restart', teamCount: rules.teams })
    setPlayable(deal())
  }

  if (state.finished) {
    return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Tìm được nhiều cặp nhất" streakUnit="cặp" />
  }

  const set = playable[state.setIndex]
  const team = state.teams[state.turn]
  const complete = Object.keys(state.matched).length === set.cards.length
  const isLast = state.setIndex === playable.length - 1

  const rows = rowsFor(set.cards.length)
  const cols = Math.ceil(set.cards.length / rows)
  const cardHeight = (GRID_HEIGHT - GAP * (rows - 1)) / rows
  const longest = Math.max(...set.cards.map((c) => c.text.length))
  const fontSize = Math.min(cardHeight * 0.3, longest > 14 ? 22 : longest > 8 ? 28 : 36)

  const flip = (card: MemoryCard) => dispatch({ type: 'flip', card, deck: set.cards, points: rules.points })

  return (
    <PlayFrame title={game.title} progress={`Bộ ${state.setIndex + 1} / ${playable.length}`} backTo={backTo}>
      <TeamBar teams={state.teams} activeId={complete ? null : team.id} />

      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: cardHeight, gap: GAP, height: GRID_HEIGHT }}
      >
        {set.cards.map((card, i) => {
          const owner = state.matched[card.key]
          const ownerColor = state.teams.find((t) => t.id === owner)?.color
          const faceUp = !!owner || state.faceUp.includes(card.key)
          const missed = showingMiss && state.faceUp.includes(card.key)
          return (
            <button
              key={card.key}
              type="button"
              aria-label={faceUp ? card.text : `Thẻ ${i + 1}`}
              disabled={faceUp || showingMiss || complete}
              onClick={() => flip(card)}
              className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] [perspective:900px] disabled:cursor-default"
            >
              <motion.span
                className="relative block size-full [transform-style:preserve-3d]"
                initial={false}
                animate={{ rotateY: faceUp ? 180 : 0 }}
                transition={{ duration: 0.35 }}
              >
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-primary font-display text-[44px] font-extrabold text-white shadow-[0_5px_0_#2449B8] [backface-visibility:hidden]"
                  style={{ backgroundImage: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.22) 0 18%, transparent 19%)' }}
                >
                  ?
                </span>
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-[20px] border-4 bg-white px-2 text-center font-display leading-tight font-extrabold text-ink [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  style={{
                    fontSize,
                    borderColor: ownerColor ?? (missed ? '#A3361A' : team.color),
                    background: ownerColor ? `${ownerColor}22` : missed ? '#FBE6E1' : '#FFFFFF',
                  }}
                >
                  {card.text}
                </span>
              </motion.span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2.5 text-lg font-extrabold text-ink-soft">
          {complete ? (
            <>
              <CheckIcon size={22} className="text-success" />
              Đã tìm hết các cặp!
            </>
          ) : (
            <>
              <span className="size-5 rounded-full" style={{ background: team.color }} />
              {showingMiss ? 'Chưa đúng cặp, thẻ sẽ úp lại.' : `${team.name}: lật hai thẻ để tìm một cặp.`}
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
            onClick={() => dispatch({ type: 'nextSet', total: playable.length })}
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
