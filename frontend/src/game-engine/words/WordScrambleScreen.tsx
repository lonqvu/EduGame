import i18n from 'i18next'
import { motion } from 'motion/react'
import { useMemo, useReducer, useState } from 'react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { initialScramble, scrambled, scrambleReducer, wordQuestions } from '@/game-engine/words/words'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, Question } from '@/types/game'
import { assetSrc } from '@/utils/images'
import { useSound } from '@/sound/useSound'

interface WordScrambleScreenProps {
  game: GameSummary
  questions: Question[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Vua Tiếng Việt": a clue and the letters of its answer, shuffled. A team wins the buzzer and reads
 * the letters in order; the teacher taps them into the slots. A full word is judged at once.
 */
export function WordScrambleScreen({ game, questions, settings }: WordScrambleScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.WORD_SCRAMBLE)
  const deal = () => wordQuestions(questions, { shuffleItems: rules.shuffleItems })
  const [words, setWords] = useState(deal)
  const [round, setRound] = useState(0)
  const [state, dispatch] = useReducer(scrambleReducer, rules.teams, initialScramble)
  const sound = useSound()
  const backTo = editPath(game.id)
  const question = words[state.index]
  // Shuffled once per question ("Chơi lại" deals new questions, shuffled again).
  const tiles = useMemo(() => (question ? scrambled(question) : []), [question])

  if (words.length === 0) {
    return <NothingToPlay message={i18n.t('play.nothing.words')} backTo={backTo} />
  }
  const restart = () => {
    dispatch({ type: 'restart', teamCount: rules.teams })
    setWords(deal())
    setRound((r) => r + 1)
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="words" streakUnit="word" />

  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const isLast = state.index === words.length - 1
  const placedLetters = state.placed.map((i) => tiles[i])
  const solved = state.revealed && placedLetters.join('') === question.words.flat().join('')
  let k = 0

  return (
    <PlayFrame
      title={game.title}
      progress={i18n.t('play.common.question', { number: state.index + 1, total: words.length })}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <div className="flex min-h-[84px] items-center gap-5 rounded-[28px] bg-white px-7 py-3">
        {question.imageUrl && <img src={assetSrc(question.imageUrl)} alt="" className="h-[72px] w-[100px] shrink-0 rounded-2xl object-cover" />}
        <span className="text-lg font-extrabold text-primary-ink">{i18n.t('play.common.clue')}</span>
        <span className="font-display text-[34px] leading-tight font-extrabold">{question.clue}</span>
        <span className="ml-auto shrink-0 rounded-full bg-sun-soft px-4 py-1 text-lg font-extrabold">{i18n.t('play.common.points', { count: question.points })}</span>
      </div>

      <motion.div
        key={`${state.index}-${state.triedTeams.length}`}
        animate={state.wrong ? { x: [0, -14, 14, -8, 8, 0] } : {}}
        transition={{ duration: 0.45 }}
        className="flex flex-1 flex-wrap content-center items-center justify-center gap-x-8 gap-y-3 rounded-[28px] bg-[linear-gradient(160deg,#2B3A86,#1A2360)] px-6 py-4"
        role="group"
        aria-label={i18n.t('play.words.answerLabel')}
      >
        {question.words.map((word, w) => (
          <div key={w} className="flex gap-2">
            {word.map((letter) => {
              const at = k++
              const shown = state.revealed ? letter : placedLetters[at]
              return (
                <span
                  key={at}
                  aria-label={shown ? i18n.t('play.words.open', { number: at + 1, letter: shown }) : i18n.t('play.words.empty', { number: at + 1 })}
                  className={`flex h-[78px] w-[64px] items-center justify-center rounded-2xl border-4 font-display text-[44px] font-extrabold ${
                    state.revealed
                      ? solved
                        ? 'border-[#7CF0A8] bg-[#1E9E5A] text-white'
                        : 'border-[#FFD15C] bg-[#FFD15C] text-ink'
                      : shown
                        ? at < state.hints
                          ? 'border-[#FFD15C] bg-white text-ink'
                          : 'border-white bg-white text-ink'
                        : 'border-white/40 bg-white/10 text-white'
                  }`}
                >
                  {shown}
                </span>
              )
            })}
          </div>
        ))}
      </motion.div>

      <div className="flex items-center justify-center gap-2.5" role="group" aria-label={i18n.t('play.words.letters')}>
        {tiles.map((letter, i) => (
          <button
            key={`${state.index}-${i}`}
            type="button"
            disabled={!answering || state.revealed || state.placed.includes(i)}
            onClick={() => {
              sound.play('pop')
              dispatch({ type: 'place', tile: i, tiles, question, allowSteal: rules.allowSteal })
              if (state.placed.length + 1 === question.words.flat().length) {
                const right = [...placedLetters, letter].join('') === question.words.flat().join('')
                sound.play(right ? 'correct' : 'wrong')
              }
            }}
            aria-label={i18n.t('play.words.letter', { letter })}
            className={`flex size-[60px] cursor-pointer items-center justify-center rounded-2xl border-0 bg-white font-display text-[34px] font-extrabold text-ink shadow-[inset_0_-5px_0_#D5DEEE] disabled:cursor-default ${
              state.placed.includes(i) ? 'opacity-25' : ''
            }`}
          >
            {letter}
          </button>
        ))}
        <button type="button" onClick={() => dispatch({ type: 'undo' })} disabled={state.revealed || state.placed.length <= state.hints} className={`${playButtonClass} ml-4 bg-white text-ink`}>
          {i18n.t('play.words.deleteLetter')}
        </button>
        <button type="button" onClick={() => dispatch({ type: 'hint', tiles, question })} disabled={state.revealed} className={`${playButtonClass} bg-sun-soft text-ink`}>
          {i18n.t('play.words.hint')}
        </button>
      </div>

      <TeamBar
        teams={state.teams}
        activeId={state.answeringTeamId}
        activeLabel={i18n.t('play.common.answering')}
        disabledIds={state.revealed ? state.teams.map((t) => t.id) : state.triedTeams}
        onPick={(teamId) => dispatch({ type: 'pickTeam', teamId })}
      />
      <PlayFooter
        message={
          state.revealed
            ? solved
              ? i18n.t('play.words.exact')
              : i18n.t('play.common.answer', { answer: question.answer })
            : state.wrong
              ? i18n.t('play.words.stealNow')
              : answering
                ? i18n.t('play.words.read', { team: answering.name })
                : i18n.t('play.common.whoBuzzed')
        }
        revealed={state.revealed}
        onReveal={() => dispatch({ type: 'reveal' })}
        onFinish={() => dispatch({ type: 'finish' })}
        onNext={() => dispatch({ type: 'next', total: words.length })}
        nextLabel={isLast ? i18n.t('play.common.seeResults') : i18n.t('play.common.nextQuestion')}
      />
    </PlayFrame>
  )
}
