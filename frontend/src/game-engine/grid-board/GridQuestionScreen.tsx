import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { CheckIcon, ChevronLeftIcon, CloseIcon, EyeIcon } from '@/components/ui/icons'
import { useGridBoardRound } from '@/game-engine/grid-board/useGridBoardRound'
import { useGridBoardStore } from '@/store/gridBoardStore'

interface GridQuestionScreenProps {
  gameId: string
  tileNo: number
}

/** Projector: the question behind a tile; the teacher marks the answer right or wrong. */
export function GridQuestionScreen({ gameId, tileNo }: GridQuestionScreenProps) {
  const navigate = useNavigate()
  const { questions, ready } = useGridBoardRound(gameId)
  const teams = useGridBoardStore((s) => s.teams)
  const turn = useGridBoardStore((s) => s.turn)
  const opened = useGridBoardStore((s) => s.openedTiles.includes(tileNo))
  const answer = useGridBoardStore((s) => s.answer)

  // Another team can steal the question; start from the team whose turn it is.
  const [stealOffset, setStealOffset] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const boardPath = `/play/${gameId}`
  const question = questions[tileNo - 1]
  if (ready && (!question || opened)) return <Navigate to={boardPath} replace />
  if (!question || teams.length === 0) return null

  const team = teams[(turn + stealOffset) % teams.length]

  const mark = (correct: boolean) => {
    answer(tileNo, team.id, correct, question.points)
    navigate(boardPath)
  }

  return (
    <div className="flex h-full flex-col gap-5 px-9 py-6">
      <div className="flex items-center justify-between">
        <Link
          to={boardPath}
          className="flex h-12 items-center gap-2 rounded-full bg-white pr-5 pl-3.5 text-[17px] font-extrabold text-ink hover:text-primary-ink"
        >
          <ChevronLeftIcon size={20} strokeWidth={2.4} />
          Bảng ô
        </Link>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white px-[18px] py-2 text-lg font-extrabold">
            Ô số {tileNo} · {question.points} điểm
          </span>
          <span
            className="flex items-center gap-2.5 rounded-full border-[3px] bg-white py-1.5 pr-[18px] pl-2 text-lg font-extrabold"
            style={{ borderColor: team.color }}
          >
            <span className="size-7 rounded-full" style={{ background: team.color }} />
            {team.name} trả lời
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-11 rounded-[36px] bg-white px-11 py-9">
        {question.imageUrl && (
          <img src={question.imageUrl} alt="" className="h-[300px] w-[360px] shrink-0 rounded-[28px] object-cover" />
        )}
        <div className="flex flex-1 flex-col gap-7">
          <span className="font-display text-[64px] leading-[1.1] font-extrabold">{question.text}</span>
          <AnimatePresence mode="wait" initial={false}>
            {revealed ? (
              <motion.div
                key="answer"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col self-start rounded-[22px] bg-sun-soft px-[26px] py-3.5"
              >
                <span className="text-[17px] font-bold text-sun-ink">Đáp án</span>
                <span className="font-display text-[40px] leading-[1.1] font-extrabold">
                  {question.answer || '(chưa nhập đáp án)'}
                </span>
              </motion.div>
            ) : (
              <motion.button
                key="reveal"
                type="button"
                exit={{ opacity: 0 }}
                onClick={() => setRevealed(true)}
                className="flex h-[76px] cursor-pointer items-center gap-3 self-start rounded-[22px] border-0 bg-sun-soft px-[26px] font-[inherit] text-2xl font-extrabold text-ink hover:brightness-95"
              >
                <EyeIcon size={28} />
                Hiện đáp án
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setStealOffset((o) => (o + 1) % teams.length)}
          className="h-14 cursor-pointer rounded-full border-0 bg-white px-[22px] font-[inherit] text-lg font-extrabold text-ink hover:text-primary-ink"
        >
          Đội khác giành quyền
        </button>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => mark(false)}
            className="box-border flex h-[76px] w-[220px] cursor-pointer items-center justify-center gap-2.5 rounded-3xl border-[3px] border-line-strong bg-white font-display text-[30px] font-extrabold text-ink hover:border-ink"
          >
            <CloseIcon size={30} />
            Sai
          </button>
          <button
            type="button"
            onClick={() => mark(true)}
            className="flex h-[76px] w-[260px] cursor-pointer items-center justify-center gap-2.5 rounded-3xl border-0 bg-success font-display text-[30px] font-extrabold text-white hover:brightness-110"
          >
            <CheckIcon size={32} />
            Đúng
          </button>
        </div>
      </div>
    </div>
  )
}
