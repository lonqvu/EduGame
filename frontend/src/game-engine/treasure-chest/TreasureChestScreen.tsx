import i18n from 'i18next'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ChevronRightIcon, EyeIcon } from '@/components/ui/icons'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { questionFontSize, type PlayableQuizQuestion } from '@/game-engine/quiz/quizRound'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { ArtHeader, ArtTeamCards } from '@/game-engine/shared/ArtFrame'
import { NothingToPlay, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { StageBackdrop } from '@/game-engine/shared/StageBackdrop'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { turnOf, type TurnQuizState } from '@/game-engine/shared/turnQuiz'
import { useTurnQuiz } from '@/game-engine/shared/useTurnQuiz'
import { dealChests, openTreasure, treasureLabel, type Treasure } from '@/game-engine/treasure-chest/chests'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { assetSrc } from '@/utils/images'
import { useSound } from '@/sound/useSound'
import { streakRate } from '@/sound/streak'

const LETTERS = 'ABCDEF'
/** The game's art: a cave with three stone pedestals in a jungle clearing, golden chests, yellow answer bars (A–D). */
const ART = '/assets/games/treasure-chest'
const ANSWER_ART = ['a', 'b', 'c', 'd'].map((l) => `${ART}/answer-${l}.webp`)
const LOCKED_ART = [1, 2, 3].map((n) => `${ART}/chest-locked-${n}.webp`)
/** Letter circles of E and F (A–D have theirs in the art: blue, orange, green, purple). */
const EXTRA_LETTER_COLORS = ['#13A3A8', '#E04A9A']
/**
 * An answer bar drawn as a border image, so any width keeps its round ends and letter circle: the left 115 px of the
 * art (the circle) and the right 40 px (the end) are scaled to the 58 px bar like the rest, only the middle stretches.
 */
const BAR_SLICE = '0 40 0 115'
const BAR_WIDTHS = '0 32px 0 92px'
const barArt = (art: string) => ({
  borderStyle: 'solid',
  borderColor: 'transparent',
  borderWidth: BAR_WIDTHS,
  borderImage: `url(${art}) ${BAR_SLICE} fill / ${BAR_WIDTHS} stretch`,
})
/** The same shape as a mask, for the green or red tint. */
const barMask = (art: string) => ({ WebkitMaskBoxImage: `url(${art}) ${BAR_SLICE} / ${BAR_WIDTHS} stretch` })
/** Where the chests stand in the cave: the middle of each pedestal (% of the cave's width). */
const PEDESTALS = [23.5, 50, 76.5]
const INK = '#2B2348'
/** Sky over the jungle, then the clearing's grass. */
const JUNGLE = 'bg-[linear-gradient(#5FC4E2_0%,#B8EEE2_52%,#A5DC77_62%,#6DBA43_80%,#4E9E31_100%)]'
const yellowButton = `${playButtonClass} border-[3px] border-[#D98A12] bg-[linear-gradient(#FFE877,#FFB81F)] text-[#5B3510] shadow-[0_4px_0_#B8701A] hover:brightness-105`
const blueButton = `${playButtonClass} border-[3px] border-[#1559C0] bg-[linear-gradient(#5CC0FF,#1F72E6)] text-white shadow-[0_4px_0_#0F4A9E] hover:brightness-110`
const creamButton = `${playButtonClass} border-[3px] border-[#C9B79A] bg-[linear-gradient(#FFFFFF,#EDE3D2)] text-[#2B3A67] shadow-[0_4px_0_#B9A586] hover:brightness-105`

interface TreasureChestScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Rương vàng": the teams take turns answering; a right answer opens one of three chests in the cave,
 * which may hold points, double the team's score, take points from the leader, swap scores with it, or nothing at all.
 */
export function TreasureChestScreen({ game, questions, settings }: TreasureChestScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.TREASURE_CHEST)
  const { question, round, state, dispatch, restart } = useTurnQuiz(questions, rules)
  const [chests, setChests] = useState(() => dealChests())
  /** The chest opened for this question (by count), if any. */
  const [opened, setOpened] = useState<{ at: number; index: number } | null>(null)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (!question) return <NothingToPlay message={i18n.t('play.nothing.quiz')} backTo={backTo} />
  if (state.finished) {
    return (
      <TeamResults
        teams={state.teams}
        onPlayAgain={() => {
          setChests(dealChests())
          setOpened(null)
          restart()
        }}
        mostCorrectLabel="chests"
      />
    )
  }

  const team = turnOf(state)
  const openIndex = opened?.at === state.asked ? opened.index : null
  const canOpen = state.earned && openIndex === null

  const open = (i: number, treasure: Treasure) => {
    setOpened({ at: state.asked, index: i })
    sound.play(treasure.kind === 'empty' ? 'wrong' : 'fanfare')
    dispatch({ type: 'setScores', scores: openTreasure(state.teams, team.id, treasure) })
  }

  return (
    <div className="relative isolate flex h-full flex-col gap-3 px-7 py-4" style={{ color: INK }}>
      <StageBackdrop band={JUNGLE} above="#5FC4E2" below="#4E9E31" />
      <Scenery />

      <ArtHeader
        backTo={backTo}
        home={`${ART}/icon-home.webp`}
        sound={`${ART}/icon-sound.webp`}
        title={game.title}
        right={
          <>
            {rules.timeLimitSec > 0 && !state.revealed && (
              <Countdown key={`${round}-${state.asked}`} seconds={rules.timeLimitSec} paused={state.revealed} />
            )}
            <span className="rounded-full border-[3px] border-white bg-[linear-gradient(#6CC6FF,#2F7FE6)] px-5 py-1 font-display text-[22px] font-extrabold text-white shadow-[0_3px_0_#1F5FB8]">
              {i18n.t('play.common.questionOnly', { number: state.asked + 1 })}
            </span>
          </>
        }
      />

      <ArtTeamCards teams={state.teams} activeId={team.id} />

      <div className="relative flex min-h-0 flex-1 gap-5">
        <div className="flex w-[452px] shrink-0 flex-col items-center gap-2">
          <span className="rounded-full border-[3px] border-[#6B3A1A] bg-[linear-gradient(#B8733A,#8E5226)] px-5 py-1 text-center text-[19px] font-extrabold text-[#FFF3D6] shadow-[0_3px_0_#5C3216]">
            {canOpen ? i18n.t('play.chests.choose', { team: team.name }) : openIndex !== null ? i18n.t('play.chests.opened') : i18n.t('play.chests.answerFirst')}
          </span>
          <div className="relative w-[440px]">
            <img src={`${ART}/treasure-cave.webp`} alt="" aria-hidden="true" className="block w-full" />
            {chests.map((treasure, i) => (
              <ChestOnPedestal
                key={`${state.asked}-${i}`}
                index={i}
                treasure={treasure}
                canOpen={canOpen}
                isOpen={openIndex !== null}
                chosen={openIndex === i}
                onOpen={() => open(i, treasure)}
              />
            ))}
          </div>
        </div>

        <QuestionSide
          state={state}
          question={question}
          teamName={team.name}
          teamColor={team.color}
          moveDone={openIndex !== null}
          onChoose={(optionId) => {
            if (optionId === question.correctId) sound.play('correct', { rate: streakRate(team.streak) })
            else sound.play('wrong')
            dispatch({ type: 'choose', optionId, correctId: question.correctId, points: 0 })
          }}
          onReveal={() => {
            sound.play('reveal')
            dispatch({ type: 'reveal' })
          }}
          onFinish={() => dispatch({ type: 'finish' })}
          onNext={() => {
            sound.play('whoosh')
            // A new turn deals new chests.
            setChests(dealChests())
            dispatch({ type: 'next' })
          }}
        />
      </div>
    </div>
  )
}

