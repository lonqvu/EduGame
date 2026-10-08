import { motion } from 'motion/react'
import { useEffect, useReducer, useState } from 'react'
import { CheckIcon, ChevronRightIcon } from '@/components/ui/icons'
import {
  initialMatchingRound,
  isMatch,
  isRightUsed,
  matchingReducer,
  playableMatchingSets,
} from '@/game-engine/matching/matchingRound'
import { readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, PairSet } from '@/types/game'

const WRONG_SHOWN_MS = 900
/** Height left for the two columns on the 720px stage. */
const COLUMNS_HEIGHT = 432
const ROW_GAP = 10

interface MatchingScreenProps {
  game: GameSummary
  sets: PairSet[]
  settings: Record<string, unknown>
}

type Side = 'left' | 'right'

/** Projector: teams take turns joining an entry of the left column to its partner in the shuffled right column. */
export function MatchingScreen({ game, sets, settings }: MatchingScreenProps) {
  const rules = readPlaySettings(settings, { teams: 2, points: 10 })
  const deal = () => playableMatchingSets(sets)
  const [playable, setPlayable] = useState(deal)
  const [state, dispatch] = useReducer(matchingReducer, rules.teams, initialMatchingRound)
  const [selected, setSelected] = useState<{ left?: string; right?: string }>({})
  const backTo = editPath(game.id)

  useEffect(() => {
    if (!state.lastWrong) return
    const timer = setTimeout(() => dispatch({ type: 'clearWrong' }), WRONG_SHOWN_MS)
    return () => clearTimeout(timer)
  }, [state.lastWrong])

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có bộ nào có ít nhất 2 cặp điền đủ hai bên để chơi." backTo={backTo} />
  }

  const restart = () => {
    dispatch({ type: 'restart', teamCount: rules.teams })
    setPlayable(deal())
    setSelected({})
  }

  if (state.finished) {
    return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Nối đúng nhiều cặp nhất" streakUnit="cặp" />
  }

  const set = playable[state.setIndex]
  const team = state.teams[state.turn]
  const matchedLefts = Object.keys(state.matched)
  const complete = matchedLefts.length === set.pairs.length
  const isLast = state.setIndex === playable.length - 1
  const byId = new Map(set.pairs.map((p) => [p.id, p]))

  const pick = (side: Side, id: string) => {
    if (state.lastWrong) return
    const next = { ...selected, [side]: selected[side] === id ? undefined : id }
    if (next.left && next.right) {
      dispatch({
        type: 'attempt',
        leftId: next.left,
        rightId: next.right,
        correct: isMatch(set, next.left, next.right),
        points: rules.points,
      })
      setSelected({})
    } else {
      setSelected(next)
    }
  }

  const goNext = () => {
    dispatch({ type: 'nextSet', total: playable.length })
    setSelected({})
  }

  // More than 6 pairs: each side wraps into two columns so rows stay big enough to read.
  const perSide = set.pairs.length > 6 ? 2 : 1
  const rows = Math.ceil(set.pairs.length / perSide)
  const rowHeight = Math.min(76, (COLUMNS_HEIGHT - ROW_GAP * (rows - 1)) / rows)
  const fontSize = rowHeight >= 60 ? 26 : 21

  /** State of one entry, for its look. */
  const entryState = (side: Side, pairId: string) => {
    const match =
      side === 'left'
        ? state.matched[pairId] && { ...state.matched[pairId], leftId: pairId }
        : Object.entries(state.matched)
            .map(([leftId, m]) => ({ ...m, leftId }))
            .find((m) => m.rightId === pairId)
    if (match) {
      const color = state.teams.find((t) => t.id === match.teamId)?.color ?? '#1B7A50'
      return { kind: 'matched' as const, color, number: matchedLefts.indexOf(match.leftId) + 1 }
    }
    if (state.lastWrong && state.lastWrong[side === 'left' ? 'leftId' : 'rightId'] === pairId) return { kind: 'wrong' as const }
    if (selected[side] === pairId) return { kind: 'selected' as const }
    return { kind: 'idle' as const }
  }

  const column = (side: Side, ids: string[]) => (
    <div
      className="grid flex-1 content-start"
      style={{ gridTemplateColumns: `repeat(${perSide}, minmax(0, 1fr))`, gap: ROW_GAP }}
      aria-label={side === 'left' ? 'Cột trái' : 'Cột phải'}
    >
      {ids.map((id) => {
        const pair = byId.get(id)
        if (!pair) return null
        const look = entryState(side, id)
        const used = look.kind === 'matched' || (side === 'right' && isRightUsed(state, id))
        return (
          <motion.button
            key={id}
            type="button"
            disabled={used}
            onClick={() => pick(side, id)}
            animate={look.kind === 'wrong' ? { x: [0, -10, 10, -6, 6, 0] } : {}}
            transition={{ duration: 0.45 }}
            className="flex cursor-pointer items-center gap-3 rounded-[20px] border-4 px-4 text-left font-[inherit] text-ink disabled:cursor-default"
            style={{
              height: rowHeight,
              borderColor:
                look.kind === 'matched' ? look.color : look.kind === 'wrong' ? '#A3361A' : look.kind === 'selected' ? team.color : '#FFFFFF',
              background: look.kind === 'matched' ? `${look.color}22` : look.kind === 'wrong' ? '#FBE6E1' : '#FFFFFF',
            }}
          >
            {look.kind === 'matched' && (
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white"
                style={{ background: look.color }}
              >
                {look.number}
              </span>
            )}
            <span className="min-w-0 truncate font-display font-extrabold" style={{ fontSize }}>
              {side === 'left' ? pair.a : pair.b}
            </span>
          </motion.button>
        )
      })}
    </div>
  )

  return (
    <PlayFrame title={game.title} progress={`Bộ ${state.setIndex + 1} / ${playable.length}`} backTo={backTo}>
      <TeamBar teams={state.teams} activeId={complete ? null : team.id} />

      <div className="flex min-h-0 flex-1 gap-8" style={{ height: COLUMNS_HEIGHT }}>
        {column(
          'left',
          set.pairs.map((p) => p.id),
        )}
        <div className="w-1 shrink-0 rounded-full bg-white/70" aria-hidden="true" />
        {column('right', set.rightOrder)}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2.5 text-lg font-extrabold text-ink-soft">
          {complete ? (
            <>
              <CheckIcon size={22} className="text-success" />
              Đã nối xong bộ này!
            </>
          ) : (
            <>
              <span className="size-5 rounded-full" style={{ background: team.color }} />
              {team.name}: chọn một ô bên trái và một ô bên phải đi cùng nhau.
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
            onClick={goNext}
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
