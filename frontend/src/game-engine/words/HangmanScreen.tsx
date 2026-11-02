import i18n from 'i18next'
import { motion } from 'motion/react'
import { useReducer, useState } from 'react'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { baseLetter, hangmanReducer, hangmanTurn, initialHangman, KEYBOARD, wordQuestions } from '@/game-engine/words/words'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, Question } from '@/types/game'
import { assetSrc } from '@/utils/images'
import { useSound } from '@/sound/useSound'

interface HangmanScreenProps {
  game: GameSummary
  questions: Question[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Đoán chữ": a clue and its answer as empty boxes. The teams take turns guessing a letter (the teacher
 * taps it): a letter in the word opens all its boxes and the team guesses again; else the turn passes. On its turn,
 * a team may solve the whole word for a bonus.
 */
export function HangmanScreen({ game, questions, settings }: HangmanScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.HANGMAN)
  const deal = () => wordQuestions(questions, { shuffleItems: rules.shuffleItems })
  const [words, setWords] = useState(deal)
  const [state, dispatch] = useReducer(hangmanReducer, rules.teams, initialHangman)
  /** A team said the whole word: the teacher judges it. */
  const [solving, setSolving] = useState(false)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (words.length === 0) {
    return <NothingToPlay message={i18n.t('play.nothing.words')} backTo={backTo} />
  }
  const restart = () => {
    dispatch({ type: 'restart', teamCount: rules.teams })
    setWords(deal())
    setSolving(false)
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="letters" streakUnit="time" />

  const question = words[state.index]
  const team = hangmanTurn(state)
  const isLast = state.index === words.length - 1
  const inWord = new Set(question.words.flat().map(baseLetter))
  const solver = state.teams.find((t) => t.id === state.solvedBy)
  let k = 0

  const judge = (right: boolean) => {
    sound.play(right ? 'fanfare' : 'wrong')
    dispatch({ type: 'solve', right, question, points: rules.points, bonus: rules.keywordPoints })
    setSolving(false)
  }

  return (
    <PlayFrame title={game.title} progress={i18n.t('play.words.word', { number: state.index + 1, total: words.length })} backTo={backTo}>
      <div className="flex min-h-[80px] items-center gap-5 rounded-[28px] bg-white px-7 py-3">
        {question.imageUrl && <img src={assetSrc(question.imageUrl)} alt="" className="h-[70px] w-[96px] shrink-0 rounded-2xl object-cover" />}
        <span className="text-lg font-extrabold text-primary-ink">{i18n.t('play.common.clue')}</span>
        <span className="font-display text-[32px] leading-tight font-extrabold">{question.clue}</span>
      </div>

      <div
        className="flex min-h-[120px] flex-wrap content-center items-center justify-center gap-x-8 gap-y-3 rounded-[28px] bg-[linear-gradient(160deg,#2B3A86,#1A2360)] px-6 py-4"
        role="group"
        aria-label={i18n.t('play.words.board')}
      >
        {question.words.map((word, w) => (
          <div key={w} className="flex gap-2">
            {word.map((letter) => {
              const at = k++
              const open = state.revealed || state.guessed.includes(baseLetter(letter))
              return (
                <motion.span
                  key={`${state.index}-${at}`}
                  animate={open ? { rotateY: [90, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  aria-label={open ? i18n.t('play.words.open', { number: at + 1, letter }) : i18n.t('play.words.closed', { number: at + 1 })}
                  className={`flex h-[74px] w-[60px] items-center justify-center rounded-2xl font-display text-[42px] font-extrabold ${
                    open ? (state.revealed && !state.solvedBy ? 'bg-[#FFD15C] text-ink' : 'bg-white text-ink') : 'bg-[#3E51B5]'
                  }`}
                >
                  {open && letter}
                </motion.span>
              )
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(17,minmax(0,1fr))] gap-1.5" role="group" aria-label={i18n.t('play.words.alphabet')}>
        {KEYBOARD.map((letter) => {
          const guessed = state.guessed.includes(letter)
          const hit = guessed && inWord.has(letter)
          return (
            <button
              key={letter}
              type="button"
              disabled={guessed || state.revealed || solving}
              onClick={() => {
                const count = question.words.flat().filter((ch) => baseLetter(ch) === letter).length
                sound.play(count ? 'correct' : 'wrong')
                dispatch({ type: 'guess', letter, question, points: rules.points, bonus: rules.keywordPoints })
              }}
              aria-label={i18n.t('play.words.letter', { letter })}
              className={`flex h-[50px] cursor-pointer items-center justify-center rounded-xl border-0 font-display text-[24px] font-extrabold disabled:cursor-default ${
                hit ? 'bg-success text-white' : guessed ? 'bg-danger/80 text-white opacity-60' : 'bg-white text-ink shadow-[inset_0_-4px_0_#D5DEEE] disabled:opacity-40'
              }`}
            >
              {letter}
            </button>
          )
        })}
      </div>

      <TeamBar teams={state.teams} activeId={state.revealed ? state.solvedBy : team.id} activeLabel={state.revealed ? i18n.t('play.words.solvedBy') : i18n.t('play.common.yourTurn')} />

      {solving ? (
        <div className="mt-auto flex items-center justify-between gap-4">
          <span className="pl-[76px] text-xl font-extrabold">{i18n.t('play.words.solving', { team: team.name })}</span>
          <div className="flex gap-3">
            <button type="button" onClick={() => setSolving(false)} className={`${playButtonClass} bg-white text-ink`}>
              {i18n.t('play.common.cancel')}
            </button>
            <button type="button" onClick={() => judge(false)} className={`${playButtonClass} bg-danger text-white`}>
              Sai
            </button>
            <button type="button" onClick={() => judge(true)} className={`${playButtonClass} bg-success text-white`}>
              {i18n.t('play.common.right')}
            </button>
          </div>
        </div>
      ) : (
        <PlayFooter
          message={
            state.revealed
              ? solver
                ? i18n.t('play.words.solved', { team: solver.name, answer: question.answer })
                : i18n.t('play.common.answer', { answer: question.answer })
              : state.last
                ? state.last.count
                  ? i18n.t('play.words.found', { count: state.last.count, letter: state.last.letter, team: team.name })
                  : i18n.t('play.words.notFound', { letter: state.last.letter, team: team.name })
                : i18n.t('play.words.guess', { team: team.name })
          }
          revealed={state.revealed}
          onReveal={() => dispatch({ type: 'reveal' })}
          onFinish={() => dispatch({ type: 'finish' })}
          onNext={() => dispatch({ type: 'next', total: words.length })}
          nextLabel={isLast ? i18n.t('play.common.seeResults') : i18n.t('play.words.nextWord')}
          extra={
            !state.revealed && (
              <button type="button" onClick={() => setSolving(true)} className={`${playButtonClass} bg-sun text-ink`}>
                {i18n.t('play.words.solve')}
              </button>
            )
          }
        />
      )}
    </PlayFrame>
  )
}
