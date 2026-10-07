import { PROJECTOR_BOARD_BG, ProjectorStage } from '@/components/projector/ProjectorStage'
import { SpinWheelScreen } from '@/game-engine/spin-wheel/SpinWheelScreen'

export function SpinWheelPage() {
  return (
    <ProjectorStage background={PROJECTOR_BOARD_BG}>
      <SpinWheelScreen />
    </ProjectorStage>
  )
}
