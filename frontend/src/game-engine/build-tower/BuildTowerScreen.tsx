import { motion } from 'motion/react'
import { Countdown } from '@/game-engine/quiz/QuizParts'
import { useBuzzerQuiz } from '@/game-engine/quiz/useBuzzerQuiz'
import { PLAY_DEFAULTS, readPlaySettings } from '@/game-engine/shared/gameSettings'
import { NothingToPlay, PlayFrame } from '@/game-engine/shared/PlayFrame'
import { PlayFooter } from '@/game-engine/shared/PlayFooter'
import { QuestionPanel } from '@/game-engine/shared/QuestionPanel'
import type { TeamScore } from '@/game-engine/shared/teamScore'
import { TeamResults } from '@/game-engine/shared/TeamResults'
import { editPath } from '@/game-engine/registry'
import type { GameSummary, QuizQuestion } from '@/types/game'
import { useSound } from '@/sound/useSound'
import { streakRate } from '@/sound/streak'

const SITE_WIDTH = 470
const SITE_HEIGHT = 600
const GROUND = 80
const BLOCK_COLORS = ['#FFD15C', '#FF9F6B', '#7BC8F6', '#9BE08B', '#C9A7FF', '#FF8FB1']

interface BuildTowerScreenProps {
  game: GameSummary
  questions: QuizQuestion[]
  settings: Record<string, unknown>
}

/** Projector of "Xây tháp": quiz rules with a buzzer; every right answer adds a block to the team's tower. */
export function BuildTowerScreen({ game, questions, settings }: BuildTowerScreenProps) {
  const rules = readPlaySettings(settings, PLAY_DEFAULTS.BUILD_TOWER)
  const { playable, round, state, dispatch, restart } = useBuzzerQuiz(questions, rules)
  const sound = useSound()
  const backTo = editPath(game.id)

  if (playable.length === 0) return <NothingToPlay message="Chưa có câu hỏi nào đủ nội dung và đáp án đúng để chơi." backTo={backTo} />
  if (state.finished) return <TeamResults teams={state.teams} onPlayAgain={restart} mostCorrectLabel="Tháp cao nhất" />

  const question = playable[state.index]
  const answering = state.teams.find((t) => t.id === state.answeringTeamId)
  const isLast = state.index === playable.length - 1

  return (
    <PlayFrame
      title={game.title}
      progress={`Câu ${state.index + 1} / ${playable.length}`}
      extra={rules.timeLimitSec > 0 && !state.revealed && <Countdown key={`${round}-${state.index}`} seconds={rules.timeLimitSec} paused={state.revealed} />}
      backTo={backTo}
    >
      <div className="flex min-h-0 flex-1 gap-5">
        <Site
          teams={state.teams}
          most={playable.length}
          answeringId={state.answeringTeamId}
          triedIds={state.revealed ? state.teams.map((t) => t.id) : state.triedTeams}
          onPick={(teamId) => {
            sound.play('pop')
            dispatch({ type: 'pickTeam', teamId })
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <QuestionPanel
            question={question}
            tried={state.tried}
            revealed={state.revealed}
            canChoose={!!answering}
            layout="list"
            fontSize={36}
            onChoose={(optionId) => {
              if (optionId === question.correctId) {
                sound.play('correct', { rate: streakRate(answering?.streak ?? 0) })
                setTimeout(() => sound.play('drop'), 300)
              } else sound.play('wrong')
              dispatch({ type: 'choose', optionId, correctId: question.correctId, points: rules.points, allowSteal: rules.allowSteal })
            }}
          />
          <PlayFooter
            clearCorner={false}
            message={state.revealed ? 'Đáp án đúng đã hiện.' : answering ? `${answering.name} chọn đáp án nào?` : 'Đội nào giành quyền?'}
            revealed={state.revealed}
            onReveal={() => dispatch({ type: 'reveal' })}
            onFinish={() => dispatch({ type: 'finish' })}
            onNext={() => dispatch({ type: 'next', total: playable.length })}
            nextLabel={isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
          />
        </div>
      </div>
    </PlayFrame>
  )
}

interface SiteProps {
  teams: TeamScore[]
  /** Most blocks a tower can get: the number of questions. */
  most: number
  answeringId: string | null
  triedIds: string[]
  onPick: (teamId: string) => void
}

/** The building site: one tower per team, its blocks stacked from the ground, its name button under it. */
function Site({ teams, most, answeringId, triedIds, onPick }: SiteProps) {
  const column = SITE_WIDTH / teams.length
  const block = Math.min(52, (SITE_HEIGHT - GROUND - 40) / Math.max(most, 1))
  const width = Math.min(110, column - 26)
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[28px] bg-[linear-gradient(#CFEAFF,#EEF7FF)]" style={{ width: SITE_WIDTH, height: SITE_HEIGHT }}>
      <div className="absolute inset-x-0 bottom-0 bg-[#9ED37E]" style={{ height: GROUND }} />
      {teams.map((team, i) => {
        const x = column * i + (column - width) / 2
        const active = team.id === answeringId
        const done = triedIds.includes(team.id)
        return (
          <div key={team.id}>
            {Array.from({ length: team.correct }, (_, b) => (
              <motion.span
                key={b}
                initial={{ y: -SITE_HEIGHT, rotate: -8 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.35, duration: 0.8 }}
                className="absolute rounded-lg border-[3px] border-white/70"
                style={{ left: x, bottom: GROUND + b * block, width, height: block - 2, background: BLOCK_COLORS[(b + i) % BLOCK_COLORS.length] }}
                aria-hidden="true"
              />
            ))}
            <span
              className="absolute text-[30px]"
              style={{ left: x + width / 2 - 15, bottom: GROUND + team.correct * block + 2 }}
              aria-hidden="true"
            >
              🚩
            </span>
            <button
              type="button"
              onClick={() => onPick(team.id)}
              disabled={done}
              aria-pressed={active}
              aria-label={`${team.name}, tháp ${team.correct} khối`}
              className="absolute bottom-3 flex cursor-pointer flex-col items-center rounded-2xl border-[3px] bg-white px-1 py-1.5 font-[inherit] text-ink disabled:cursor-default"
              style={{ left: column * i + 6, width: column - 12, borderColor: active ? team.color : '#FFFFFF', opacity: done && !active ? 0.6 : 1 }}
            >
              <span className="flex max-w-full items-center gap-1.5">
                <span className="size-4 shrink-0 rounded-full" style={{ background: team.color }} />
                <span className="truncate text-[17px] font-extrabold">{team.name}</span>
              </span>
              <span className="text-[13px] font-bold text-ink-soft">{active ? 'Đang trả lời' : `${team.correct} khối`}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
