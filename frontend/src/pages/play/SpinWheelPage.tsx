import { PROJECTOR_BOARD_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { ClassListGate } from '@/components/projector/ClassListGate'
import { SpinWheelScreen } from '@/game-engine/spin-wheel/SpinWheelScreen'

export function SpinWheelPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <ClassListGate>
        <SpinWheelScreen />
      </ClassListGate>
    </ProjectorStage>
  )
}
