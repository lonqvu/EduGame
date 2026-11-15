import i18n from 'i18next'
import { motion } from 'motion/react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { flowerSpots, MAX_FLOWERS } from '@/game-engine/flower-pick/flowers'
import { ArtHeader, ArtTeamCards } from '@/game-engine/shared/ArtFrame'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { StageBackdrop } from '@/game-engine/shared/StageBackdrop'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { TurnQuestion } from '@/game-engine/shared/TurnQuestion'
import { turnTeam } from '@/game-engine/shared/turnBoard'
import { useTurnBoard } from '@/game-engine/shared/useTurnBoard'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'

const ART = '/assets/games/flower-pick'
const FLOWER_ART = `${ART}/flower.svg`
const TREE_ASPECT = 646 / 346
const CANOPY = { left: 0.1, top: 0.03, width: 0.8, height: 0.7 }
const INK = '#2B2348'
const SKY = 'bg-[linear-gradient(#83D5F7_0%,#D9F3FF_49%,#BDEB9A_62%,#83D15A_82%,#5BA83B_100%)]'
const creamButton = `${playButtonClass} border-[3px] border-[#C9B79A] bg-[linear-gradient(#FFFFFF,#EDE3D2)] text-[#2B3A67] shadow-[0_4px_0_#B9A586] hover:brightness-105`

interface FlowerPickScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

