import i18n from 'i18next'
import { motion } from 'motion/react'
import { useReducer, useState } from 'react'
import { CheckIcon, CloseIcon } from '@/components/ui/icons'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { playableQuizQuestions, questionFontSize } from '@/game-engine/quiz/quizRound'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { initialTrueFalse, statementsOf, trueFalseReducer } from '@/game-engine/true-false/trueFalseRound'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { assetSrc } from '@/utils/images'
import { useSound } from '@/sound/useSound'

interface TrueFalseScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Đúng hay sai": each question comes with one answer, right or not. Every team says "Đúng" or "Sai"
 * (the teacher taps it on the team's card), then the answer is shown and every team that judged right scores.
 */
export function TrueFalseScreen({ game, questions, settings }: TrueFalseScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.TRUE_FALSE)
  const deal = () =>
    statementsOf(playableQuizQuestions(questions, { shuffleItems: rules.shuffleItems, shuffleOptions: rules.shuffleOptions }))
  const [statements, setStatements] = useState(deal)
  const [round, setRound] = useState(0)
  const [state, dispatch] = useReducer(trueFalseReducer, rules.teams, initialTrueFalse)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (statements.length === 0) {
    return <NothingToPlay message={i18n.t('play.nothing.quiz')} backTo={backTo} />
  }
  const restart = () => {
    dispatch({ type: 'restart', teamCount: rules.teams })
    setStatements(deal())
    setRound((r) => r + 1)
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="trueFalse" />

  const statement = statements[state.index]
  const isLast = state.index === statements.length - 1
  const votes = Object.keys(state.votes).length

  return (
    <PlayFrame
      title={game.title}
      progress={i18n.t('play.common.question', { number: state.index + 1, total: statements.length })}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 rounded-[28px] bg-white px-10 py-6 text-center">
        {statement.imageUrl && <img src={assetSrc(statement.imageUrl)} alt="" className="h-[110px] rounded-2xl object-cover" />}
        <span className="font-display leading-[1.1] font-extrabold" style={{ fontSize: questionFontSize(statement.question, 46) }}>
          {statement.question}
        </span>
        {statement.answer !== null && (
          <span className="rounded-[20px] bg-primary-soft px-7 py-2.5 font-display text-[36px] font-extrabold text-primary-ink">
            → {statement.answer}
          </span>
        )}
        {state.revealed && (
          <motion.div
            initial={{ scale: 2, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: -8, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.45 }}
            className={`absolute top-5 right-7 rounded-2xl border-[5px] px-5 py-1 font-display text-[44px] font-extrabold ${
              statement.truth ? 'border-success text-success' : 'border-danger text-danger'
            }`}
          >
            {statement.truth ? i18n.t('play.trueFalse.true') : i18n.t('play.trueFalse.false')}
          </motion.div>
        )}
        {state.revealed && !statement.truth && statement.answer !== null && (
          <span className="text-[24px] font-extrabold text-success">{i18n.t('play.common.rightAnswer', { answer: statement.rightAnswer })}</span>
        )}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${state.teams.length}, minmax(0, 1fr))` }}>
        {state.teams.map((team) => {
          const vote = state.votes[team.id]
          const scored = state.revealed && vote === statement.truth
          return (
            <div
              key={team.id}
              className="flex flex-col gap-2 rounded-[22px] border-4 bg-white px-3 py-2.5"
              style={{ borderColor: scored ? '#2E9E6A' : '#FFFFFF' }}
            >
              <div className="flex items-center gap-2">
                <span className="size-6 shrink-0 rounded-full" style={{ background: team.color }} />
                <span className="min-w-0 flex-1 truncate text-lg font-extrabold">{team.name}</span>
                <motion.span key={team.score} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="font-display text-[30px] font-extrabold">
                  {team.score}
                </motion.span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([true, false] as const).map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    disabled={state.revealed}
                    aria-pressed={vote === value}
                    aria-label={`${team.name}: ${value ? i18n.t('play.common.right') : i18n.t('play.common.wrong')}`}
                    onClick={() => {
                      sound.play('pop')
                      dispatch({ type: 'vote', teamId: team.id, value })
                    }}
                    className={`flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-[3px] font-[inherit] text-lg font-extrabold disabled:cursor-default ${
                      vote === value
                        ? value
                          ? 'border-success bg-success text-white'
                          : 'border-danger bg-danger text-white'
                        : 'border-line bg-white text-ink'
                    } ${state.revealed && vote !== value ? 'opacity-40' : ''}`}
                  >
                    {value ? <CheckIcon size={20} /> : <CloseIcon size={18} />}
                    {value ? i18n.t('play.common.right') : i18n.t('play.common.wrong')}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <PlayFooter
        message={
          state.revealed
            ? statement.truth
              ? i18n.t('play.trueFalse.isTrue')
              : i18n.t('play.trueFalse.isFalse')
            : i18n.t('play.trueFalse.votes', { votes, teams: state.teams.length })
        }
        revealed={state.revealed}
        onFinish={() => dispatch({ type: 'finish' })}
        onNext={() => {
          if (!state.revealed) {
            const anyRight = state.teams.some((t) => state.votes[t.id] === statement.truth)
            sound.play(anyRight ? 'correct' : 'wrong')
            dispatch({ type: 'reveal', truth: statement.truth, points: rules.points })
            return
          }
          sound.play('whoosh')
          dispatch({ type: 'next', total: statements.length })
        }}
        nextDisabled={false}
        nextLabel={!state.revealed ? i18n.t('play.trueFalse.reveal') : isLast ? i18n.t('play.common.seeResults') : i18n.t('play.common.nextQuestion')}
      />
    </PlayFrame>
  )
}
