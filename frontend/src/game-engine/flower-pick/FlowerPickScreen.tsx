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

/** The game's art: a big tree on a meadow, flowers in five colours, the girl who hosts the game. */
const ART = '/assets/games/flower-pick'
/** Ten flowers (two of each colour, numbered 1–10 in the art: the number is written over it, for up to 20). */
const FLOWER_ART = Array.from({ length: 10 }, (_, i) => `${ART}/flower-${String(i + 1).padStart(2, '0')}.webp`)
/** tree-map.webp is 646 × 346; keep its native proportions at every screen size. */
const TREE_ASPECT = 646 / 346
/** Where the flowers hang: the canopy's box in the tree picture (fractions). */
const CANOPY = { left: 0.1, top: 0.03, width: 0.8, height: 0.7 }
const INK = '#2B2348'
const SKY = 'bg-[linear-gradient(#8ED8F8_0%,#D2F1FF_54%,#B5E58A_63%,#7CC94A_80%,#5DAE34_100%)]'
const creamButton = `${playButtonClass} border-[3px] border-[#C9B79A] bg-[linear-gradient(#FFFFFF,#EDE3D2)] text-[#2B3A67] shadow-[0_4px_0_#B9A586] hover:brightness-105`

interface FlowerPickScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Hái hoa dân chủ": a tree with one numbered flower per question. The tree uses the available
 * projector width and height instead of a fixed 890px box, so its branches, flowers and scenery stay in frame.
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
    return <NothingToPlay message={i18n.t('play.nothing.quiz')} backTo={backTo} />
  }
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} />

  const picked = state.done.filter(Boolean).length
  const team = turnTeam(state)

  return (
    <div className="relative isolate flex h-full min-h-0 flex-col gap-3 overflow-hidden px-7 py-4" style={{ color: INK }}>
      <StageBackdrop band={SKY} above="#8ED8F8" below="#5DAE34" />
      {state.current === null && <Scenery />}

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
              <img src={`${ART}/white-flower.webp`} alt="" aria-hidden="true" className="h-9 w-auto" />
              {i18n.t('play.flowers.picked', { picked, total: state.done.length })}
            </span>
          </>
        }
      />

      {state.current !== null ? (
        <div className="relative flex min-h-0 flex-1 flex-col gap-3 rounded-[28px] bg-white/70 p-5">
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
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
            <div
              className="relative min-h-0 w-full max-w-[890px] flex-1"
              style={{ aspectRatio: TREE_ASPECT, maxHeight: '100%' }}
            >
              <img src={`${ART}/tree-map.webp`} alt="" aria-hidden="true" className="absolute inset-0 size-full object-contain" />
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
          </div>
          <div className="relative mt-auto flex shrink-0 flex-col gap-3 pl-[200px]">
            <ArtTeamCards teams={state.teams} activeId={team.id} activeLabel={i18n.t('play.flowers.yourTurn')} />
            <div className="flex items-center justify-between gap-4">
              <span className="relative rounded-[20px] border-[3px] border-[#E8C98F] bg-[#FFF8E6] px-5 py-2 text-[19px] font-extrabold shadow-[0_3px_0_#D9B676]">
                <span aria-hidden="true" className="absolute top-1/2 -left-[11px] size-4 -translate-y-1/2 rotate-45 border-b-[3px] border-l-[3px] border-[#E8C98F] bg-[#FFF8E6]" />
                {i18n.t('play.flowers.choose', { team: team.name })}
              </span>
              <button type="button" onClick={() => dispatch({ type: 'finish' })} className={creamButton}>
                {i18n.t('play.common.finish')}
              </button>
            </div>
          </div>
          <img src={`${ART}/host-girl.webp`} alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 left-4 z-0 h-[min(200px,28%)] max-w-[16%] object-contain object-bottom" />
        </>
      )}
    </div>
  )
}

/** Flower size follows the actual rendered tree width; coordinates are percentages, not fixed canvas pixels. */
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

/** A flower of the art, by its place on the tree, its number written on its heart. */
function Flower({ index }: { index: number }) {
  return (
    <span className="relative block">
      <img src={FLOWER_ART[index % FLOWER_ART.length]} alt="" aria-hidden="true" className="block w-full" />
      <span
        className="absolute top-[51%] left-1/2 flex size-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[rgb(254,245,177)] font-display text-[clamp(10px,1.65vw,21px)] leading-none font-extrabold text-[#4A2A12]"
        aria-hidden="true"
      >
        {index + 1}
      </span>
    </span>
  )
}

/** Decorative plants stay behind the interactive content and scale/clip within the 1280×720 stage. */
function Scenery() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <img src={`${ART}/leaves.webp`} alt="" className="absolute top-[21%] left-3 w-[min(100px,8%)]" />
      <img src={`${ART}/purple-flower.webp`} alt="" className="absolute top-[42%] left-[2.7%] w-[min(90px,7%)]" />
      <img src={`${ART}/orange-flower.webp`} alt="" className="absolute top-[21%] right-5 w-[min(90px,7%)]" />
      <img src={`${ART}/bush.webp`} alt="" className="absolute top-[43%] right-2 w-[min(140px,11%)]" />
      <img src={`${ART}/rocks.webp`} alt="" className="absolute bottom-[18%] right-[5%] w-[min(100px,8%)]" />
    </div>
  )
}
