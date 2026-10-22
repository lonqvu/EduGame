import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { MAX_SCOREBOARD_TEAMS, MIN_SCOREBOARD_TEAMS } from '@/game-engine/tools/classTools'
import { addPoints, leaders, restoreTeams, scoreboardTeams, type BoardTeam } from '@/game-engine/tools/scoreboard'
import { ToolFrame } from '@/game-engine/tools/ToolFrame'
import { useSound } from '@/sound/useSound'

/** The board survives a reload on this computer (only here: it is a classroom convenience, not a record). */
const STORAGE_KEY = 'edugame.scoreboard'
const STEPS = [-1, 1, 5, 10]

function loadTeams(): BoardTeam[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return (saved && restoreTeams(JSON.parse(saved))) || scoreboardTeams(4)
  } catch {
    return scoreboardTeams(4)
  }
}

/** Projector: points of 2-6 teams for any activity; names can be changed, scores go up and down in one tap. */
export function ScoreboardScreen() {
  const [teams, setTeams] = useState(loadTeams)
  const sound = useSound()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teams))
    } catch {
      // Private window: the board lasts until the page closes.
    }
  }, [teams])

  const leading = leaders(teams)
  const resize = (count: number) =>
    setTeams((current) => scoreboardTeams(count).map((fresh, i) => current[i] ?? fresh))

  return (
    <ToolFrame
      title="Bảng điểm"
      subtitle="Bấm vào tên đội để đổi tên"
      actions={
        <>
          <span className="text-lg font-bold text-ink-soft">Số đội</span>
          {Array.from({ length: MAX_SCOREBOARD_TEAMS - MIN_SCOREBOARD_TEAMS + 1 }, (_, i) => i + MIN_SCOREBOARD_TEAMS).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={teams.length === n}
              onClick={() => resize(n)}
              className={`h-12 min-w-12 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-lg font-extrabold ${
                teams.length === n ? 'bg-primary text-white' : 'bg-white text-ink hover:text-primary-ink'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTeams((current) => current.map((t) => ({ ...t, score: 0 })))}
            className="h-12 cursor-pointer rounded-full border-0 bg-white px-5 font-[inherit] text-lg font-extrabold text-danger"
          >
            Về 0 hết
          </button>
        </>
      }
    >
      <div className={`grid flex-1 gap-5 ${teams.length > 4 ? 'grid-cols-3' : teams.length > 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {teams.map((team) => {
          const lead = leading.includes(team.id)
          return (
            <section
              key={team.id}
              aria-label={team.name}
              className="flex flex-col items-center justify-between gap-2 rounded-[30px] border-[5px] bg-white px-5 py-4"
              style={{ borderColor: lead ? team.color : '#FFFFFF' }}
            >
              <div className="flex w-full items-center gap-3">
                <span className="size-7 shrink-0 rounded-full" style={{ background: team.color }} />
                <input
                  value={team.name}
                  maxLength={24}
                  aria-label={`Tên ${team.name}`}
                  onChange={(e) => setTeams((current) => current.map((t) => (t.id === team.id ? { ...t, name: e.target.value } : t)))}
                  onBlur={(e) => {
                    if (!e.target.value.trim()) setTeams((current) => current.map((t, i) => (t.id === team.id ? { ...t, name: scoreboardTeams(6)[i].name } : t)))
                  }}
                  className="min-w-0 flex-1 rounded-xl border-0 bg-transparent px-1 font-display text-[28px] font-extrabold text-ink outline-none focus:bg-surface-soft"
                />
                {lead && (
                  <span className="text-[30px]" aria-label="Đang dẫn đầu">
                    👑
                  </span>
                )}
              </div>
              <motion.span
                key={team.score}
                initial={{ scale: 1.35 }}
                animate={{ scale: 1 }}
                className="font-display leading-none font-extrabold"
                style={{ color: team.color, fontSize: teams.length > 4 ? 84 : 110 }}
                aria-label={`${team.name}: ${team.score} điểm`}
              >
                {team.score}
              </motion.span>
              <div className="grid w-full grid-cols-4 gap-2">
                {STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    aria-label={`${step > 0 ? 'Cộng' : 'Trừ'} ${Math.abs(step)} điểm cho ${team.name}`}
                    onClick={() => {
                      sound.play(step > 0 ? 'correct' : 'pop')
                      setTeams((current) => addPoints(current, team.id, step))
                    }}
                    className={`flex h-14 cursor-pointer items-center justify-center rounded-2xl border-0 font-[inherit] text-[22px] font-extrabold ${
                      step > 0 ? 'text-white hover:brightness-110' : 'bg-surface-soft text-ink'
                    }`}
                    style={step > 0 ? { background: team.color } : undefined}
                  >
                    {step > 0 ? `+${step}` : step}
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </ToolFrame>
  )
}
