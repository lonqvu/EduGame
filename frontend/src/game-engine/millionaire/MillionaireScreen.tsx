import i18n from 'i18next'
import { motion } from 'motion/react'
import { useEffect, useReducer, useState, type ReactNode } from 'react'
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
import { StageBackdrop } from '@/game-engine/shared/StageBackdrop'
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

/** The game's art: a sunny meadow, wooden boards, yellow answer bars (A–D have their letter drawn in). */
const ART = '/assets/games/millionaire'
const ANSWER_ART = ['a', 'b', 'c', 'd'].map((l) => `${ART}/answer-${l}.webp`)
/** Brown ink of the boards and bars. */
const INK = '#5A3417'
/** Sky over a meadow; the scenery sits on the grass. */
const SKY = 'bg-[linear-gradient(#7FD0FA_0%,#C4EDFF_56%,#B5E58A_66%,#7CC94A_82%,#5DAE34_100%)]'
/** The yellow buttons of the art ("Chốt đáp án"), drawn in CSS so their words can change. */
const yellowButton = `${playButtonClass} border-[3px] border-[#D98A12] bg-[linear-gradient(#FFE877,#FFB81F)] text-[#6B3A1A] shadow-[0_4px_0_#B8701A] hover:brightness-105`
const woodButton = `${playButtonClass} border-[3px] border-[#6B3A1A] bg-[linear-gradient(#C27B3F,#9A5A2A)] text-[#FFF3D6] shadow-[0_4px_0_#5C3216] hover:brightness-110`

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
    <div className="relative isolate flex h-full gap-5 px-7 py-5" style={{ color: INK }}>
      <Backdrop />
      <Scenery />

      <div className="relative flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <GameBackButton
              backTo={backTo}
              className="size-[52px] bg-transparent p-0 hover:brightness-110"
              icon={<img src={`${ART}/button-home.webp`} alt="" className="size-[52px]" />}
            />
            <SoundToggle
              className="size-[52px] bg-transparent p-0 hover:brightness-110"
              icon={(enabled) => (
                <span className="relative block size-[52px]">
                  <img src={`${ART}/button-sound.webp`} alt="" className={`size-[52px] ${enabled ? '' : 'grayscale'}`} />
                  {!enabled && <span aria-hidden="true" className="absolute inset-x-2 top-1/2 h-[4px] -rotate-45 rounded bg-[#E5484D]" />}
                </span>
              )}
            />
            <h1 className="m-0 truncate rounded-full border-[3px] border-[#6B3A1A] bg-[linear-gradient(#B8733A,#8E5226)] px-6 py-1 font-display text-[24px] font-extrabold text-[#FFE27A] shadow-[0_3px_0_#5C3216] [text-shadow:0_2px_0_#6B3A1A]">
              {game.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {friendKey !== null && !state.locked && (
              <span className="flex items-center gap-2 rounded-full bg-white/85 py-1 pl-3 text-lg font-extrabold">
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
            art="lifeline-5050"
            title={i18n.t('play.millionaire.fiftyFifty')}
            used={state.used.fifty || fiftyFifty(question).length === 0}
            disabled={state.locked}
            onUse={() => {
              sound.play('whoosh')
              dispatch({ type: 'fifty', hide: fiftyFifty(question) })
            }}
          />
          <Lifeline
            art="lifeline-audience"
            title={i18n.t('play.millionaire.askClass')}
            used={state.used.poll}
            disabled={state.locked}
            onUse={() => {
              sound.play('pop')
              dispatch({ type: 'poll' })
            }}
          />
          <Lifeline
            art="lifeline-phone"
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

        <div className="relative isolate mt-1 flex min-h-[196px] items-center justify-center gap-5 px-16 pt-7 pb-6 text-center">
          <img src={`${ART}/question-panel.webp`} alt="" aria-hidden="true" className="absolute inset-0 -z-10 size-full" />
          {question.imageUrl && <img src={assetSrc(question.imageUrl)} alt="" className="h-[104px] w-[140px] shrink-0 rounded-2xl object-cover" />}
          <span className="font-display leading-[1.15] font-extrabold" style={{ fontSize: questionFontSize(question.text, 38) }}>
            {question.text}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {question.options.map((option, i) => {
            const hidden = state.hidden.includes(option.id)
            const selected = state.selected === option.id
            const isRight = option.id === question.correctId
            const look = shown && isRight ? 'right' : shown && selected ? 'wrong' : selected ? (state.locked ? 'locked' : 'selected') : 'idle'
            const votes = state.poll?.[option.id] ?? 0
            const totalVotes = Object.values(state.poll ?? {}).reduce((a, b) => a + b, 0)
            const art = ANSWER_ART[i]
            return (
              <motion.button
                key={option.id}
                type="button"
                disabled={hidden || state.locked}
                onClick={() => {
                  sound.play('pop')
                  dispatch({ type: 'select', optionId: option.id })
                }}
                animate={look === 'locked' ? { opacity: [1, 0.65, 1] } : look === 'right' ? { scale: [1, 1.05, 1] } : {}}
                transition={look === 'locked' ? { repeat: Infinity, duration: 0.8 } : { duration: 0.5 }}
                aria-label={`${LETTERS[i]}. ${option.text}`}
                className={`relative isolate flex min-h-[86px] cursor-pointer items-center gap-3 border-0 bg-transparent pr-6 text-left font-[inherit] disabled:cursor-default ${
                  art ? 'pl-[22%]' : 'pl-4'
                } ${hidden ? 'invisible' : ''} ${look === 'idle' && !state.locked ? 'hover:-translate-y-0.5' : ''} ${look === 'selected' || look === 'locked' ? 'scale-[1.03]' : ''} transition-transform`}
                style={{ color: INK }}
              >
                <span aria-hidden="true" className="absolute inset-0 -z-10 isolate" style={{ filter: ANSWER_FILTER[look] }}>
                  {art ? (
                    <img src={art} alt="" className="size-full" />
                  ) : (
                    // E and F have no art: the same yellow bar in CSS.
                    <span className="block size-full rounded-full border-[3px] border-[#C98A1B] bg-[linear-gradient(#FFF0A0,#FFD23F)]" />
                  )}
                  {look === 'wrong' && (
                    // Red over the yellow (a filter cannot turn so light a yellow red), in the shape of the bar.
                    <span
                      className="absolute inset-0 rounded-full bg-[#E5382D] mix-blend-multiply"
                      style={art ? { maskImage: `url(${art})`, maskSize: '100% 100%', WebkitMaskImage: `url(${art})`, WebkitMaskSize: '100% 100%' } : undefined}
                    />
                  )}
                </span>
                {!art && (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[#F07A1A] font-display text-[24px] font-extrabold text-white">
                    {LETTERS[i]}
                  </span>
                )}
                {state.poll && totalVotes > 0 && (
                  // The share of hands, a purple strip along the bottom of the bar.
                  <span
                    aria-hidden="true"
                    className="absolute bottom-[9px] left-[22%] h-[7px] rounded-full bg-[#8E4FE0]"
                    style={{ width: `calc((78% - 28px) * ${votes / totalVotes})` }}
                  />
                )}
                <span className={`font-display font-extrabold ${option.text.length > 30 ? 'text-[20px]' : 'text-[26px]'}`}>{option.text}</span>
                {state.poll && (
                  <span className="ml-auto rounded-full bg-white/80 px-3 py-0.5 text-lg font-extrabold">{votes} ✋</span>
                )}
              </motion.button>
            )
          })}
        </div>

        {state.poll && !state.locked && (
          <div className="flex items-center gap-3 rounded-full bg-white/85 px-4 py-2" role="group" aria-label={i18n.t('play.millionaire.count')}>
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
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-full border-[3px] border-[#D98A12] bg-[linear-gradient(#FFE877,#FFB81F)] px-4 font-[inherit] text-lg font-extrabold text-[#6B3A1A] hover:brightness-105"
                >
                  {LETTERS[i]} +1
                </button>
              ),
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-4">
          <span className="rounded-full bg-white/85 px-5 py-2 text-lg font-extrabold">
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
              <button type="button" onClick={() => dispatch({ type: 'stop', levels })} className={woodButton}>
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
                className={yellowButton}
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
                className={yellowButton}
              >
                ✔ {i18n.t('play.millionaire.lockIn')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex w-[280px] shrink-0 flex-col items-center">
        <Board>
          <ol aria-label={i18n.t('play.millionaire.ladder')} className="m-0 flex list-none flex-col-reverse gap-[3px] p-0">
            {prizes.map((prize, i) => {
              const current = i === state.level
              const passed = i < state.level
              const safe = milestones.includes(i + 1)
              return (
                <li
                  key={prize}
                  aria-current={current ? 'step' : undefined}
                  className={`flex items-center justify-between rounded-full px-3 py-[2px] text-[16px] font-extrabold tabular-nums ${
                    current
                      ? 'bg-[linear-gradient(#A066F0,#7438D0)] text-white shadow-[0_0_0_2px_#D9C2FF]'
                      : passed
                        ? 'text-[#8BEFA9]'
                        : safe
                          ? 'text-white'
                          : 'text-[#FFD15C]'
                  }`}
                >
                  <span className="w-7">{i + 1}</span>
                  <span className="flex items-center gap-1.5">
                    {safe && <span aria-label={i18n.t('play.millionaire.safe')}>◆</span>}
                    {formatPrize(prize)}
                  </span>
                </li>
              )
            })}
          </ol>
        </Board>
        <img src={`${ART}/character-explorer.webp`} alt="" aria-hidden="true" className="pointer-events-none mt-auto -mb-5 h-[150px]" />
      </div>
    </div>
  )
}

/** How an answer bar looks: the yellow art turned green (right), red (wrong), glowing when picked. */
const ANSWER_FILTER: Record<'idle' | 'selected' | 'locked' | 'right' | 'wrong', string | undefined> = {
  idle: undefined,
  selected: 'drop-shadow(0 0 3px #fff) drop-shadow(0 0 4px #fff) drop-shadow(0 0 10px #FF7A00)',
  locked: 'drop-shadow(0 0 3px #fff) drop-shadow(0 0 4px #fff) drop-shadow(0 0 12px #FF7A00) saturate(1.35)',
  right: 'hue-rotate(70deg) saturate(1.25) drop-shadow(0 0 8px #3DDC84)',
  // Turned red by a tint over it (see the bar).
  wrong: 'drop-shadow(0 0 6px #FF6B5E)',
}

/** The sky and meadow, past the stage's edges too. */
const Backdrop = () => <StageBackdrop band={SKY} above="#7FD0FA" below="#5DAE34" />

/** Clouds in the sky; bushes, grass and stones on the meadow. */
function Scenery() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <img src={`${ART}/clouds.webp`} alt="" className="absolute top-3 left-[38%] w-[300px] opacity-90" />
      <img src={`${ART}/bush.webp`} alt="" className="absolute -bottom-2 left-[24%] w-[170px]" />
      <img src={`${ART}/grass.webp`} alt="" className="absolute -bottom-2 left-[52%] w-[130px]" />
      <img src={`${ART}/rocks-flowers.webp`} alt="" className="absolute -bottom-1 -left-4 w-[300px]" />
    </div>
  )
}

/** The wooden board of the prize ladder, a crown and star on top. */
function Board({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full pt-9">
      <img src={`${ART}/stars-crown.webp`} alt="" aria-hidden="true" className="absolute top-0 left-1/2 z-10 w-[120px] -translate-x-1/2" />
      <div className="rounded-[26px] border-[7px] border-[#A8642E] bg-[#3A2140] px-2.5 pt-5 pb-3 shadow-[0_5px_0_#6B3A1A,inset_0_0_0_2px_#5C3216]">{children}</div>
    </div>
  )
}

function Lifeline({ art, title, used, disabled, onUse }: { art: string; title: string; used: boolean; disabled: boolean; onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      disabled={used || disabled}
      title={title}
      aria-label={used ? i18n.t('play.millionaire.used', { title }) : title}
      className={`relative h-[54px] cursor-pointer border-0 bg-transparent p-0 font-[inherit] transition-transform hover:enabled:-translate-y-0.5 disabled:cursor-default ${
        used ? 'opacity-45 grayscale' : ''
      }`}
    >
      <img src={`${ART}/${art}.webp`} alt="" className="h-full w-auto" />
      {used && <span className="absolute inset-x-3 top-1/2 h-[4px] -rotate-12 rounded bg-[#E5484D]" aria-hidden="true" />}
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
    <div className="relative isolate flex h-full items-center justify-center gap-10 px-12" style={{ color: INK }}>
      <Backdrop />
      <Scenery />
      <motion.img
        src={`${ART}/character-explorer.webp`}
        alt=""
        aria-hidden="true"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.45 }}
        className="relative h-[430px] self-end"
      />
      <div className="relative flex max-w-[640px] flex-col items-center gap-5 text-center">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.55 }} className="text-[80px] leading-none">
          {end.reason === 'won' ? '🏆' : end.reason === 'stopped' ? '🎉' : '💪'}
        </motion.span>
        <h1 className="m-0 font-display text-[48px] leading-tight font-extrabold [text-shadow:0_2px_0_#fff]">
          {end.reason === 'won'
            ? i18n.t('play.millionaire.millionaire')
            : end.reason === 'stopped'
              ? i18n.t('play.millionaire.wise')
              : i18n.t('play.millionaire.sorry')}
        </h1>
        {end.reason === 'wrong' && right && (
          <span className="rounded-full bg-white/85 px-5 py-1.5 text-[24px] font-extrabold text-[#1E8A4C]">{i18n.t('play.common.rightAnswer', { answer: right.text })}</span>
        )}
        <span className="rounded-full border-[6px] border-[#A8642E] bg-[#3A2140] px-10 py-3 font-display text-[42px] font-extrabold text-[#FFD15C] shadow-[0_5px_0_#6B3A1A]">
          {i18n.t('play.millionaire.prize', { prize: formatPrize(end.prize) })}
        </span>
        <div className="mt-2 flex gap-4">
          <Link to={backTo} className={`${woodButton} hover:text-[#FFF3D6]`}>
            {i18n.t('play.millionaire.toEditor')}
          </Link>
          <button type="button" onClick={playAgain} className={yellowButton}>
            {i18n.t('play.millionaire.again')}
          </button>
        </div>
      </div>
    </div>
  )
}
