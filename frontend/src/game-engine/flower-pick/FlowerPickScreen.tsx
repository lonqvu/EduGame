import { motion } from 'motion/react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { flowerSpots, MAX_FLOWERS } from '@/game-engine/flower-pick/flowers'
import { BoardFooter } from '@/game-engine/shared/BoardFooter'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { TurnQuestion } from '@/game-engine/shared/TurnQuestion'
import { turnTeam } from '@/game-engine/shared/turnBoard'
import { useTurnBoard } from '@/game-engine/shared/useTurnBoard'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'

const TREE_WIDTH = 1208
const TREE_HEIGHT = 418
const PETALS = ['#FF8FB1', '#FFB547', '#B98CFF', '#5EC2FF', '#FF7A6B', '#F7D046']

interface FlowerPickScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Hái hoa dân chủ": a tree with one numbered flower per question. The teams take turns picking a
 * flower and answering its question; picked flowers leave the tree, and the game ends when it is bare.
 */
export function FlowerPickScreen({ game, questions, settings }: FlowerPickScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.FLOWER_PICK)
  const { playable, layout: spots, round, state, dispatch, restart } = useTurnBoard(questions, rules, (dealt) => {
    const cells = Math.min(dealt.length, MAX_FLOWERS)
    return { layout: flowerSpots(cells), cells }
  })
  const sound = useSound()
  const backTo = editPath(game.id)

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} />

  const picked = state.done.filter(Boolean).length
  const team = turnTeam(state)

  return (
    <PlayFrame
      title={game.title}
      progress={`Đã hái ${picked} / ${state.done.length} bông`}
      extra={
        state.current !== null &&
        rules.timeLimitSec > 0 &&
        !state.revealed && <Countdown key={`${round}-${state.current}`} seconds={rules.timeLimitSec} paused={state.revealed} />
      }
      backTo={backTo}
    >
      {state.current !== null ? (
        <TurnQuestion
          state={state}
          question={playable[state.current]}
          rules={rules}
          dispatch={dispatch}
          heading={`Bông hoa số ${state.current + 1} · ${rules.points} điểm`}
          closeLabel={picked + 1 >= state.done.length ? 'Xem kết quả' : 'Quay lại cây hoa'}
        />
      ) : (
        <>
          <div className="relative shrink-0 overflow-hidden rounded-[28px] bg-[linear-gradient(#DDF1FF,#F2FAFF)]" style={{ width: TREE_WIDTH, height: TREE_HEIGHT }}>
            <svg width={TREE_WIDTH} height={TREE_HEIGHT} className="absolute inset-0" aria-hidden="true">
              <rect y={TREE_HEIGHT - 40} width={TREE_WIDTH} height={40} fill="#9ED37E" />
              <path d={`M${TREE_WIDTH / 2 - 34} ${TREE_HEIGHT - 30} Q${TREE_WIDTH / 2} ${TREE_HEIGHT - 150} ${TREE_WIDTH / 2 - 10} ${TREE_HEIGHT - 260} L${TREE_WIDTH / 2 + 22} ${TREE_HEIGHT - 260} Q${TREE_WIDTH / 2 + 18} ${TREE_HEIGHT - 150} ${TREE_WIDTH / 2 + 40} ${TREE_HEIGHT - 30} Z`} fill="#9A6B43" />
              <ellipse cx={TREE_WIDTH / 2} cy={TREE_HEIGHT * 0.45} rx={TREE_WIDTH * 0.43} ry={TREE_HEIGHT * 0.42} fill="#7CC36B" />
              <ellipse cx={TREE_WIDTH / 2 - 260} cy={TREE_HEIGHT * 0.5} rx={200} ry={130} fill="#6DB65C" />
              <ellipse cx={TREE_WIDTH / 2 + 260} cy={TREE_HEIGHT * 0.5} rx={200} ry={130} fill="#6DB65C" />
              <ellipse cx={TREE_WIDTH / 2} cy={TREE_HEIGHT * 0.3} rx={300} ry={120} fill="#86CC74" />
            </svg>
            {spots.map((spot, i) =>
              state.done[i] ? null : (
                <motion.button
                  key={`${round}-${i}`}
                  type="button"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ delay: i * 0.03, type: 'spring', bounce: 0.5 }}
                  whileHover={{ scale: 1.12, rotate: 8 }}
                  onClick={() => {
                    sound.play('pop')
                    dispatch({ type: 'open', cell: i, points: rules.points })
                  }}
                  aria-label={`Bông hoa số ${i + 1}`}
                  className="absolute flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-[inherit]"
                  style={{ left: spot.x * TREE_WIDTH - 40, top: spot.y * TREE_HEIGHT - 40, width: 80, height: 80 }}
                >
                  <Flower color={PETALS[i % PETALS.length]} number={i + 1} />
                </motion.button>
              ),
            )}
          </div>
          <TeamBar teams={state.teams} activeId={team.id} activeLabel="Đến lượt hái hoa" />
          <BoardFooter message={`${team.name} chọn một bông hoa nhé!`} onFinish={() => dispatch({ type: 'finish' })} />
        </>
      )}
    </PlayFrame>
  )
}

function Flower({ color, number }: { color: string; number: number }) {
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} cx={40} cy={20} rx={14} ry={19} fill={color} transform={`rotate(${deg} 40 40)`} />
      ))}
      <circle cx={40} cy={40} r={16} fill="#FFF6C7" stroke="#F2B705" strokeWidth={3} />
      <text x={40} y={47} textAnchor="middle" fontSize={20} fontWeight={800} fill="#5A3A00">
        {number}
      </text>
    </svg>
  )
}
