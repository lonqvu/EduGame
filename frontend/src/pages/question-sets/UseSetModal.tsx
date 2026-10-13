import { App, Modal, Select } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import * as questionSetApi from '@/api/questionSetApi'
import { CheckIcon } from '@/components/ui/icons'
import { gameThumb } from '@/pages/home/homeAssets'
import type { QuestionGameCode, QuestionSetSummaryResponse } from '@/types/api'
import { apiErrorMessage } from '@/utils/apiError'
import { usableCount, USE_GAMES } from '@/utils/questionSets'

interface UseSetModalProps {
  open: boolean
  /** The teacher's sets, to pick one when none was chosen. */
  sets: QuestionSetSummaryResponse[]
  /** The set to use; none: the teacher picks it here. */
  presetCode?: string
  onClose: () => void
  /** The game was made (the set's counts changed). */
  onUsed: (setCode: string) => void
}

/**
 * "Sử dụng": pick the game to play the set's questions with. The questions are copied into a new game, opened in the
 * editor to check and play.
 */
export function UseSetModal(props: UseSetModalProps) {
  // Each opening starts afresh (set and game picked again).
  return props.open ? <UseSetDialog {...props} /> : null
}

function UseSetDialog({ sets, presetCode, onClose, onUsed }: UseSetModalProps) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const playable = sets.filter((s) => s.questionCount > 0)
  const [code, setCode] = useState(presetCode ?? playable[0]?.code)
  const set = sets.find((s) => s.code === code)
  const firstUsable = (s?: QuestionSetSummaryResponse) => USE_GAMES.find((g) => s && usableCount(s, g.code) > 0)?.code
  const [game, setGame] = useState<QuestionGameCode | undefined>(firstUsable(set))
  const [making, setMaking] = useState(false)

  const pickSet = (next: string) => {
    setCode(next)
    const nextSet = sets.find((s) => s.code === next)
    if (!game || !nextSet || usableCount(nextSet, game) === 0) setGame(firstUsable(nextSet))
  }

  const make = async () => {
    if (!set || !game) return
    setMaking(true)
    try {
      const used = await questionSetApi.useQuestionSet(set.code, game)
      onUsed(set.code)
      const skipped = used.skippedCount ? ` (bỏ qua ${used.skippedCount} câu tự luận)` : ''
      message.success(`Đã tạo trò chơi với ${used.questionCount} câu hỏi${skipped}. Cô xem lại rồi bấm Chơi nhé!`)
      onClose()
      navigate(`/games/${encodeURIComponent(used.gameCode)}/edit`)
    } catch (error) {
      message.error(apiErrorMessage(error))
      setMaking(false)
    }
  }

  return (
    <Modal
      open
      title="Sử dụng trong trò chơi"
      okText="Tạo trò chơi"
      cancelText="Hủy"
      okButtonProps={{ disabled: !set || !game }}
      confirmLoading={making}
      onOk={() => void make()}
      onCancel={onClose}
      width={600}
    >
      <div className="flex flex-col gap-4 pt-1">
        {!presetCode && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-ink-soft">Bộ câu hỏi</span>
            <Select
              size="large"
              showSearch
              optionFilterProp="label"
              value={code}
              onChange={pickSet}
              notFoundContent="Chưa có bộ câu hỏi nào có câu hỏi"
              options={playable.map((s) => ({ value: s.code, label: `${s.title} (${s.questionCount} câu)` }))}
              aria-label="Bộ câu hỏi"
            />
          </label>
        )}
        {set && (
          <>
            <p className="m-0 text-[14.5px] text-ink-soft">
              Chọn trò chơi cho <strong className="text-ink">{set.title}</strong>. Câu hỏi được chép sang trò chơi mới: sửa bộ câu hỏi
              sau này không làm đổi trò chơi.
            </p>
            <div role="radiogroup" aria-label="Trò chơi" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {USE_GAMES.map((g) => {
                const usable = usableCount(set, g.code)
                const checked = g.code === game
                return (
                  <button
                    key={g.code}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    disabled={usable === 0}
                    onClick={() => setGame(g.code)}
                    className={`relative flex cursor-pointer flex-col overflow-hidden rounded-[16px] border-2 bg-white p-0 text-left font-[inherit] text-ink transition disabled:cursor-not-allowed disabled:opacity-55 ${
                      checked ? 'border-primary shadow-[0_6px_16px_rgba(53,99,233,0.18)]' : 'border-line-soft enabled:hover:border-[#C9D9F5]'
                    }`}
                  >
                    <img src={gameThumb(g.code)} alt="" className="h-[78px] w-full object-cover" />
                    {checked && (
                      <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white">
                        <CheckIcon size={14} />
                      </span>
                    )}
                    <span className="flex flex-col gap-0.5 px-3 py-2.5">
                      <span className="text-[15px] font-extrabold">{g.name}</span>
                      <span className="text-[12.5px] leading-snug text-ink-muted">{g.description}</span>
                      <span className={`mt-1 text-[12.5px] font-bold ${usable ? 'text-success' : 'text-danger'}`}>
                        {usable
                          ? usable === set.questionCount
                            ? `Dùng được cả ${usable} câu`
                            : `Dùng được ${usable}/${set.questionCount} câu (câu trắc nghiệm)`
                          : 'Bộ chưa có câu trắc nghiệm'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
