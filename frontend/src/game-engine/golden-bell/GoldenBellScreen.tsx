import { App } from 'antd'
import { motion } from 'motion/react'
import { useEffect, useReducer, useState } from 'react'
import { Link } from 'react-router'
import { ChevronRightIcon, EyeIcon, FilledStarIcon, RefreshIcon } from '@/components/ui/icons'
import { Avatar } from '@/components/ui/Avatar'
import { goldenBellReducer, initialGoldenBell, stillIn } from '@/game-engine/golden-bell/goldenBellRound'
import { Confetti } from '@/game-engine/name-picker/effects'
import { Countdown, QuizOption } from '@/game-engine/quiz/QuizParts'
import { playableQuizQuestions, questionFontSize } from '@/game-engine/quiz/quizRound'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { useFinishPlaySession } from '@/game-engine/shared/usePlaySession'
import { editPath } from '@/game-engine/registry'
import { useClassStore } from '@/store/classStore'
import type { GameSummary, QuizQuestion, Student } from '@/types/game'
import { assetSrc } from '@/utils/images'

const WINNER_STARS = 2
/** Height of the class board next to the question. */
const BOARD_HEIGHT = 520

interface GoldenBellScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Rung chuông vàng": the question and its answers on the left, the whole class on the right. After
 * "Hiện đáp án" the teacher taps who answered wrong; they leave the board at the next question.
 */
