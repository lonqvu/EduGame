import { motion } from 'motion/react'
import { useEffect, useReducer, useState } from 'react'
import { CheckIcon, ChevronRightIcon, EyeIcon } from '@/components/ui/icons'
import { initialOrdering, isSetDone, orderingReducer, playableOrderSets } from '@/game-engine/ordering/orderingRound'
import { readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, OrderSet } from '@/types/game'

const WRONG_SHOWN_MS = 900
const CARD_COLORS = ['#3563E9', '#F28C28', '#2E9E6A', '#8B5CF6', '#E5484D', '#0E9AA7', '#D99A12', '#C2417B']

interface OrderingScreenProps {
  game: GameSummary
  sets: OrderSet[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Sắp xếp thứ tự": the cards are dealt shuffled; the team whose turn it is says the order and the
 * teacher taps the cards into the numbered slots, then "Kiểm tra". Right cards stay; the others go back for the next
 * team. The team that completes the order scores.
 */
export function OrderingScreen({ game, sets, settings }: OrderingScreenProps) {
  const rules = readPlaySettings(settings, { teams: 2, points: 10, allowSteal: true })
  const deal = () => playableOrderSets(sets)
  const [playable, setPlayable] = useState(deal)
  const [state, dispatch] = useReducer(orderingReducer, { teamCount: rules.teams, size: playable[0]?.entries.length ?? 0 }, initialOrdering)
  const backTo = editPath(game.id)

  useEffect(() => {
    if (state.lastWrong.length === 0) return
    const timer = setTimeout(() => dispatch({ type: 'clearWrong' }), WRONG_SHOWN_MS)
    return () => clearTimeout(timer)
  }, [state.lastWrong])

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có bài sắp xếp nào có ít nhất 2 thẻ để chơi." backTo={backTo} />
  }

  const restart = () => {
    const next = deal()
    setPlayable(next)
    dispatch({ type: 'restart', teamCount: rules.teams, size: next[0].entries.length })
  }

  if (state.finished) {
    return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Xếp đúng nhiều bài nhất" streakUnit="bài" />
  }

  const set = playable[state.setIndex]
  const order = set.entries.map((e) => e.id)
  const byId = new Map(set.entries.map((e) => [e.id, e]))
  // Colored by the shuffled deal, never by the right order (that would give the answer away).
  const colorOf = (id: string) => CARD_COLORS[set.dealt.indexOf(id) % CARD_COLORS.length]
  const team = state.teams[state.turn]
  const done = isSetDone(state)
  const solver = state.teams.find((t) => t.id === state.solvedBy)
  const full = !state.slots.includes(null)
  const isLast = state.setIndex === playable.length - 1
  const slotWidth = Math.min(200, (1208 - 12 * (set.entries.length - 1)) / set.entries.length)
  const fontSize = slotWidth < 150 ? 22 : 28

  return (
    <PlayFrame title={game.title} progress={`Bài ${state.setIndex + 1} / ${playable.length}`} backTo={backTo}>
      <TeamBar teams={state.teams} activeId={done ? null : team.id} />

      {set.text && <h2 className="m-0 text-center font-display text-[34px] leading-tight font-extrabold">{set.text}</h2>}

      <div className="flex justify-center gap-3" aria-label="Thứ tự đã xếp">
        {state.slots.map((id, i) => {
          const entry = id ? byId.get(id) : undefined
          const wrong = state.lastWrong.includes(i)
          const locked = state.locked[i]
          return (
            <div key={i} className="flex flex-col items-center gap-1.5" style={{ width: slotWidth }}>
              <span className="text-lg font-extrabold text-ink-soft">{i + 1}</span>
              <motion.button
                type="button"
                disabled={!entry || locked || done}
                onClick={() => dispatch({ type: 'unplace', slot: i })}
                aria-label={entry ? `Ô ${i + 1}: ${entry.text}` : `Ô ${i + 1} trống`}
                animate={wrong ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                transition={{ duration: 0.45 }}
                className={`flex h-[104px] w-full cursor-pointer items-center justify-center rounded-[22px] border-4 px-2 text-center font-[inherit] font-display leading-tight font-extrabold text-ink disabled:cursor-default ${
                  entry ? 'bg-white' : 'border-dashed bg-white/50'
                }`}
                style={{
                  fontSize,
                  borderColor: locked ? '#1B7A50' : wrong ? '#A3361A' : entry ? colorOf(entry.id) : '#A9BDEB',
                  background: locked ? '#E3F6EC' : wrong ? '#FBE6E1' : undefined,
                }}
              >
                {entry?.text}
                {locked && <CheckIcon size={20} className="ml-1 shrink-0 text-success" />}
              </motion.button>
            </div>
          )
        })}
      </div>

      <div className="flex min-h-[96px] flex-1 flex-wrap content-center items-center justify-center gap-3 rounded-[28px] bg-white/60 px-5 py-3" aria-label="Các thẻ">
        {set.dealt.map((id) => {
          const entry = byId.get(id)!
          const placed = state.slots.includes(id)
          return placed ? (
            <span key={id} className="h-[72px] rounded-[20px] border-[3px] border-dashed border-white" style={{ width: slotWidth }} />
          ) : (
            <motion.button
              key={id}
              layout
              type="button"
              disabled={done}
              onClick={() => dispatch({ type: 'place', entryId: id })}
              className="flex h-[72px] cursor-pointer items-center justify-center rounded-[20px] border-0 px-3 text-center font-[inherit] font-display leading-tight font-extrabold text-white shadow-[0_4px_0_rgba(31,42,68,0.18)] hover:brightness-110"
              style={{ minWidth: slotWidth, fontSize, background: colorOf(id) }}
            >
              {entry.text}
            </motion.button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2.5 text-lg font-extrabold text-ink-soft">
          {solver ? (
            <>
              <CheckIcon size={22} className="text-success" />
              {solver.name} xếp đúng!
            </>
          ) : state.revealed ? (
            'Đây là thứ tự đúng.'
          ) : state.lastWrong.length > 0 ? (
            `Còn ${state.lastWrong.length} thẻ chưa đúng chỗ, ${team.name} sửa tiếp.`
          ) : (
            <>
              <span className="size-5 rounded-full" style={{ background: team.color }} />
              {team.name}: nói thứ tự, cô bấm thẻ theo thứ tự đó.
            </>
          )}
        </span>
        <div className="flex shrink-0 gap-3">
          {!done && (
            <button type="button" onClick={() => dispatch({ type: 'reveal', order })} className={`${playButtonClass} bg-sun-soft text-ink`}>
              <EyeIcon size={22} />
              Hiện đáp án
            </button>
          )}
          <button type="button" onClick={() => dispatch({ type: 'finish' })} className={`${playButtonClass} bg-white text-ink`}>
            Kết thúc
          </button>
          {done ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'nextSet', total: playable.length, size: playable[state.setIndex + 1]?.entries.length ?? 0 })}
              className={`${playButtonClass} bg-primary text-white hover:brightness-110`}
            >
              {isLast ? 'Xem kết quả' : 'Bài tiếp theo'}
              <ChevronRightIcon size={20} />
            </button>
          ) : (
            <button
              type="button"
              disabled={!full}
              onClick={() => dispatch({ type: 'check', order, points: rules.points, allowSteal: rules.allowSteal })}
              className={`${playButtonClass} bg-success text-white hover:brightness-110`}
            >
              <CheckIcon size={22} />
              Kiểm tra
            </button>
          )}
        </div>
      </div>
    </PlayFrame>
  )
}
