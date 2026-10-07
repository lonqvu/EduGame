import type { GameType } from '@/types/game'
import { gameIcon } from '@/utils/gameAssets'

interface GameLogoProps {
  type: GameType
  className?: string
}

/** 320×200 illustration of a game type (decorative: the game name is always shown next to it). */
export function GameLogo({ type, className = 'rounded-[20px]' }: GameLogoProps) {
  return (
    <img
      src={gameIcon(type)}
      alt=""
      width={320}
      height={200}
      className={`block aspect-[8/5] w-full object-cover ${className}`}
    />
  )
}
