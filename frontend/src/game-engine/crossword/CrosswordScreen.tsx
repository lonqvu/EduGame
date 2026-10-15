import { motion } from 'motion/react'
import { useReducer, useState, type ReactNode } from 'react'
import { CheckIcon, ChevronRightIcon, CloseIcon } from '@/components/ui/icons'
import {
  boardShape,
  crosswordReducer,
  initialCrossword,
  keywordValue,
  playableRows,
  rowsLeft,
  type PlayableRow,
  type RowResult,
} from '@/game-engine/crossword/crosswordRound'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import type { TeamScore } from '@/game-engine/shared/teamScore'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { CrosswordRow, GameSummary } from '@/types/game'

const BOARD_HEIGHT = 372
const BOARD_WIDTH = 1208
const ROW_LABEL = 52
const GAP = 5

interface CrosswordScreenProps {
  game: GameSummary
  rows: CrosswordRow[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Ô chữ bí mật": every row lines up on its key letter, so the yellow column spells the keyword. The
 * team whose turn it is picks a row and answers its clue aloud; the teacher marks it. Any team may ask to guess the
 * keyword between rows; guessing it early is worth more.
 */
export function CrosswordScreen({ game, rows, settings }: CrosswordScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.CROSSWORD)
  const [playable] = useState(() => playableRows(rows))
  const [state, dispatch] = useReducer(crosswordReducer, rules.teams, initialCrossword)
  const backTo = editPath(game.id)

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có hàng ngang nào đủ gợi ý, đáp án và chữ ở cột từ khóa." backTo={backTo} />
  }

  if (state.finished) {
    return (
      <TeamResults
        teams={state.teams}
        onPlayAgain={() => dispatch({ type: 'restart', teamCount: rules.teams })}
        mostCorrectLabel="Giải được nhiều hàng nhất"
        streakUnit="hàng"
      />
    )
  }

  const keyword = playable.map((r) => r.letters[r.keyIndex]).join('')
  const hidden = rowsLeft(state, playable.length)
  const prize = keywordValue(rules.keywordPoints, hidden)
  const current = state.current === null ? null : playable[state.current]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const guesser = state.teams.find((t) => t.id === state.guessTeamId)
  const keywordTeam = state.teams.find((t) => t.id === state.keywordBy)
  const turnTeam = state.teams[state.turn]
  const allOpen = hidden === 0

  const activeId = state.guessing ? state.guessTeamId : (state.answeringTeamId ?? (keywordTeam ? null : turnTeam.id))

  return (
    <PlayFrame title={game.title} progress={`Còn ${hidden} / ${playable.length} hàng`} backTo={backTo}>
      <TeamBar
        teams={state.teams}
        activeId={activeId}
        activeLabel={state.guessing ? 'Đoán từ khóa' : state.answeringTeamId ? 'Đang trả lời' : 'Chọn hàng'}
        onPick={state.guessing ? (teamId) => dispatch({ type: 'pickGuessTeam', teamId }) : undefined}
        disabledIds={state.guessing ? state.keywordOut : []}
      />

      <Board
        rows={playable}
        results={state.results}
        teams={state.teams}
        currentRow={state.current}
        showAll={!!keywordTeam}
        canOpen={state.current === null && !state.guessing && !keywordTeam}
        onOpen={(row) => dispatch({ type: 'openRow', row })}
      />

      <div className="flex min-h-[112px] items-center gap-5 rounded-[26px] bg-white px-6 py-3">
        {keywordTeam ? (
          <>
            <span className="flex-1 font-display text-[30px] leading-tight font-extrabold">
              {keywordTeam.name} đoán đúng từ khóa <span className="text-primary">{keyword}</span>!
            </span>
            <button type="button" onClick={() => dispatch({ type: 'finish' })} className={`${playButtonClass} bg-primary text-white`}>
              Xem kết quả
              <ChevronRightIcon size={20} />
            </button>
          </>
        ) : current && answering ? (
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-base font-extrabold" style={{ color: answering.color }}>
                Hàng {state.current! + 1} · {current.letters.length} chữ cái · {answering.name} trả lời
                {state.triedTeams.length > 0 && ' (giành quyền)'}
              </span>
              <span className="font-display text-[28px] leading-tight font-extrabold">{current.clue}</span>
            </div>
            <MarkButtons
              onWrong={() => dispatch({ type: 'markRow', correct: false, points: rules.points, allowSteal: rules.allowSteal })}
              onRight={() => dispatch({ type: 'markRow', correct: true, points: rules.points, allowSteal: rules.allowSteal })}
              extra={
                <button type="button" onClick={() => dispatch({ type: 'closeRow' })} className={`${playButtonClass} bg-line-soft text-ink`}>
                  Bỏ qua
                </button>
              }
            />
          </>
        ) : state.guessing ? (
          <>
            <span className="flex-1 font-display text-[28px] leading-tight font-extrabold">
              {guesser ? `${guesser.name} đoán từ khóa có ${keyword.length} chữ cái` : 'Đội nào xin đoán từ khóa? Cô bấm vào tên đội.'}
            </span>
            {guesser ? (
              <MarkButtons
                onWrong={() => dispatch({ type: 'markGuess', correct: false, points: prize })}
                onRight={() => dispatch({ type: 'markGuess', correct: true, points: prize })}
                rightLabel={`Đúng (+${prize})`}
              />
            ) : (
              <button type="button" onClick={() => dispatch({ type: 'cancelGuess' })} className={`${playButtonClass} bg-line-soft text-ink`}>
                Thôi
              </button>
            )}
          </>
        ) : (
          <>
            <span className="flex-1 text-xl font-extrabold text-ink-soft">
              {allOpen
                ? 'Đã mở hết các hàng. Đội nào đoán được từ khóa?'
                : `${turnTeam.name} chọn một hàng ngang (bấm số hàng). Đoán đúng từ khóa bây giờ được ${prize} điểm.`}
            </span>
            <button type="button" onClick={() => dispatch({ type: 'startGuess' })} className={`${playButtonClass} bg-sun text-ink`}>
              Đoán từ khóa
            </button>
            <button type="button" onClick={() => dispatch({ type: 'finish' })} className={`${playButtonClass} bg-line-soft text-ink`}>
              Kết thúc
            </button>
          </>
        )}
      </div>
    </PlayFrame>
  )
}

