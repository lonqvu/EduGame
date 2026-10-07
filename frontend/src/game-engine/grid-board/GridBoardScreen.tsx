import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { darken, lighten, orbStyle } from '@/components/projector/materials'
import { CheckIcon, UndoIcon } from '@/components/ui/icons'
import { useGridBoardRound } from '@/game-engine/grid-board/useGridBoardRound'
import { useGridBoardStore } from '@/store/gridBoardStore'

/** How long the tile flip plays before the question screen opens. */
const FLIP_MS = 520

/** Projector: team scores + numbered tiles. */
export function GridBoardScreen({ gameId }: { gameId: string }) {
  const navigate = useNavigate()
  const { game, questions } = useGridBoardRound(gameId)
  const teams = useGridBoardStore((s) => s.teams)
  const turn = useGridBoardStore((s) => s.turn)
  const openedTiles = useGridBoardStore((s) => s.openedTiles)
  const canUndo = useGridBoardStore((s) => s.history.length > 0)
  const undo = useGridBoardStore((s) => s.undo)
  const [flipping, setFlipping] = useState<number | null>(null)

  const remaining = questions.length - openedTiles.length
  const turnColor = teams[turn]?.color ?? '#3563E9'

  const openTile = (tileNo: number) => {
    if (flipping !== null) return
    setFlipping(tileNo)
    setTimeout(() => navigate(`/play/${gameId}/tiles/${tileNo}`), FLIP_MS)
  }

  return (
    <div className="flex h-full flex-col gap-[18px] px-9 py-6">
      <div className="flex items-center justify-between gap-6">
        <h1 className="m-0 truncate font-display text-[26px] font-extrabold drop-shadow-[0_1px_0_#fff]">
          {game?.title}
        </h1>
        <span className="mat-card shrink-0 rounded-full px-4 py-1.5 text-lg font-extrabold">
          {remaining > 0 ? `Còn ${remaining} ô` : 'Đã lật hết ô'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {teams.map((team, i) => {
          const isTurn = i === turn
          return (
            <motion.div
              key={team.id}
              animate={
                isTurn
                  ? { y: [0, -3, 0], boxShadow: [`0 0 0 4px ${team.color}`, `0 0 0 4px ${team.color}, 0 0 26px 4px ${lighten(team.color, 30)}`, `0 0 0 4px ${team.color}`] }
                  : { y: 0, boxShadow: '0 0 0 0px transparent' }
              }
              transition={isTurn ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              className="rounded-[22px]"
            >
              <div className="mat-card box-border flex h-[92px] items-center gap-3.5 rounded-[22px] px-[18px] py-2.5">
                <span className="size-11 shrink-0 rounded-full" style={orbStyle(team.color)} />
                <div className="flex flex-1 flex-col">
                  <span className="text-xl font-extrabold">{team.name}</span>
                  {isTurn && (
                    <span className="text-[15px] font-extrabold" style={{ color: darken(team.color, 35) }}>
                      Đến lượt
                    </span>
                  )}
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
            </motion.div>
          )
        })}
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-6 gap-3.5 rounded-[28px] bg-[#e9d3a8]/45 p-3 shadow-[inset_0_3px_8px_rgb(120_78_20/0.22)]">
        {questions.map((q, i) => {
          const tileNo = i + 1
          return openedTiles.includes(tileNo) ? (
            <div
              key={q.id}
              className="flex items-center justify-center gap-2 rounded-[18px] bg-paper-deep/70 text-[#a08458] shadow-[inset_0_3px_6px_rgb(120_78_20/0.25)]"
              aria-label={`Ô ${tileNo} đã trả lời`}
            >
              <CheckIcon size={26} strokeWidth={2.6} />
              <span className="font-display text-[26px] font-bold">{tileNo}</span>
            </div>
          ) : (
            <FlipTile
              key={q.id}
              tileNo={tileNo}
              flipped={flipping === tileNo}
              faceColor={turnColor}
              onOpen={() => openTile(tileNo)}
            />
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="mat-btn flex h-12 cursor-pointer items-center gap-2 rounded-full border-0 px-5 font-[inherit] text-[17px] font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UndoIcon size={20} />
          Hoàn tác
        </button>
        <div className="flex gap-3">
          <Link
            to="/tools/wheel"
            className="mat-btn mat-btn-sun flex h-12 items-center rounded-full px-[22px] text-[17px] font-extrabold text-ink hover:text-ink"
          >
            Gọi tên ngẫu nhiên
          </Link>
          <Link
            to={`/play/${gameId}/results`}
            className="mat-btn mat-btn-ink flex h-12 items-center rounded-full px-[22px] text-[17px] font-extrabold text-white hover:text-white"
          >
            Kết thúc
          </Link>
        </div>
      </div>
    </div>
  )
}

interface FlipTileProps {
  tileNo: number
  flipped: boolean
  /** Colour of the face revealed by the flip: the team whose turn it is. */
  faceColor: string
  onOpen: () => void
}

/** A card lying face down; flips over in 3D before its question opens. */
function FlipTile({ tileNo, flipped, faceColor, onOpen }: FlipTileProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Lật ô ${tileNo}`}
      className="relative cursor-pointer border-0 bg-transparent p-0 transition-transform duration-150 [perspective:900px] hover:-translate-y-1 active:translate-y-0.5"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0, scale: flipped ? 1.08 : 1 }}
        transition={{ duration: FLIP_MS / 1000, ease: [0.3, 0.7, 0.3, 1] }}
        className="relative size-full [transform-style:preserve-3d]"
      >
        {/* Back: what the class sees before the tile is picked */}
        <div className="mat-card absolute inset-0 flex items-center justify-center rounded-[18px] [backface-visibility:hidden]">
          <div className="pointer-events-none absolute inset-[7px] rounded-[13px] border-2 border-dashed border-[#e2c58c]" />
          <span className="font-display text-[44px] font-extrabold text-primary-ink drop-shadow-[0_2px_0_#fff]">
            {tileNo}
          </span>
        </div>
        {/* Face: revealed by the flip, in the colour of the team answering */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[18px] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{
            background: `linear-gradient(160deg, ${lighten(faceColor, 25)} 0%, ${faceColor} 55%, ${darken(faceColor, 20)} 100%)`,
            boxShadow: `inset 0 2px 0 ${lighten(faceColor, 45)}, 0 5px 0 ${darken(faceColor, 30)}`,
          }}
        >
          <span className="font-display text-[56px] font-extrabold text-white drop-shadow-[0_3px_0_rgb(0_0_0/0.2)]">?</span>
        </div>
      </motion.div>
    </button>
  )
}
