import { PROJECTOR_BOARD_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { ClassListGate } from '@/components/projector/ClassListGate'
import { CardDrawScreen } from '@/game-engine/tools/CardDrawScreen'
import { CoinFlipScreen } from '@/game-engine/tools/CoinFlipScreen'
import { DiceScreen } from '@/game-engine/tools/DiceScreen'
import { NoiseMeterScreen } from '@/game-engine/tools/NoiseMeterScreen'
import { RandomNumberScreen } from '@/game-engine/tools/RandomNumberScreen'
import { ScoreboardScreen } from '@/game-engine/tools/ScoreboardScreen'
import { SeatingScreen } from '@/game-engine/tools/SeatingScreen'
import { StopwatchScreen } from '@/game-engine/tools/StopwatchScreen'
import { TeamMakerScreen } from '@/game-engine/tools/TeamMakerScreen'
import { TimerScreen } from '@/game-engine/tools/TimerScreen'
import { TrafficLightScreen } from '@/game-engine/tools/TrafficLightScreen'

/** /tools/groups — needs the class list. */
export function TeamMakerPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <ClassListGate>
        <TeamMakerScreen />
      </ClassListGate>
    </ProjectorStage>
  )
}

/** /tools/timer */
export function TimerPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <TimerScreen />
    </ProjectorStage>
  )
}

/** /tools/dice */
export function DicePage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <DiceScreen />
    </ProjectorStage>
  )
}

/** /tools/coin */
export function CoinFlipPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <CoinFlipScreen />
    </ProjectorStage>
  )
}

/** /tools/number */
export function RandomNumberPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <RandomNumberScreen />
    </ProjectorStage>
  )
}

/** /tools/scoreboard */
export function ScoreboardPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <ScoreboardScreen />
    </ProjectorStage>
  )
}

/** /tools/noise */
export function NoiseMeterPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <NoiseMeterScreen />
    </ProjectorStage>
  )
}

/** /tools/light */
export function TrafficLightPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <TrafficLightScreen />
    </ProjectorStage>
  )
}

/** /tools/stopwatch */
export function StopwatchPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <StopwatchScreen />
    </ProjectorStage>
  )
}

/** /tools/draw */
export function CardDrawPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <CardDrawScreen />
    </ProjectorStage>
  )
}

/** /tools/seating — needs the class list. */
export function SeatingPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <ClassListGate>
        <SeatingScreen />
      </ClassListGate>
    </ProjectorStage>
  )
}
