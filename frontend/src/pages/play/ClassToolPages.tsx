import { PROJECTOR_BOARD_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { ClassListGate } from '@/components/projector/ClassListGate'
import { DiceScreen } from '@/game-engine/tools/DiceScreen'
import { TeamMakerScreen } from '@/game-engine/tools/TeamMakerScreen'
import { TimerScreen } from '@/game-engine/tools/TimerScreen'

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
