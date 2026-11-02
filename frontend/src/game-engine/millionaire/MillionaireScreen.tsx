import i18n from 'i18next'
import { motion } from 'motion/react'
import { useEffect, useReducer, useState } from 'react'
import { Link } from 'react-router'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { playableQuizQuestions, questionFontSize, type PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import {
  fiftyFifty,
  formatPrize,
  initialMillionaire,
  ladderFor,
  MAX_LEVELS,
  milestonesFor,
  millionaireReducer,
  type MillionaireEnd,
} from '@/game-engine/millionaire/millionaire'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { GameBackButton, NothingToPlay, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { useFinishPlaySession } from '@/game-engine/shared/usePlaySession'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { assetSrc } from '@/utils/images'
import { useSound } from '@/sound/useSound'
import { SoundToggle } from '@/sound/SoundToggle'

const LETTERS = 'ABCDEF'
/** Pause between "Chốt đáp án" and the answer shown right or wrong, as on the show. */
const SUSPENSE_MS = 1600
/** Time the player has to ask a friend. */
const FRIEND_SECONDS = 30

interface MillionaireScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Ai là triệu phú": one player climbs the prize ladder, one question a rung. The player picks an
 * answer and locks it; right climbs on, wrong ends the climb at the last safe rung. Three lifelines, once each:
 * 50:50, the class's hands (the teacher counts them on the options) and a friend for 30 seconds.
 */
export function MillionaireScreen({ game, questions, settings }: MillionaireScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.MILLIONAIRE)
  const deal = () =>
    playableQuizQuestions(questions, { shuffleItems: rules.shuffleItems, shuffleOptions: rules.shuffleOptions }).slice(0, MAX_LEVELS)
  const [playable, setPlayable] = useState(deal)
  const [round, setRound] = useState(0)
  const [state, dispatch] = useReducer(millionaireReducer, undefined, initialMillionaire)
  /** The locked answer is shown right or wrong (after the suspense). */
  const [shown, setShown] = useState(false)
  const [friendKey, setFriendKey] = useState<number | null>(null)
  const sound = useSound()
  const backTo = editPath(game.id)
  const levels = playable.length
  const question = playable[state.level] as PlayableQuizQuestion | undefined

  useEffect(() => {
    if (!state.locked || !question) return
    const timer = setTimeout(() => {
      setShown(true)
      sound.play(state.selected === question.correctId ? 'correct' : 'wrong')
    }, SUSPENSE_MS)
    return () => clearTimeout(timer)
  }, [state.locked, state.selected, question, sound])

  if (!question) {
    return <NothingToPlay message={i18n.t('play.nothing.quiz')} backTo={backTo} />
  }

  const restart = () => {
    dispatch({ type: 'restart' })
    setPlayable(deal())
    setShown(false)
    setFriendKey(null)
    setRound((r) => r + 1)
  }

  if (state.end) {
    return <MillionaireResult end={state.end} question={question} backTo={backTo} onPlayAgain={restart} />
  }

  const prizes = ladderFor(levels)
  const milestones = milestonesFor(levels)
  const right = shown && state.selected === question.correctId
  const isLast = state.level + 1 >= levels

  return (
    <div className="flex h-full gap-5 bg-[radial-gradient(circle_at_30%_20%,#22307A,#0B1240_70%)] px-8 py-6 text-white">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <GameBackButton backTo={backTo} className="bg-white/15 text-white hover:bg-white/25 hover:text-white" />
            <SoundToggle className="bg-white/15 text-white hover:bg-white/25" />
            <h1 className="m-0 truncate font-display text-[24px] font-extrabold">{game.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {friendKey !== null && !state.locked && (
              <span className="flex items-center gap-2 rounded-full bg-white/15 py-1 pl-3 text-lg font-extrabold">
                {i18n.t('play.millionaire.askFriend')}
                <Countdown key={friendKey} seconds={FRIEND_SECONDS} paused={state.locked} />
              </span>
            )}
            {rules.timeLimitSec > 0 && !state.locked && (
              <Countdown key={`${round}-${state.level}`} seconds={rules.timeLimitSec} paused={state.locked} />
            )}
          </div>
        </div>

        <div className="flex gap-3" role="group" aria-label={i18n.t('play.millionaire.lifelines')}>
          <Lifeline
            label="50:50"
            title={i18n.t('play.millionaire.fiftyFifty')}
            used={state.used.fifty || fiftyFifty(question).length === 0}
            disabled={state.locked}
            onUse={() => {
              sound.play('whoosh')
              dispatch({ type: 'fifty', hide: fiftyFifty(question) })
            }}
          />
          <Lifeline
            label="👥"
            title={i18n.t('play.millionaire.askClass')}
            used={state.used.poll}
            disabled={state.locked}
            onUse={() => {
              sound.play('pop')
              dispatch({ type: 'poll' })
            }}
          />
          <Lifeline
            label="📞"
            title={i18n.t('play.millionaire.phone')}
            used={state.used.friend}
            disabled={state.locked}
            onUse={() => {
              sound.play('pop')
              dispatch({ type: 'friend' })
              setFriendKey(Date.now())
            }}
          />
        </div>

        <div className="relative flex min-h-[180px] items-center justify-center gap-5 rounded-[30px] border-[3px] border-[#C9A13B] bg-[linear-gradient(#1C2B78,#101A55)] px-8 py-4 text-center shadow-[0_0_30px_rgba(201,161,59,0.25)]">
          {question.imageUrl && <img src={assetSrc(question.imageUrl)} alt="" className="h-[110px] w-[150px] shrink-0 rounded-2xl object-cover" />}
          <span className="font-display leading-[1.15] font-extrabold" style={{ fontSize: questionFontSize(question.text, 40) }}>
            {question.text}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {question.options.map((option, i) => {
            const hidden = state.hidden.includes(option.id)
            const selected = state.selected === option.id
            const isRight = option.id === question.correctId
            const look = shown && isRight ? 'right' : shown && selected ? 'wrong' : selected ? (state.locked ? 'locked' : 'selected') : 'idle'
            const votes = state.poll?.[option.id] ?? 0
            const totalVotes = Object.values(state.poll ?? {}).reduce((a, b) => a + b, 0)
            return (
              <motion.button
                key={option.id}
                type="button"
                disabled={hidden || state.locked}
                onClick={() => {
                  sound.play('pop')
                  dispatch({ type: 'select', optionId: option.id })
                }}
                animate={look === 'locked' ? { opacity: [1, 0.6, 1] } : look === 'right' ? { scale: [1, 1.05, 1] } : {}}
                transition={look === 'locked' ? { repeat: Infinity, duration: 0.8 } : { duration: 0.5 }}
                aria-label={`${LETTERS[i]}. ${option.text}`}
                className={`relative flex min-h-[88px] cursor-pointer items-center gap-3 overflow-hidden rounded-full border-[3px] px-6 text-left font-[inherit] disabled:cursor-default ${
                  hidden ? 'invisible' : ''
                } ${
                  look === 'right'
                    ? 'border-[#7CF0A8] bg-[#1E9E5A] text-white'
                    : look === 'wrong'
                      ? 'border-[#FFB4A8] bg-[#C0392B] text-white'
                      : look === 'locked' || look === 'selected'
                        ? 'border-[#FFE29A] bg-[#F28C28] text-white'
                        : 'border-[#C9A13B] bg-[#14215E] text-white hover:bg-[#1C2B78]'
                }`}
              >
                {state.poll && totalVotes > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-white/15"
                    style={{ width: `${Math.round((votes / totalVotes) * 100)}%` }}
                  />
                )}
                <span className="relative font-display text-[26px] font-extrabold text-[#FFD15C]">{LETTERS[i]}:</span>
                <span className={`relative font-display font-extrabold ${option.text.length > 30 ? 'text-[21px]' : 'text-[27px]'}`}>
                  {option.text}
                </span>
                {state.poll && (
                  <span className="relative ml-auto rounded-full bg-white/20 px-3 py-0.5 text-lg font-extrabold">{votes} ✋</span>
                )}
              </motion.button>
            )
          })}
        </div>

        {state.poll && !state.locked && (
          <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2" role="group" aria-label={i18n.t('play.millionaire.count')}>
            <span className="text-lg font-extrabold">{i18n.t('play.millionaire.hands')}</span>
            {question.options.map((option, i) =>
              state.hidden.includes(option.id) ? null : (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    sound.play('pop')
                    dispatch({ type: 'vote', optionId: option.id })
                  }}
                  aria-label={i18n.t('play.millionaire.addHand', { letter: LETTERS[i] })}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-full border-2 border-[#C9A13B] bg-[#14215E] px-4 font-[inherit] text-lg font-extrabold text-white hover:bg-[#1C2B78]"
                >
                  <span className="text-[#FFD15C]">{LETTERS[i]}</span>+1
                </button>
              ),
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-4">
          <span className="pl-[76px] text-lg font-extrabold text-white/80">
            {shown
              ? right
                ? isLast
                  ? i18n.t('play.millionaire.top')
                  : i18n.t('play.millionaire.reached', { prize: formatPrize(prizes[state.level]) })
                : i18n.t('play.millionaire.wrong')
              : state.locked
                ? i18n.t('play.millionaire.finalAnswer')
                : state.poll && !state.selected
                  ? i18n.t('play.millionaire.voting')
                  : state.selected
                    ? i18n.t('play.millionaire.sure')
                    : i18n.t('play.millionaire.choose')}
          </span>
          <div className="flex shrink-0 gap-3">
            {!state.locked && (
              <button type="button" onClick={() => dispatch({ type: 'stop', levels })} className={`${playButtonClass} bg-white/15 text-white`}>
                {i18n.t('play.millionaire.stop')}
              </button>
            )}
            {shown ? (
              <button
                type="button"
                onClick={() => {
                  if (right && !isLast) sound.play('whoosh')
                  dispatch({ type: 'next', question, levels })
                  setShown(false)
                  setFriendKey(null)
                }}
                className={`${playButtonClass} bg-[#FFD15C] text-ink`}
              >
                {right && !isLast ? i18n.t('play.common.nextQuestion') : i18n.t('play.common.seeResults')}
              </button>
            ) : (
              <button
                type="button"
                disabled={!state.selected || state.locked}
                onClick={() => {
                  sound.play('reveal')
                  dispatch({ type: 'lock' })
                }}
                className={`${playButtonClass} bg-[#FFD15C] text-ink`}
              >
                {i18n.t('play.millionaire.lockIn')}
              </button>
            )}
          </div>
        </div>
      </div>

      <ol aria-label={i18n.t('play.millionaire.ladder')} className="m-0 flex w-[290px] shrink-0 list-none flex-col-reverse justify-center gap-1 rounded-[26px] bg-black/25 p-3">
        {prizes.map((prize, i) => {
          const current = i === state.level
          const passed = i < state.level
          const safe = milestones.includes(i + 1)
          return (
            <li
              key={prize}
              aria-current={current ? 'step' : undefined}
              className={`flex items-center justify-between rounded-full px-4 py-[3px] text-[17px] font-extrabold tabular-nums ${
                current ? 'bg-[#F28C28] text-white' : passed ? 'text-[#7CF0A8]' : safe ? 'text-white' : 'text-[#FFD15C]'
              }`}
            >
              <span className="w-7 opacity-80">{i + 1}</span>
              <span className="flex items-center gap-1.5">
                {safe && <span aria-label={i18n.t('play.millionaire.safe')}>◆</span>}
                {formatPrize(prize)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Lifeline({ label, title, used, disabled, onUse }: { label: string; title: string; used: boolean; disabled: boolean; onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      disabled={used || disabled}
      title={title}
      aria-label={used ? i18n.t('play.millionaire.used', { title }) : title}
      className={`relative flex h-[50px] w-[92px] cursor-pointer items-center justify-center rounded-full border-[3px] border-[#C9A13B] bg-[#14215E] font-[inherit] text-[22px] font-extrabold text-white hover:bg-[#1C2B78] disabled:cursor-default ${
        used ? 'opacity-35' : ''
      }`}
    >
      {label}
      {used && <span className="absolute inset-x-3 top-1/2 h-[3px] -rotate-12 rounded bg-[#E5484D]" aria-hidden="true" />}
    </button>
  )
}

interface MillionaireResultProps {
  end: MillionaireEnd
  question: PlayableQuizQuestion
  backTo: string
  onPlayAgain: () => void
}

/** The end of the climb: what the player takes home, and the right answer when the last one was wrong. */
function MillionaireResult({ end, question, backTo, onPlayAgain }: MillionaireResultProps) {
  const sound = useSound()
  const playAgain = useFinishPlaySession(() => {
    sound.play('start')
    onPlayAgain()
  }, { players: 1 })
  useEffect(() => {
    sound.stopMusic()
    sound.play(end.reason === 'wrong' ? 'applause' : 'fanfare')
  }, [end.reason, sound])
  const right = question.options.find((o) => o.id === question.correctId)
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-[radial-gradient(circle_at_50%_30%,#22307A,#0B1240_70%)] px-12 text-center text-white">
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.55 }} className="text-[96px] leading-none">
        {end.reason === 'won' ? '🏆' : end.reason === 'stopped' ? '🎉' : '💪'}
      </motion.span>
      <h1 className="m-0 font-display text-[54px] leading-tight font-extrabold">
        {end.reason === 'won'
          ? i18n.t('play.millionaire.millionaire')
          : end.reason === 'stopped'
            ? i18n.t('play.millionaire.wise')
            : i18n.t('play.millionaire.sorry')}
      </h1>
      {end.reason === 'wrong' && right && <span className="text-[26px] font-extrabold text-[#7CF0A8]">{i18n.t('play.common.rightAnswer', { answer: right.text })}</span>}
      <span className="rounded-full border-[3px] border-[#C9A13B] bg-[#14215E] px-10 py-3 font-display text-[44px] font-extrabold text-[#FFD15C]">
        {i18n.t('play.millionaire.prize', { prize: formatPrize(end.prize) })}
      </span>
      <div className="mt-2 flex gap-4">
        <Link to={backTo} className={`${playButtonClass} bg-white/15 text-white hover:text-white`}>
          {i18n.t('play.millionaire.toEditor')}
        </Link>
        <button type="button" onClick={playAgain} className={`${playButtonClass} bg-[#FFD15C] text-ink`}>
          {i18n.t('play.millionaire.again')}
        </button>
      </div>
    </div>
  )
}