export function FlowerPickScreen({ game, questions, settings }: FlowerPickScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.FLOWER_PICK)
  const { playable, layout: spots, round, state, dispatch, restart } = useTurnBoard(questions, rules, (dealt) => {
    const cells = Math.min(dealt.length, MAX_FLOWERS)
    return { layout: flowerSpots(cells), cells }
  })
  const sound = useSound()
  const backTo = editPath(game.id)

  if (playable.length === 0) return <NothingToPlay message={i18n.t('play.nothing.quiz')} backTo={backTo} />
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} />

  const picked = state.done.filter(Boolean).length
  const team = turnTeam(state)

  return (
    <div className="relative isolate flex h-full min-h-0 flex-col overflow-hidden px-6 py-3" style={{ color: INK }}>
      <StageBackdrop band={SKY} above="#83D5F7" below="#5BA83B" />
      {state.current === null && <Scenery />}

      <div className="relative z-20 shrink-0">
        <ArtHeader
          backTo={backTo}
          home={`${ART}/icon-home.webp`}
          sound={`${ART}/icon-sound.webp`}
          title={game.title}
          right={
            <>
              {state.current !== null && rules.timeLimitSec > 0 && !state.revealed && (
                <Countdown key={`${round}-${state.current}`} seconds={rules.timeLimitSec} paused={state.revealed} />
              )}
              <span className="flex items-center gap-2 rounded-full border-[3px] border-[#F2B705] bg-[linear-gradient(#FFFBEA,#FFEDB0)] py-1 pr-5 pl-1.5 text-[19px] font-extrabold shadow-[0_3px_0_#D69A00]">
                <img src={`${ART}/flower.svg`} alt="" aria-hidden="true" className="h-9 w-auto" />
                {i18n.t('play.flowers.picked', { picked, total: state.done.length })}
              </span>
            </>
          }
        />
      </div>

      {state.current !== null ? (
        <div className="relative z-10 mt-3 flex min-h-0 flex-1 flex-col rounded-[28px] border-2 border-white/80 bg-white/75 p-5 shadow-[0_10px_30px_rgba(43,35,72,0.12)]">
          <TurnQuestion
            state={state}
            question={playable[state.current]}
            rules={rules}
            dispatch={dispatch}
            heading={i18n.t('play.flowers.flower', { number: state.current + 1, points: rules.points })}
            closeLabel={picked + 1 >= state.done.length ? i18n.t('play.common.seeResults') : i18n.t('play.flowers.backToTree')}
          />
        </div>
      ) : (
        <>
          <main className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-visible py-1">
            <div
              className="relative h-full max-h-full w-auto max-w-full shrink min-w-0"
              style={{ aspectRatio: TREE_ASPECT }}
            >
              <img
                src={`${ART}/tree-map.svg`}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full object-contain"
              />
              {spots.map((spot, i) =>
                state.done[i] ? null : (
                  <ResponsiveFlower
                    key={`${round}-${i}`}
                    index={i}
                    x={(CANOPY.left + spot.x * CANOPY.width) * 100}
                    y={(CANOPY.top + spot.y * CANOPY.height) * 100}
                    onClick={() => {
                      sound.play('pop')
                      dispatch({ type: 'open', cell: i, points: rules.points })
                    }}
                  />
                ),
              )}
            </div>
          </main>

          <footer className="relative z-20 grid shrink-0 grid-cols-[150px_minmax(0,1fr)] items-end gap-4 pt-1">
            <div className="flex h-[142px] items-end justify-center overflow-hidden">
              <img
                src={`${ART}/host-girl.svg`}
                alt=""
                aria-hidden="true"
                className="h-full max-h-[142px] w-full object-contain object-bottom drop-shadow-[0_4px_3px_rgba(58,75,36,0.2)]"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2 pb-1">
              <div className="rounded-[22px] border-2 border-white/80 bg-white/55 p-2 shadow-[0_5px_14px_rgba(43,35,72,0.1)]">
                <ArtTeamCards teams={state.teams} activeId={team.id} activeLabel={i18n.t('play.flowers.yourTurn')} />
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="relative min-w-0 truncate rounded-[18px] border-[3px] border-[#E8C98F] bg-[linear-gradient(#FFFDF5,#FFF2D4)] px-5 py-2 text-[18px] font-extrabold shadow-[0_3px_0_#D9B676]">
                  {i18n.t('play.flowers.choose', { team: team.name })}
                </span>
                <button type="button" onClick={() => dispatch({ type: 'finish' })} className={creamButton}>
                  {i18n.t('play.common.finish')}
                </button>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  )
}

function ResponsiveFlower({ index, x, y, onClick }: { index: number; x: number; y: number; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: index * 0.03, type: 'spring', bounce: 0.5 }}
      whileHover={{ scale: 1.12, rotate: 8 }}
      onClick={onClick}
      aria-label={i18n.t('play.flowers.flowerLabel', { number: index + 1 })}
      className="absolute z-10 w-[7.65%] -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 font-[inherit] drop-shadow-[0_3px_3px_rgba(0,0,0,0.25)]"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <Flower index={index} />
    </motion.button>
  )
}

function Flower({ index }: { index: number }) {
  return (
    <span className="relative block">
      <img src={FLOWER_ART} alt="" aria-hidden="true" className="block w-full" />
      <span
        className="absolute top-[51%] left-1/2 flex size-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[rgb(254,245,177)] font-display text-[clamp(10px,1.65vw,21px)] leading-none font-extrabold text-[#4A2A12]"
        aria-hidden="true"
      >
        {index + 1}
      </span>
    </span>
  )
}

function Scenery() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <img src={`${ART}/flower-pick-decor.svg`} alt="" className="absolute top-[20%] left-2 w-[min(100px,8%)] opacity-90" />
      <img src={`${ART}/flower-pick-decor.svg`} alt="" className="absolute top-[45%] left-[2%] w-[min(90px,7%)] opacity-90" />
      <img src={`${ART}/flower-pick-decor.svg`} alt="" className="absolute top-[20%] right-4 w-[min(90px,7%)] opacity-90" />
      <img src={`${ART}/flower-pick-decor.svg`} alt="" className="absolute right-2 bottom-[18%] w-[min(140px,11%)]" />
      <img src={`${ART}/flower-pick-decor.svg`} alt="" className="absolute right-[5%] bottom-[17%] w-[min(100px,8%)]" />
    </div>
  )
}
