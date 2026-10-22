import { motion } from 'motion/react'
import { useState } from 'react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { BoardEnd } from '@/game-engine/shared/BoardEnd'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { findLine } from '@/game-engine/shared/lines'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { turnOf } from '@/game-engine/shared/turnQuiz'
import { TurnQuizPanel } from '@/game-engine/shared/TurnQuizPanel'
import { useTurnQuiz } from '@/game-engine/shared/useTurnQuiz'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'

/** Points for the three in a row, on top of the points of each right answer. */
const LINE_BONUS = 30
const MARKS = ['X', 'O']

interface TicTacToeScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Cờ ca-rô hỏi đáp": two teams, X and O, take turns answering; a right answer marks a free cell of the
 * 3×3 board. Three in a row wins the board (a bonus); "Ván mới" plays another board, the scores carry on.
 */
export function TicTacToeScreen({ game, questions, settings }: TicTacToeScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.TIC_TAC_TOE)
  const { question, round, state, dispatch, restart } = useTurnQuiz(questions, rules, 2)
  const [cells, setCells] = useState<(string | null)[]>(() => Array(9).fill(null))
  /** The question (by count) whose move was made. */
  const [movedAt, setMovedAt] = useState(-1)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (!question) return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  const newBoard = () => {
    setCells(Array(9).fill(null))
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
        mostCorrectLabel="Đánh dấu nhiều ô nhất"
      />
    )
  }

  const line = findLine(cells, 3, 3, 3)
  const full = cells.every(Boolean)
  const over = !!line || full
  const team = turnOf(state)
  const moved = movedAt === state.asked
  const canMark = state.earned && !moved && !over
  const winner = line && state.teams.find((t) => t.id === line.owner)
  const markOf = (teamId: string) => MARKS[state.teams.findIndex((t) => t.id === teamId)]

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.asked + 1}`}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.asked}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <TeamBar teams={state.teams.map((t, i) => ({ ...t, name: `${t.name} (${MARKS[i]})` }))} activeId={over ? null : team.id} />
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="grid shrink-0 grid-cols-3 gap-3 rounded-[28px] bg-white p-4" style={{ width: 480, height: 480 }} role="grid" aria-label="Bàn cờ">
          {cells.map((owner, i) => {
            const inLine = line?.cells.includes(i)
            const color = owner ? state.teams.find((t) => t.id === owner)?.color : undefined
            return (
              <button
                key={`${round}-${i}`}
                type="button"
                disabled={!canMark || !!owner}
                aria-label={owner ? `Ô ${i + 1}: ${markOf(owner)}` : `Ô ${i + 1}, trống`}
                onClick={() => {
                  sound.play('pop')
                  const next = cells.map((c, k) => (k === i ? team.id : c))
                  setCells(next)
                  setMovedAt(state.asked)
                  const won = findLine(next, 3, 3, 3)
                  if (won) {
                    sound.play('fanfare')
                    dispatch({ type: 'award', teamId: won.owner, points: LINE_BONUS })
                  }
                }}
                className={`flex items-center justify-center rounded-2xl border-0 font-display text-[110px] leading-none font-extrabold disabled:cursor-default ${
                  inLine ? 'bg-sun-soft' : canMark && !owner ? 'cursor-pointer bg-primary-soft hover:bg-[#D3E1FF]' : 'bg-surface-soft'
                }`}
              >
                {owner && (
                  <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.5 }} style={{ color }}>
                    {markOf(owner)}
                  </motion.span>
                )}
              </button>
            )
          })}
        </div>
        <TurnQuizPanel
          state={state}
          question={question}
          points={rules.points}
          dispatch={dispatch}
          move="chọn một ô trống để đánh dấu"
          moveDone={moved}
          footer={
            over && (!state.earned || moved) ? (
              <BoardEnd
                title={winner ? `${winner.name} thắng ván này! +${LINE_BONUS}` : 'Hòa! Bàn cờ đã kín.'}
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
