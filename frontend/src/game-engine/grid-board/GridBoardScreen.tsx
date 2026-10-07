import { motion } from 'motion/react'
import { Link } from 'react-router'
import { CheckIcon, UndoIcon } from '@/components/ui/icons'
import { useGridBoardRound } from '@/game-engine/grid-board/useGridBoardRound'
import { useGridBoardStore } from '@/store/gridBoardStore'

/** Projector: team scores + numbered tiles. */
export function GridBoardScreen({ gameId }: { gameId: string }) {
  const { game, questions } = useGridBoardRound(gameId)
  const teams = useGridBoardStore((s) => s.teams)
  const turn = useGridBoardStore((s) => s.turn)
  const openedTiles = useGridBoardStore((s) => s.openedTiles)
  const canUndo = useGridBoardStore((s) => s.history.length > 0)
  const undo = useGridBoardStore((s) => s.undo)

  const remaining = questions.length - openedTiles.length

  return (
    <div className="flex h-full flex-col gap-[18px] px-9 py-6">
      <div className="flex items-center justify-between gap-6">
        <h1 className="m-0 truncate font-display text-[26px] font-extrabold">{game?.title}</h1>
        <span className="shrink-0 rounded-full bg-white px-4 py-1.5 text-lg font-extrabold">
          {remaining > 0 ? `Còn ${remaining} ô` : 'Đã lật hết ô'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {teams.map((team, i) => {
          const isTurn = i === turn
          return (
            <div
              key={team.id}
              className="box-border flex h-[92px] items-center gap-3.5 rounded-[22px] border-4 bg-white px-[18px] py-2.5 transition-colors"
              style={{ borderColor: isTurn ? team.color : '#FFFFFF' }}
            >
              <span className="size-11 shrink-0 rounded-full" style={{ background: team.color }} />
              <div className="flex flex-1 flex-col">
                <span className="text-xl font-extrabold">{team.name}</span>
                {isTurn && <span className="text-[15px] font-extrabold text-[#9A4A00]">Đến lượt</span>}
              </div>
              <motion.span
                key={team.score}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="font-display text-[44px] font-extrabold"
              >
                {team.score}
              </motion.span>
            </div>
          )
        })}
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-6 gap-3.5">
        {questions.map((q, i) => {
          const tileNo = i + 1
          return openedTiles.includes(tileNo) ? (
            <div
              key={q.id}
              className="flex items-center justify-center gap-2 rounded-[20px] bg-tile-done text-ink-muted"
              aria-label={`Ô ${tileNo} đã trả lời`}
            >
              <CheckIcon size={26} strokeWidth={2.6} />
              <span className="font-display text-[26px] font-bold">{tileNo}</span>
            </div>
          ) : (
            <Link
              key={q.id}
              to={`/play/${gameId}/tiles/${tileNo}`}
              className="flex items-center justify-center rounded-[20px] bg-white font-display text-[44px] font-extrabold text-primary-ink shadow-[0_4px_0_#C3D3EE] transition-transform hover:-translate-y-1 hover:text-primary-ink"
            >
              {tileNo}
            </Link>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="flex h-12 cursor-pointer items-center gap-2 rounded-full border-0 bg-white px-5 font-[inherit] text-[17px] font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UndoIcon size={20} />
          Hoàn tác
        </button>
        <div className="flex gap-3">
          <Link
            to="/tools/wheel"
            className="flex h-12 items-center rounded-full bg-sun px-[22px] text-[17px] font-extrabold text-ink hover:text-ink hover:brightness-95"
          >
            Gọi tên ngẫu nhiên
          </Link>
          <Link
            to={`/play/${gameId}/results`}
            className="flex h-12 items-center rounded-full bg-ink px-[22px] text-[17px] font-extrabold text-white hover:text-white hover:brightness-125"
          >
            Kết thúc
          </Link>
        </div>
      </div>
    </div>
  )
}
