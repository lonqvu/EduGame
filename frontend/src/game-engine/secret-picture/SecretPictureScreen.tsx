import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { EyeIcon } from '@/components/ui/icons'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { doorColumns, MAX_DOORS, SECRET_PICTURES } from '@/game-engine/secret-picture/pictures'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame, playButtonClass } from '@/game-engine/shared/PlayFrame'
import { TeamBar } from '@/game-engine/shared/TeamBar'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { TurnQuestion } from '@/game-engine/shared/TurnQuestion'
import { turnTeam } from '@/game-engine/shared/turnBoard'
import { useTurnBoard } from '@/game-engine/shared/useTurnBoard'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'

const PICTURE_WIDTH = 660
const PICTURE_HEIGHT = 470
const DOOR_COLORS = ['#3467F4', '#F08C00', '#1FA463', '#8B5CF6', '#E5484D', '#0E9AA7']

interface SecretPictureScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/**
 * Projector of "Ô cửa bí mật": a picture behind numbered doors. The teams take turns opening a door and answering its
 * question (the door opens whatever the answer); any time, a team may guess the picture: the teacher opens it all and
 * gives the guess its points.
 */
export function SecretPictureScreen({ game, questions, settings }: SecretPictureScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.SECRET_PICTURE)
  const { playable, layout: picture, round, state, dispatch, restart } = useTurnBoard(questions, rules, (dealt) => ({
    layout: SECRET_PICTURES[Math.floor(Math.random() * SECRET_PICTURES.length)],
    cells: Math.min(dealt.length, MAX_DOORS),
  }), { autoFinish: false })
  const [shown, setShown] = useState(false)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (playable.length === 0) {
    return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  }
  if (state.finished) {
    return (
      <TeamResults
        teams={state.teams}
        onPlayAgain={() => {
          setShown(false)
          restart()
        }}
      />
    )
  }

  const team = turnTeam(state)
  const doors = state.done.length
  const opened = state.done.filter(Boolean).length
  const columns = doorColumns(doors)
  const rows = Math.ceil(doors / columns)
  const allOpen = opened === doors

  if (state.current !== null) {
    return (
      <PlayFrame
        title={game.title}
        progress={`Đã mở ${opened} / ${doors} ô cửa`}
        extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.current}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
        backTo={backTo}
      >
        <TurnQuestion
          state={state}
          question={playable[state.current]}
          rules={rules}
          dispatch={dispatch}
          heading={`Ô cửa số ${state.current + 1} · ${rules.points} điểm`}
          closeLabel="Mở ô cửa"
        />
      </PlayFrame>
    )
  }

  return (
    <PlayFrame title={game.title} progress={`Đã mở ${opened} / ${doors} ô cửa`} backTo={backTo}>
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="relative shrink-0 overflow-hidden rounded-[28px] bg-white" style={{ width: PICTURE_WIDTH, height: PICTURE_HEIGHT }}>
          <img src={picture.src} alt={shown ? picture.answer : 'Bức tranh bí mật'} className="absolute inset-0 size-full object-contain p-4" />
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
          >
            {state.done.map((open, i) => (
              <AnimatePresence key={`${round}-${i}`}>
                {!open && !shown && (
                  <motion.button
                    type="button"
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    onClick={() => {
                      sound.play('flip')
                      dispatch({ type: 'open', cell: i, points: rules.points })
                    }}
                    aria-label={`Ô cửa số ${i + 1}`}
                    className="flex cursor-pointer items-center justify-center rounded-2xl border-[3px] border-white font-display text-[44px] font-extrabold text-white shadow-[inset_0_-6px_0_rgba(0,0,0,0.15)] hover:brightness-110"
                    style={{ background: DOOR_COLORS[i % DOOR_COLORS.length], transformOrigin: 'left center' }}
                  >
                    {i + 1}
                  </motion.button>
                )}
                {(open || shown) && <span />}
              </AnimatePresence>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-[24px] bg-white px-6 py-5">
            <span className="text-[17px] font-bold text-ink-soft">Bức tranh bí mật là gì?</span>
            {shown ? (
              <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-[38px] leading-tight font-extrabold text-primary-ink">
                {picture.answer}
              </motion.span>
            ) : (
              <span className="font-display text-[30px] leading-tight font-extrabold">
                {allOpen ? 'Mọi ô cửa đã mở! Đội nào đoán được?' : `${team.name} chọn một ô cửa, hoặc đoán bức tranh!`}
              </span>
            )}
          </div>

          {shown ? (
            <div className="flex flex-col gap-3 rounded-[24px] bg-white px-6 py-5">
              <span className="text-xl font-extrabold">Đội nào đoán đúng? (+{rules.keywordPoints} điểm)</span>
              <div className="grid grid-cols-2 gap-2.5">
                {state.teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      sound.play('fanfare')
                      dispatch({ type: 'award', teamId: t.id, points: rules.keywordPoints })
                      dispatch({ type: 'finish' })
                    }}
                    className="flex h-14 cursor-pointer items-center gap-2 rounded-2xl border-[3px] border-line bg-white px-3 font-[inherit] text-lg font-extrabold text-ink hover:border-primary"
                  >
                    <span className="size-5 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'finish' })}
                  className="flex h-14 cursor-pointer items-center justify-center rounded-2xl border-[3px] border-line bg-surface-soft px-3 font-[inherit] text-lg font-extrabold text-ink-soft"
                >
                  Chưa đội nào đoán đúng
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                sound.play('reveal')
                setShown(true)
              }}
              className={`${playButtonClass} justify-center bg-sun text-ink`}
            >
              <EyeIcon size={22} />
              {allOpen ? 'Công bố bức tranh' : 'Có đội đoán! Mở bức tranh'}
            </button>
          )}

          <TeamBar teams={state.teams} activeId={shown || opened === doors ? null : team.id} activeLabel="Đến lượt" columns={2} />
          <button type="button" onClick={() => dispatch({ type: 'finish' })} className={`${playButtonClass} mt-auto justify-center bg-white text-ink`}>
            Kết thúc
          </button>
        </div>
      </div>
    </PlayFrame>
  )
}
