import { motion } from 'motion/react'
import { useReducer, useState } from 'react'
import { bingoQuestions, bingoReducer, cardSize, cellOf, initialBingo, makeCards } from '@/game-engine/bingo/bingo'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { playableQuizQuestions, questionFontSize } from '@/game-engine/quiz/quizRound'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'

interface BingoScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Bingo": each team has its own card of answers. For each question, a team that finds the right answer
 * on its card points at it (the teacher taps the cell); the answer shown, right claims are marked and score. The
 * first team with a full line calls "Bingo!".
 */
export function BingoScreen({ game, questions, settings }: BingoScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.BINGO)
  const deal = () => {
    const { asked, answers } = bingoQuestions(
      playableQuizQuestions(questions, { shuffleItems: rules.shuffleItems, shuffleOptions: rules.shuffleOptions }),
    )
    const size = cardSize(answers.length)
    return { asked, size, cards: size ? makeCards(answers, rules.teams, size) : [] }
  }
  const [round, setRound] = useState(() => ({ ...deal(), number: 0 }))
  const [state, dispatch] = useReducer(bingoReducer, round.cards, initialBingo)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (!round.size || round.asked.length === 0) {
    return <NothingToPlay message="Bingo cần ít nhất 4 câu trắc nghiệm có đáp án đúng khác nhau." backTo={backTo} />
  }
  if (state.finished) {
    return (
      <TeamResults
        teams={state.teams}
        onPlayAgain={() => {
          const next = { ...deal(), number: round.number + 1 }
          setRound(next)
          dispatch({ type: 'restart', cards: next.cards })
        }}
        mostCorrectLabel="Đánh dấu nhiều ô nhất"
      />
    )
  }

  const question = round.asked[state.index]
  const isLast = state.index === round.asked.length - 1
  const right = question.options.find((o) => o.id === question.correctId)!
  const winners = state.teams.filter((t) => state.bingo.includes(t.id))

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.index + 1} / ${round.asked.length}`}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round.number}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <div className="flex min-h-[86px] items-center justify-between gap-5 rounded-[28px] bg-white px-7 py-3">
        <span className="font-display leading-[1.1] font-extrabold" style={{ fontSize: questionFontSize(question.text, 40) }}>
          {question.text}
        </span>
        {state.revealed && (
          <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="shrink-0 rounded-2xl bg-[#E3F6EC] px-5 py-2 font-display text-[30px] font-extrabold text-success">
            {right.text}
          </motion.span>
        )}
      </div>

      <div className="grid flex-1 gap-4" style={{ gridTemplateColumns: `repeat(${state.teams.length}, minmax(0, 1fr))` }}>
        {state.teams.map((team, t) => {
          const card = state.cards[t]
          const claim = state.claims[team.id]
          const bingo = state.bingo.includes(team.id)
          return (
            <section
              key={team.id}
              aria-label={`Thẻ của ${team.name}`}
              className="flex flex-col gap-2.5 rounded-[24px] border-4 bg-white p-3"
              style={{ borderColor: bingo ? '#F2B705' : team.color }}
            >
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full" style={{ background: team.color }} />
                <span className="flex-1 truncate text-lg font-extrabold">{team.name}</span>
                <span className="font-display text-[28px] font-extrabold">{team.score}</span>
              </div>
              <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${round.size}, minmax(0, 1fr))` }}>
                {card.map((answer, c) => {
                  const marked = state.marked[t][c]
                  const claimed = claim === c
                  const wrongClaim = state.revealed && claimed && !marked
                  const missed = state.revealed && !claimed && c === cellOf(card, question)
                  return (
                    <motion.button
                      key={`${round.number}-${c}`}
                      type="button"
                      disabled={state.revealed || marked}
                      onClick={() => {
                        sound.play('pop')
                        dispatch({ type: 'claim', teamId: team.id, cell: c })
                      }}
                      animate={wrongClaim ? { x: [0, -6, 6, -4, 4, 0] } : marked && state.revealed && claimed ? { scale: [1, 1.1, 1] } : {}}
                      aria-pressed={claimed}
                      aria-label={`${team.name}: ${answer}${marked ? ', đã đánh dấu' : ''}`}
                      className={`relative flex min-h-[64px] cursor-pointer items-center justify-center rounded-2xl border-[3px] px-1.5 text-center font-display font-extrabold disabled:cursor-default ${
                        answer.length > 14 ? 'text-[16px]' : 'text-[22px]'
                      } ${
                        marked
                          ? 'border-transparent text-white'
                          : wrongClaim
                            ? 'border-danger bg-[#FBE6E1] text-ink'
                            : claimed
                              ? 'border-primary bg-primary-soft text-primary-ink'
                              : missed
                                ? 'border-dashed border-success bg-white text-ink'
                                : 'border-line bg-surface-soft text-ink'
                      }`}
                      style={marked ? { background: team.color } : undefined}
                    >
                      {answer}
                      {marked && <span className="absolute top-0.5 right-1.5 text-[14px]">★</span>}
                    </motion.button>
                  )
                })}
              </div>
              {bingo && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6 }} className="text-center font-display text-[32px] font-extrabold text-[#C98A00]">
                  BINGO! 🎉
                </motion.span>
              )}
            </section>
          )
        })}
      </div>

      <PlayFooter
        message={
          state.revealed
            ? winners.length
              ? `${winners.map((w) => w.name).join(' và ')} Bingo!`
              : 'Các đội tìm đúng đã được đánh dấu.'
            : 'Đội nào thấy đáp án trên thẻ thì giơ tay, cô bấm ô đội chỉ.'
        }
        revealed={state.revealed}
        onFinish={() => dispatch({ type: 'finish' })}
        onNext={() => {
          if (!state.revealed) {
            sound.play('reveal')
            dispatch({ type: 'reveal', question, points: rules.points })
            return
          }
          if (winners.length) sound.play('fanfare')
          dispatch({ type: 'next', total: round.asked.length })
        }}
        nextDisabled={false}
        nextLabel={!state.revealed ? 'Công bố đáp án' : winners.length || isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
      />
    </PlayFrame>
  )
}
