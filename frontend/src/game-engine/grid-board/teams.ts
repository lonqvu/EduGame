import i18n from 'i18next'
import type { Team } from '@/types/game'

type TeamColor = 'orange' | 'blue' | 'green' | 'purple'

const team = (id: string, color: TeamColor, hex: string): Team => ({
  id,
  color: hex,
  // Read in the current language when a round starts ("Đội Cam", "Orange team").
  get name() {
    return i18n.t(`play.teams.${color}`)
  },
})

/** Teams of a new "Lật ô thi đua" round (team setup is not configurable yet). */
export const DEFAULT_TEAMS: Team[] = [
  team('t-orange', 'orange', '#F28C28'),
  team('t-blue', 'blue', '#3563E9'),
  team('t-green', 'green', '#2E9E6A'),
  team('t-purple', 'purple', '#8B5CF6'),
]

/** The color a team is named after, alone ("Cam", "Orange"), by its id. */
export function teamColor(id: string): string {
  const color = id.replace(/^t-/, '') as TeamColor
  return i18n.t(`play.teamColors.${color}`)
}
