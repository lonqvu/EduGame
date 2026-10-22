import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { turnOf } from '@/game-engine/shared/turnQuiz'
import { TurnQuizPanel } from '@/game-engine/shared/TurnQuizPanel'
import { useTurnQuiz } from '@/game-engine/shared/useTurnQuiz'
import { dealChests, openTreasure, treasureLabel, type Treasure } from '@/game-engine/treasure-chest/chests'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'

const TREASURE_ICON: Record<Treasure['kind'], string> = { points: '💰', double: '✖️2', steal: '🦝', swap: '🔄', empty: '🕸️' }

interface TreasureChestScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Rương vàng": the teams take turns answering; a right answer opens one of three chests, which may hold
 * points, double the team's score, take points from the leader, swap scores with it, or nothing at all.
 */
export function TreasureChestScreen({ game, questions, settings }: TreasureChestScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.TREASURE_CHEST)
  const { question, round, state, dispatch, restart } = useTurnQuiz(questions, rules)
  const [chests, setChests] = useState(() => dealChests())
  /** The chest opened for this question (by count), if any. */
  const [opened, setOpened] = useState<{ at: number; index: number } | null>(null)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (!question) return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  if (state.finished) {
    return (
      <TeamResults
        teams={state.teams}
        onPlayAgain={() => {
          setChests(dealChests())
          setOpened(null)
          restart()
        }}
        mostCorrectLabel="Mở nhiều rương nhất"
      />
    )
  }

  const team = turnOf(state)
  const openIndex = opened?.at === state.asked ? opened.index : null
  const canOpen = state.earned && openIndex === null

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.asked + 1}`}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.asked}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <TeamBar teams={state.teams} activeId={team.id} activeLabel="Đến lượt" />
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="flex w-[520px] shrink-0 flex-col items-center justify-center gap-5 rounded-[28px] bg-[linear-gradient(160deg,#2B3A86,#1A2360)] p-6 text-white">
          <span className="text-xl font-extrabold">{canOpen ? `${team.name} chọn một rương!` : openIndex !== null ? 'Rương đã mở!' : 'Trả lời đúng để mở rương'}</span>
          <div className="grid w-full grid-cols-3 gap-4">
            {chests.map((treasure, i) => {
              const isOpen = openIndex !== null
              const chosen = openIndex === i
              return (
                <motion.button
                  key={`${state.asked}-${i}`}
                  type="button"
                  disabled={!canOpen}
                  whileHover={canOpen ? { scale: 1.06, rotate: -2 } : undefined}
                  animate={canOpen ? { y: [0, -6, 0] } : { y: 0 }}
                  transition={canOpen ? { repeat: Infinity, duration: 1.2, delay: i * 0.15 } : undefined}
                  onClick={() => {
                    setOpened({ at: state.asked, index: i })
                    const scores = openTreasure(state.teams, team.id, treasure)
                    sound.play(treasure.kind === 'empty' ? 'wrong' : 'fanfare')
                    dispatch({ type: 'setScores', scores })
                  }}
                  aria-label={isOpen ? `Rương ${i + 1}: ${treasureLabel(treasure)}` : `Rương ${i + 1}`}
                  className={`flex h-[190px] cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-0 font-[inherit] text-white disabled:cursor-default ${
                    chosen ? 'bg-[#FFD15C] text-ink' : isOpen ? 'bg-white/10 opacity-60' : 'bg-white/10'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isOpen ? (
                      <motion.span key="open" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-2">
                        <span className="text-[56px] leading-none">{TREASURE_ICON[treasure.kind]}</span>
                        <span className={`text-center text-[19px] leading-tight font-extrabold ${chosen ? 'text-ink' : 'text-white'}`}>
                          {treasureLabel(treasure)}
                        </span>
                      </motion.span>
                    ) : (
                      <motion.span key="closed" exit={{ scale: 0.6, opacity: 0 }}>
                        <Chest />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        </div>
        <TurnQuizPanel
          state={state}
          question={question}
          points={0}
          dispatch={(action) => {
            // A new turn deals new chests.
            if (action.type === 'next') setChests(dealChests())
            dispatch(action)
          }}
          move="chọn một rương báu"
          moveDone={openIndex !== null}
        />
      </div>
    </PlayFrame>
  )
}

function Chest() {
  return (
    <svg width={120} height={104} viewBox="0 0 120 104" aria-hidden="true">
      <rect x="8" y="44" width="104" height="56" rx="10" fill="#B9733A" />
      <path d="M8 50 Q8 10 60 10 Q112 10 112 50 Z" fill="#D18A48" />
      <rect x="8" y="44" width="104" height="10" fill="#8C5326" />
      <rect x="20" y="10" width="10" height="90" fill="#F2C14E" />
      <rect x="90" y="10" width="10" height="90" fill="#F2C14E" />
      <rect x="48" y="40" width="24" height="28" rx="5" fill="#FFD15C" stroke="#8C5326" strokeWidth="3" />
      <circle cx="60" cy="52" r="4" fill="#8C5326" />
    </svg>
  )
}
