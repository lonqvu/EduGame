import { motion } from 'motion/react'
import { useState } from 'react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { BoardEnd } from '@/game-engine/shared/BoardEnd'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { dropRow, findLine } from '@/game-engine/shared/lines'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { turnOf } from '@/game-engine/shared/turnQuiz'
import { TurnQuizPanel } from '@/game-engine/shared/TurnQuizPanel'
import { useTurnQuiz } from '@/game-engine/shared/useTurnQuiz'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'

const ROWS = 6
const COLS = 7
const CELL = 64
const LINE_BONUS = 30

interface ConnectFourScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Bốn ô liên tiếp": two teams take turns answering; a right answer drops the team's disc in a column
 * of the 6×7 board. Four in a row (across, down or diagonal) wins the board.
 */
export function ConnectFourScreen({ game, questions, settings }: ConnectFourScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.CONNECT_FOUR)
  const { question, round, state, dispatch, restart } = useTurnQuiz(questions, rules, 2)
  const [cells, setCells] = useState<(string | null)[]>(() => Array(ROWS * COLS).fill(null))
  const [movedAt, setMovedAt] = useState(-1)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (!question) return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  const newBoard = () => {
    setCells(Array(ROWS * COLS).fill(null))
    setMovedAt(-1)
  }
  if (state.finished) {
    return (
      <TeamResults
        teams={state.teams}
        onPlayAgain={() => {
          newBoard()
          restart()
        }}
        mostCorrectLabel="Thả nhiều quân nhất"
      />
    )
  }

  const line = findLine(cells, ROWS, COLS, 4)
  const full = cells.every(Boolean)
  const over = !!line || full
  const team = turnOf(state)
  const moved = movedAt === state.asked
  const canDrop = state.earned && !moved && !over
  const winner = line && state.teams.find((t) => t.id === line.owner)

  const drop = (col: number) => {
    const row = dropRow(cells, ROWS, COLS, col)
    if (row < 0) return
    sound.play('drop')
    const next = cells.map((c, k) => (k === row * COLS + col ? team.id : c))
    setCells(next)
    setMovedAt(state.asked)
    const won = findLine(next, ROWS, COLS, 4)
    if (won) {
      sound.play('fanfare')
      dispatch({ type: 'award', teamId: won.owner, points: LINE_BONUS })
    }
  }

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.asked + 1}`}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.asked}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <TeamBar teams={state.teams} activeId={over ? null : team.id} />
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="flex shrink-0 flex-col gap-2">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL}px)` }} role="group" aria-label="Chọn cột">
            {Array.from({ length: COLS }, (_, col) => (
              <button
                key={col}
                type="button"
                disabled={!canDrop || dropRow(cells, ROWS, COLS, col) < 0}
                onClick={() => drop(col)}
                aria-label={`Thả vào cột ${col + 1}`}
                className="flex h-9 cursor-pointer items-center justify-center rounded-xl border-0 font-[inherit] text-lg font-extrabold text-white disabled:cursor-default disabled:opacity-25"
                style={{ background: team.color }}
              >
                ▼
              </button>
            ))}
          </div>
          <div
            className="grid gap-1.5 rounded-[22px] bg-[#3563E9] p-2.5"
            style={{ gridTemplateColumns: `repeat(${COLS}, ${CELL - 5}px)` }}
            role="grid"
            aria-label="Bàn cờ"
          >
            {cells.map((owner, i) => {
              const color = owner ? state.teams.find((t) => t.id === owner)?.color : undefined
              const inLine = line?.cells.includes(i)
              return (
                <span key={`${round}-${i}`} className="relative overflow-hidden rounded-full bg-[#DCE7FF]" style={{ width: CELL - 5, height: CELL - 5 }}>
                  {owner && (
                    <motion.span
                      initial={{ y: -((Math.floor(i / COLS) + 1) * CELL) }}
                      animate={{ y: 0, scale: inLine ? [1, 1.12, 1] : 1 }}
                      transition={{ y: { type: 'spring', bounce: 0.3, duration: 0.6 }, scale: { repeat: inLine ? Infinity : 0, duration: 0.9 } }}
                      className="absolute inset-0 rounded-full border-4 border-white/40"
                      style={{ background: color }}
                      aria-label={state.teams.find((t) => t.id === owner)?.name}
                    />
                  )}
                </span>
              )
            })}
          </div>
        </div>
        <TurnQuizPanel
          state={state}
          question={question}
          points={rules.points}
          dispatch={dispatch}
          move="chọn cột để thả quân"
          moveDone={moved}
          footer={
            over && (!state.earned || moved) ? (
              <BoardEnd
                title={winner ? `${winner.name} có 4 quân liền nhau! +${LINE_BONUS}` : 'Hòa! Bàn cờ đã kín.'}
                onNewBoard={() => {
                  newBoard()
                  if (state.revealed) dispatch({ type: 'next' })
                }}
                onResults={() => dispatch({ type: 'finish' })}
              />
            ) : undefined
          }
        />
      </div>
    </PlayFrame>
  )
}