/** A chest on its pedestal: locked (bobbing when it can be opened), then open with what it held. */
function ChestOnPedestal({
  index,
  treasure,
  canOpen,
  isOpen,
  chosen,
  onOpen,
}: {
  index: number
  treasure: Treasure
  canOpen: boolean
  isOpen: boolean
  chosen: boolean
  onOpen: () => void
}) {
  const art = !isOpen ? LOCKED_ART[index] : !chosen ? `${ART}/chest-open-glow.webp` : treasure.kind === 'empty' ? `${ART}/chest-incorrect.webp` : `${ART}/chest-open-reward.webp`
  return (
    // The button stays put and the chest inside it bobs: a button that never stops moving cannot be clicked by tests.
    <button
      type="button"
      disabled={!canOpen}
      onClick={onOpen}
      aria-label={isOpen ? i18n.t('play.chests.chestOpen', { number: index + 1, treasure: treasureLabel(treasure) }) : i18n.t('play.chests.chest', { number: index + 1 })}
      className={`absolute bottom-[19%] flex w-[118px] -translate-x-1/2 cursor-pointer flex-col items-center border-0 bg-transparent p-0 font-[inherit] disabled:cursor-default ${
        isOpen && !chosen ? 'opacity-60' : ''
      } ${canOpen ? 'drop-shadow-[0_0_10px_#FFE27A]' : ''}`}
      style={{ left: `${PEDESTALS[index]}%` }}
    >
      {chosen && treasure.kind !== 'empty' && (
        <>
          <img src={`${ART}/effect-light-beam.webp`} alt="" aria-hidden="true" className="pointer-events-none absolute -top-[92px] left-1/2 w-[150px] max-w-none -translate-x-1/2" />
          <motion.img
            src={`${ART}/effect-sparkles.webp`}
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0.7], scale: 1 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute -top-8 left-1/2 w-[190px] max-w-none -translate-x-1/2"
          />
        </>
      )}
      <motion.span
        className="relative block w-full"
        whileHover={canOpen ? { scale: 1.08, rotate: -2 } : undefined}
        animate={canOpen ? { y: [0, -8, 0] } : { y: 0 }}
        transition={canOpen ? { repeat: Infinity, duration: 1.2, delay: index * 0.15 } : undefined}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={art}
            src={art}
            alt=""
            aria-hidden="true"
            initial={isOpen ? { scale: 0.5, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            className="block w-full"
          />
        </AnimatePresence>
      </motion.span>
      {isOpen && (
        <motion.span
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`absolute -bottom-9 left-1/2 w-max max-w-[150px] -translate-x-1/2 rounded-full px-3 py-0.5 text-center text-[16px] leading-tight font-extrabold ${
            chosen ? 'bg-[#FFD15C] text-[#5B3510] shadow-[0_2px_0_#B8701A]' : 'bg-white/85 text-[#2B2348]'
          }`}
        >
          {treasureLabel(treasure)}
        </motion.span>
      )}
    </button>
  )
}

