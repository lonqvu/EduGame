import { Navigate, useParams } from 'react-router'
import { ClassListGate } from '@/components/projector/ClassListGate'
import { ProjectorStage } from '@/components/projector/ProjectorStage'
import { isPickMode } from '@/game-engine/name-picker/modes'
import { PickerScreen } from '@/game-engine/name-picker/PickerScreen'

/** /tools/pick/:mode — the scene draws its own background. */
export function NamePickerPage() {
  const { mode } = useParams()
  if (!isPickMode(mode)) return <Navigate to="/tools/pick/horse" replace />

  return (
    <ProjectorStage>
      <ClassListGate>
        <PickerScreen key={mode} mode={mode} />
      </ClassListGate>
    </ProjectorStage>
  )
}