export function GoldenBellScreen({ game, questions, settings }: GoldenBellScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.GOLDEN_BELL)
  const students = useClassStore((s) => s.students)
  const classStatus = useClassStore((s) => s.status)
  const loadClass = useClassStore((s) => s.load)
  const deal = () => playableQuizQuestions(questions, { shuffleItems: rules.shuffleItems, shuffleOptions: rules.shuffleOptions })
  const [playable, setPlayable] = useState(deal)
  const [round, setRound] = useState(0)
  const [state, dispatch] = useReducer(goldenBellReducer, rules.rescues, initialGoldenBell)
  const backTo = editPath(game.id)

  useEffect(() => {
    void loadClass()
  }, [loadClass])

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }
  if (classStatus === 'ready' && students.length === 0) {
    return <NothingToPlay message="Lớp chưa có học sinh nào để cùng chơi Rung chuông vàng." backTo={backTo} />
  }

  const ids = students.map((s) => s.id)
  const inGame = stillIn(state, ids)

  const restart = () => {
    dispatch({ type: 'restart', rescues: rules.rescues })
    setPlayable(deal())
    setRound((r) => r + 1)
  }

  if (state.finished) {
    const winners = students.filter((s) => inGame.includes(s.id))
    return <BellResults winners={winners} total={students.length} onPlayAgain={restart} />
  }

  const question = playable[state.index]
  const isLast = state.index === playable.length - 1
  const wrongCount = state.wrongNow.filter((id) => inGame.includes(id)).length
  const canRescue = state.rescuesLeft > 0 && Object.keys(state.out).length > 0 && !state.revealed

  const cols = students.length > 32 ? 5 : 4
  const rows = Math.max(1, Math.ceil(students.length / cols))
  const chipHeight = Math.min(58, (BOARD_HEIGHT - 52 - (rows - 1) * 8) / rows)

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.index + 1} / ${playable.length}`}
      extra={
        <>
          <span className="rounded-full bg-sun px-4 py-1.5 text-lg font-extrabold">
            Còn {inGame.length} / {students.length} bạn
          </span>
          {rules.timeLimitSec > 0 && (
            <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />
          )}
        </>
      }
      backTo={backTo}
    >
      <div className="flex min-h-0 flex-1 gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="flex min-h-0 flex-1 items-center gap-6 rounded-[32px] bg-white px-8 py-5">
            {question.imageUrl && (
              <img src={assetSrc(question.imageUrl)} alt="" className="h-[160px] w-[200px] shrink-0 rounded-3xl object-cover" />
            )}
            <span className="font-display leading-[1.1] font-extrabold" style={{ fontSize: questionFontSize(question.text, 46) }}>
              {question.text}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {question.options.map((option, i) => {
              const right = option.id === question.correctId
              return (
                <QuizOption
                  key={option.id}
                  option={option}
                  index={i}
                  trueFalse={question.trueFalse}
                  look={state.revealed ? (right ? 'right' : 'dim') : 'idle'}
                  disabled
                  compact
                />
              )
            })}
          </div>
        </div>

        <section
          aria-label="Học sinh trong lớp"
          className="flex w-[470px] shrink-0 flex-col gap-2 rounded-[28px] bg-white/85 p-3.5"
          style={{ height: BOARD_HEIGHT }}
        >
          <span className="px-1 text-base font-extrabold text-ink-soft">
            {state.revealed ? 'Bấm vào bạn trả lời sai' : 'Các bạn giơ bảng khi hết giờ'}
          </span>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: chipHeight }}>
            {students.map((student) => (
              <StudentChip
                key={student.id}
                student={student}
                outAt={state.out[student.id]}
                wrong={state.wrongNow.includes(student.id)}
                canMark={state.revealed}
                onToggle={() => dispatch({ type: 'toggleWrong', studentId: student.id })}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-lg font-extrabold text-ink-soft">
          {state.revealed
            ? wrongCount > 0
              ? wrongCount === inGame.length
                ? 'Cả lớp cùng sai: không ai bị loại ở câu này.'
                : `${wrongCount} bạn trả lời sai sẽ ra ngoài.`
              : 'Bấm vào tên các bạn trả lời sai, rồi sang câu tiếp theo.'
            : state.everyoneWrong
              ? 'Câu vừa rồi cả lớp cùng sai nên không ai bị loại.'
              : 'Cả lớp ghi đáp án lên bảng con.'}
        </span>
        <div className="flex shrink-0 gap-3">
          {canRescue && (
            <button type="button" onClick={() => dispatch({ type: 'rescue' })} className={`${playButtonClass} bg-sun text-ink`}>
              <RefreshIcon size={22} />
              Cứu trợ ({state.rescuesLeft})
            </button>
          )}
          {!state.revealed && (
            <button type="button" onClick={() => dispatch({ type: 'reveal' })} className={`${playButtonClass} bg-sun-soft text-ink`}>
              <EyeIcon size={22} />
              Hiện đáp án
            </button>
          )}
          <button type="button" onClick={() => dispatch({ type: 'finish' })} className={`${playButtonClass} bg-white text-ink`}>
            Kết thúc
          </button>
          <button
            type="button"
            disabled={!state.revealed}
            onClick={() => dispatch({ type: 'next', total: playable.length, studentIds: ids })}
            className={`${playButtonClass} bg-primary text-white hover:brightness-110`}
          >
            {isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </div>
    </PlayFrame>
  )
}

interface StudentChipProps {
  student: Student
  /** Question number the student was out at, if out. */
  outAt?: number
  wrong: boolean
  canMark: boolean
  onToggle: () => void
}

function StudentChip({ student, outAt, wrong, canMark, onToggle }: StudentChipProps) {
  const out = outAt !== undefined
  return (
    <button
      type="button"
      aria-pressed={wrong}
      aria-label={out ? `${student.name}, ra ngoài ở câu ${outAt}` : wrong ? `${student.name}, trả lời sai` : student.name}
      disabled={out || !canMark}
      onClick={onToggle}
      className={`flex min-w-0 cursor-pointer items-center gap-1.5 rounded-2xl border-[3px] px-2 font-[inherit] text-left disabled:cursor-default ${
        out
          ? 'border-transparent bg-line-soft text-ink-soft opacity-60'
          : wrong
            ? 'border-danger bg-[#FBE6E1] text-danger'
            : 'border-white bg-white text-ink hover:border-[#F2C94C]'
      }`}
    >
      <span className={`min-w-0 flex-1 truncate text-[17px] font-extrabold ${out ? 'line-through' : ''}`}>{student.name}</span>
      {out && <span className="shrink-0 text-[12px] font-bold">C{outAt}</span>}
      {wrong && !out && <span className="shrink-0 text-lg font-extrabold">✕</span>}
    </button>
  )
}

interface BellResultsProps {
  winners: Student[]
  total: number
  onPlayAgain: () => void
}

/** Who rang the golden bell, and stars for them (saved to the class). */
function BellResults({ winners, total, onPlayAgain }: BellResultsProps) {
  const { message } = App.useApp()
  const awardStars = useClassStore((s) => s.awardStars)
  const [starred, setStarred] = useState(false)
  const playAgain = useFinishPlaySession(onPlayAgain, { winners: winners.map((w) => w.name), players: total })
  const names = winners.map((w) => w.name)
  const headline =
    winners.length === 1 ? `${names[0]} rung chuông vàng!` : `${winners.length} bạn cùng rung chuông vàng!`

  const giveStars = async () => {
    setStarred(true)
    const results = await Promise.allSettled(winners.map((w) => awardStars(w.id, WINNER_STARS)))
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed) {
      setStarred(false)
      message.error(`Chưa lưu được sao cho ${failed} bạn, cô thử lại nhé.`)
    } else {
      message.success(`Đã thưởng ${WINNER_STARS} sao cho ${winners.length} bạn`)
    }
  }

  return (
    <div className="relative flex h-full flex-col items-center gap-5 px-12 py-8">
      <Confetti />
      <span className="text-[22px] font-extrabold text-sun-ink">Kết thúc trò chơi</span>
      <motion.div initial={{ rotate: -20, scale: 0.4 }} animate={{ rotate: [0, -14, 14, -8, 8, 0], scale: 1 }} transition={{ duration: 1.1 }}>
        <BellIcon />
      </motion.div>
      <h1 className="m-0 text-center font-display text-[54px] leading-none font-extrabold">{headline}</h1>
      <span className="text-xl font-bold text-ink-soft">
        Trụ lại {winners.length} / {total} bạn
      </span>
      <div className="flex max-w-[1080px] flex-wrap justify-center gap-3">
        {winners.slice(0, 14).map((w) => (
          <span key={w.id} className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-5 pl-1.5">
            <Avatar name={w.name} size={44} />
            <span className="text-[22px] font-extrabold">{w.name}</span>
          </span>
        ))}
        {winners.length > 14 && (
          <span className="flex items-center rounded-full bg-white px-5 text-[22px] font-extrabold">+{winners.length - 14} bạn</span>
        )}
      </div>
      <div className="mt-auto flex gap-3.5">
        {winners.length > 0 && (
          <button
            type="button"
            onClick={() => void giveStars()}
            disabled={starred}
            className="flex h-[60px] cursor-pointer items-center gap-2.5 rounded-full border-0 bg-primary px-7 font-[inherit] text-[19px] font-extrabold text-white hover:brightness-110 disabled:cursor-default disabled:opacity-60"
          >
            <FilledStarIcon size={22} stroke="#FFFFFF" />
            {starred ? 'Đã thưởng sao' : `Thưởng ${WINNER_STARS} sao cho ${winners.length === 1 ? names[0] : `${winners.length} bạn`}`}
          </button>
        )}
        <button
          type="button"
          onClick={playAgain}
          className="h-[60px] cursor-pointer rounded-full border-0 bg-white px-[26px] font-[inherit] text-[19px] font-extrabold text-ink hover:text-primary-ink"
        >
          Chơi lại
        </button>
        <Link
          to="/"
          className="flex h-[60px] items-center rounded-full bg-white px-[26px] text-[19px] font-extrabold text-ink hover:text-primary-ink"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="120" height="120" viewBox="-60 -60 120 120" aria-hidden="true">
      <path d="M-40 30 C-40 -6 -30 -34 0 -38 C30 -34 40 -6 40 30 L48 38 L-48 38 Z" fill="#FFC93C" stroke="#D99A12" strokeWidth="3" />
      <path d="M-24 -10 C-20 -24 -12 -30 -2 -32" stroke="#FFF3C4" strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="0" cy="44" r="9" fill="#D99A12" />
      <rect x="-7" y="-50" width="14" height="14" rx="4" fill="#D99A12" />
    </svg>
  )
}
