import type { Team } from '@/types/game'

/** Teams of a new "Lật ô thi đua" round (team setup is not configurable yet). */
export const DEFAULT_TEAMS: Team[] = [
  { id: 't-orange', name: 'Đội Cam', color: '#F28C28' },
  { id: 't-blue', name: 'Đội Biển', color: '#3563E9' },
  { id: 't-green', name: 'Đội Lá', color: '#2E9E6A' },
  { id: 't-purple', name: 'Đội Tím', color: '#8B5CF6' },
]