interface QuestionSideProps {
  state: TurnQuizState
  question: PlayableQuizQuestion
  teamName: string
  teamColor: string
  moveDone: boolean
  onChoose: (optionId: string) => void
  onReveal: () => void
  onFinish: () => void
  onNext: () => void
}

/** Whose turn it is on the board's tab, the question on a wooden board, the answer bars, then what to do now. */
function QuestionSide({ state, question, teamName, teamColor, moveDone, onChoose, onReveal, onFinish, onNext }: QuestionSideProps) {
  const many = question.options.length > 4
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="relative pt-4">
        <span className="absolute top-0 left-6 z-10 flex items-center gap-2 rounded-full border-[3px] border-[#D98A12] bg-[linear-gradient(#FFE877,#FFB81F)] px-4 py-0.5 text-[17px] font-extrabold text-[#5B3510] shadow-[0_2px_0_#B8701A]">
          <span className="size-4 rounded-full border-2 border-white" style={{ background: teamColor }} />
          {i18n.t('play.common.turnOf', { team: teamName })}
        </span>
        <div className="rounded-[22px] border-[7px] border-[#9A5A2A] bg-[#FBEBD3] p-1.5 shadow-[0_4px_0_#6B3A1A,inset_0_0_0_2px_#7A4420]">
          <div className="flex min-h-[112px] items-center justify-center gap-4 rounded-[14px] border-2 border-dashed border-[#E2C9A4] px-6 py-3 text-center">
            {question.imageUrl && <img src={assetSrc(question.imageUrl)} alt="" className="h-[84px] w-[116px] shrink-0 rounded-2xl object-cover" />}
            <span className="font-display leading-[1.12] font-extrabold" style={{ fontSize: questionFontSize(question.text, 34) }}>
              {question.text}
            </span>
          </div>
        </div>
      </div>

      <div className={`grid gap-x-3 gap-y-1.5 ${many ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {question.options.map((option, i) => {
          const result = state.tried[option.id]
          const right = option.id === question.correctId
          const look = state.revealed && right ? 'right' : result === false ? 'wrong' : state.revealed ? 'dim' : 'idle'
          const art = ANSWER_ART[i]
          return (
            <motion.button
              key={option.id}
              type="button"
              disabled={state.revealed || result !== undefined}
              onClick={() => onChoose(option.id)}
              animate={look === 'right' ? { scale: [1, 1.04, 1] } : look === 'wrong' ? { x: [0, -6, 6, 0] } : {}}
              transition={{ duration: 0.45 }}
              aria-label={`${LETTERS[i]}. ${option.text}`}
              className={`relative isolate flex h-[58px] cursor-pointer items-center gap-3 border-0 bg-transparent pr-6 text-left font-[inherit] transition-transform disabled:cursor-default ${
                art ? 'pl-[92px]' : 'pl-3'
              } ${look === 'dim' ? 'opacity-50' : ''} ${look === 'idle' && !state.revealed ? 'hover:-translate-y-0.5' : ''}`}
              style={{ color: INK }}
            >
              <span aria-hidden="true" className="absolute inset-0 -z-10 isolate">
                {art ? (
                  <span className="absolute inset-0" style={barArt(art)} />
                ) : (
                  // E and F have no art: the same yellow bar in CSS.
                  <span className="block size-full rounded-full border-[3px] border-[#7A4A12] bg-[linear-gradient(#FFF4A8_0%,#FFD94A_45%,#F5BC22_100%)] shadow-[inset_0_3px_0_rgba(255,255,255,0.7),0_2px_0_#9A6418]" />
                )}
                {(look === 'right' || look === 'wrong') && (
                  // Green or red over the yellow, in the shape of the bar.
                  <span
                    className="absolute inset-0 rounded-full mix-blend-multiply"
                    style={{ background: look === 'right' ? '#43D17A' : '#E5382D', ...(art ? barMask(art) : {}) }}
                  />
                )}
              </span>
              {!art && (
                <span
                  className="ml-4 flex h-10 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white font-display text-[20px] font-extrabold text-white"
                  style={{ background: EXTRA_LETTER_COLORS[i - ANSWER_ART.length] }}
                >
                  {LETTERS[i]}
                </span>
              )}
              <span className={`font-display font-extrabold ${option.text.length > 30 || many ? 'text-[19px]' : 'text-[23px]'}`}>{option.text}</span>
              {look === 'right' && <span className="ml-auto text-[24px]">✔</span>}
              {look === 'wrong' && <span className="ml-auto text-[24px] text-white">✘</span>}
            </motion.button>
          )
        })}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/85 px-4 py-2 text-[17px] leading-tight font-extrabold">
          {!state.revealed
            ? i18n.t('play.common.pickAnswer')
            : state.earned
              ? moveDone
                ? i18n.t('play.common.great')
                : i18n.t('play.common.rightMove', { team: teamName, move: i18n.t('play.chests.move') })
              : i18n.t('play.common.wrongTurn')}
        </span>
        <div className="flex shrink-0 gap-2.5">
          {!state.revealed && (
            <button type="button" onClick={onReveal} className={yellowButton}>
              <EyeIcon size={22} />
              {i18n.t('play.common.showAnswer')}
            </button>
          )}
          <button type="button" onClick={onFinish} className={creamButton}>
            {i18n.t('play.common.finish')}
          </button>
          <button type="button" disabled={!state.revealed || (state.earned && !moveDone)} onClick={onNext} className={blueButton}>
            {i18n.t('play.common.nextTurn')}
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Leaves at the edge; stones, grass, flowers and a bush under the cave, clear of the question side. */
function Scenery() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <img src={`${ART}/leaves.webp`} alt="" className="absolute top-[150px] -left-6 w-[90px] -rotate-12" />
      <img src={`${ART}/rock-plant.webp`} alt="" className="absolute -bottom-2 -left-3 w-[140px]" />
      <img src={`${ART}/grass.webp`} alt="" className="absolute -bottom-3 left-[120px] w-[110px]" />
      <img src={`${ART}/flowers.webp`} alt="" className="absolute -bottom-1 left-[226px] w-[78px]" />
      <img src={`${ART}/bush.webp`} alt="" className="absolute -bottom-4 left-[300px] w-[160px]" />
    </div>
  )
}