function MarkButtons({
  onWrong,
  onRight,
  rightLabel = 'Đúng',
  extra,
}: {
  onWrong: () => void
  onRight: () => void
  rightLabel?: string
  extra?: ReactNode
}) {
  return (
    <div className="flex shrink-0 gap-3">
      {extra}
      <button type="button" onClick={onWrong} className={`${playButtonClass} border-[3px] border-solid border-line bg-white text-ink`}>
        <CloseIcon size={22} />
        Sai
      </button>
      <button type="button" onClick={onRight} className={`${playButtonClass} bg-success text-white`}>
        <CheckIcon size={22} />
        {rightLabel}
      </button>
    </div>
  )
}

interface BoardProps {
  rows: PlayableRow[]
  results: Record<number, RowResult>
  teams: TeamScore[]
  currentRow: number | null
  /** The keyword is found: every letter is shown. */
  showAll: boolean
  canOpen: boolean
  onOpen: (row: number) => void
}

function Board({ rows, results, teams, currentRow, showAll, canOpen, onOpen }: BoardProps) {
  const { left, columns } = boardShape(rows)
  const cell = Math.floor(
    Math.min(50, (BOARD_HEIGHT - GAP * (rows.length - 1)) / rows.length, (BOARD_WIDTH - ROW_LABEL - 24 - GAP * columns) / columns),
  )
  const boardWidth = ROW_LABEL + 12 + columns * (cell + GAP)
  const keyX = ROW_LABEL + 12 + left * (cell + GAP)

  return (
    <div className="relative flex shrink-0 justify-center" style={{ height: BOARD_HEIGHT }}>
      <div className="relative" style={{ width: boardWidth }}>
        {/* The keyword column. */}
        <div
          className="absolute rounded-xl bg-sun/40"
          style={{ left: keyX - 4, top: -4, width: cell + 8, height: rows.length * (cell + GAP) - GAP + 8 }}
        />
        {rows.map((row, r) => {
          const result = results[r]
          const team = result?.status === 'solved' ? teams.find((t) => t.id === result.teamId) : undefined
          const shown = showAll || !!result
          const open = r === currentRow
          return (
            <div key={row.id} className="absolute flex items-center" style={{ top: r * (cell + GAP), left: 0, height: cell }}>
              <button
                type="button"
                aria-label={`Hàng ${r + 1}`}
                disabled={!canOpen || !!result}
                onClick={() => onOpen(r)}
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-full border-[3px] font-[inherit] font-extrabold disabled:cursor-default"
                style={{
                  width: Math.min(cell, ROW_LABEL),
                  height: Math.min(cell, ROW_LABEL),
                  marginRight: 12 + ROW_LABEL - Math.min(cell, ROW_LABEL),
                  fontSize: Math.min(22, cell * 0.5),
                  borderColor: open ? '#1F2A44' : team ? team.color : '#FFFFFF',
                  background: open ? '#1F2A44' : team ? team.color : result ? '#C9CFDC' : '#FFFFFF',
                  color: open || team ? '#FFFFFF' : '#1F2A44',
                }}
              >
                {r + 1}
              </button>
              {row.letters.map((letter, i) => {
                const col = left - row.keyIndex + i
                const isKey = i === row.keyIndex
                return (
                  <motion.span
                    key={i}
                    initial={false}
                    animate={shown ? { rotateX: [90, 0] } : { rotateX: 0 }}
                    transition={{ delay: shown ? i * 0.05 : 0, duration: 0.3 }}
                    className="absolute flex items-center justify-center rounded-lg border-[3px] font-display leading-none font-extrabold"
                    style={{
                      left: ROW_LABEL + 12 + col * (cell + GAP),
                      width: cell,
                      height: cell,
                      fontSize: cell * 0.55,
                      borderColor: open ? '#1F2A44' : isKey ? '#D99A12' : '#FFFFFF',
                      background: !shown ? (isKey ? '#FFE9A8' : '#FFFFFF') : team ? `${team.color}26` : isKey ? '#FFD15C' : '#EEF1F6',
                      color: team ? '#1F2A44' : '#5B6478',
                    }}
                  >
                    {shown ? letter : ''}
                  </motion.span>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
