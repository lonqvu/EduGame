import { App, Input, Modal } from 'antd'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import * as questionSetApi from '@/api/questionSetApi'
import { CheckIcon, FileTextIcon, PencilIcon } from '@/components/ui/icons'
import { editPath, startPath } from '@/game-engine/registry'
import { gameThumb } from '@/pages/home/homeAssets'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useQuestionSetStore } from '@/store/questionSetStore'
import type { QuestionGameCode, QuestionSetSummaryResponse } from '@/types/api'
import type { GameTemplate } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { subjectArt, subjectInfo, usableCount, USE_GAMES } from '@/utils/questionSets'

const MAX_GAME_TITLE = 120

type Source = 'set' | 'new'

interface NewGameModalProps {
  /** The game chosen; none: closed. */
  template: GameTemplate | null
  /** Grade new games are for (the class being taught). */
  grade?: number
  /** "3A": suggested in the game's name. */
  className?: string
  onClose: () => void
}

/** Games that can be made from a question set of the bank. */
const fromSetCode = (template: GameTemplate): QuestionGameCode | undefined =>
  USE_GAMES.find((g) => g.code === template.type)?.code

/**
 * After "Chọn trò chơi": the game's name and how to start it, from a question set of the bank (made now, then the
 * start page) or with new content (the editor). Nothing is created until the teacher confirms, so leaving here leaves
 * no empty game behind.
 */
export function NewGameModal(props: NewGameModalProps) {
  // Each opening starts afresh.
  return props.template ? <NewGameDialog {...props} template={props.template} /> : null
}

function NewGameDialog({ template, grade, className, onClose }: NewGameModalProps & { template: GameTemplate }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const createGame = useGameLibraryStore((s) => s.createGame)
  const sets = useQuestionSetStore((s) => s.sets)
  const setsStatus = useQuestionSetStore((s) => s.status)
  const loadSets = useQuestionSetStore((s) => s.load)
  const gameCode = fromSetCode(template)
  const usable = (set: QuestionSetSummaryResponse) => (gameCode ? usableCount(set, gameCode) : 0)
  const firstUsable = sets.find((s) => usable(s) > 0)

  const [title, setTitle] = useState(className ? `${template.name} - ${className}` : template.name)
  const [source, setSource] = useState<Source | null>(null)
  const [setCode, setSetCode] = useState<string | undefined>()
  const [touched, setTouched] = useState(false)
  const [making, setMaking] = useState(false)

  useEffect(() => {
    if (gameCode) void loadSets()
  }, [gameCode, loadSets])

  // Start from the bank when it has a set this game can play, else with new content.
  const chosen: Source = source ?? (firstUsable ? 'set' : 'new')
  const pickedSet = sets.find((s) => s.code === (setCode ?? firstUsable?.code))
  const titleError = touched && !title.trim() ? 'Cô đặt tên cho trò chơi nhé' : null
  const setReady = chosen === 'new' || (!!pickedSet && usable(pickedSet) > 0)
  const canSubmit = !!title.trim() && setReady

  const submit = async () => {
    setTouched(true)
    if (!canSubmit || making) return
    setMaking(true)
    try {
      if (chosen === 'set' && pickedSet && gameCode) {
        const used = await questionSetApi.useQuestionSet(pickedSet.code, gameCode, title.trim())
        void loadSets() // the set's use count changed
        const skipped = used.skippedCount ? ` (bỏ qua ${used.skippedCount} câu tự luận)` : ''
        message.success(`Đã tạo trò chơi với ${used.questionCount} câu hỏi${skipped}.`)
        navigate(startPath({ id: used.gameCode, type: template.type }))
      } else {
        navigate(editPath(await createGame(template.type, grade, title.trim())))
      }
    } catch (error) {
      message.error(apiErrorMessage(error))
      setMaking(false)
    }
  }

  return (
    <Modal
      open
      title="Tạo trò chơi"
      okText={chosen === 'set' ? 'Tiếp tục' : 'Bắt đầu soạn'}
      cancelText="Hủy"
      onOk={() => void submit()}
      onCancel={onClose}
      okButtonProps={{ disabled: !setReady || (touched && !title.trim()) }}
      confirmLoading={making}
      width={600}
    >
      <div className="flex flex-col gap-5 pt-2">
        <div className="flex items-center gap-3.5 rounded-[14px] bg-surface-soft p-2.5">
          <img src={gameThumb(template.type)} alt="" className="aspect-[2/1] w-[96px] shrink-0 rounded-[10px]" />
          <div className="flex min-w-0 flex-col">
            <span className="text-[16px] font-black">{template.name}</span>
            <span className="line-clamp-2 text-[13px] leading-snug text-ink-soft">{template.description}</span>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-bold text-ink-soft">Tên trò chơi</span>
          <Input
            size="large"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched(true)}
            onPressEnter={() => void submit()}
            maxLength={MAX_GAME_TITLE}
            showCount
            status={titleError ? 'error' : undefined}
            placeholder="VD: Ôn phép cộng - Lớp 3A"
            autoFocus
          />
          {titleError && <span className="text-[13px] text-danger">{titleError}</span>}
        </label>

        <div className="flex flex-col gap-2.5">
          <span className="text-[14px] font-bold text-ink-soft">Cô muốn bắt đầu như thế nào?</span>
          <div role="radiogroup" aria-label="Cách bắt đầu" className="grid gap-2.5 sm:grid-cols-2">
            <SourceOption
              checked={chosen === 'set'}
              disabled={!gameCode}
              onSelect={() => setSource('set')}
              icon={<FileTextIcon size={22} />}
              title="Dùng bộ câu hỏi có sẵn"
              text={gameCode ? 'Chọn một bộ trong ngân hàng, vào chơi ngay.' : 'Trò này dùng nội dung riêng, chưa dùng được bộ câu hỏi.'}
            />
            <SourceOption
              checked={chosen === 'new'}
              onSelect={() => setSource('new')}
              icon={<PencilIcon size={22} />}
              title="Soạn nội dung mới"
              text="Tự nhập câu hỏi cho trò chơi này."
            />
          </div>
        </div>

        {chosen === 'set' && (
          <SetPicker
            sets={sets}
            loading={setsStatus !== 'ready' && setsStatus !== 'error'}
            pickedCode={pickedSet?.code}
            usable={usable}
            onPick={setSetCode}
            onClose={onClose}
          />
        )}
      </div>
    </Modal>
  )
}

function SourceOption({ checked, disabled, onSelect, icon, title, text }: {
  checked: boolean
  disabled?: boolean
  onSelect: () => void
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={`relative flex cursor-pointer items-start gap-3 rounded-[14px] border-2 bg-white p-3.5 text-left font-[inherit] text-ink transition disabled:cursor-not-allowed disabled:opacity-55 ${
        checked ? 'border-primary bg-primary-soft/40 shadow-[0_6px_16px_rgba(53,99,233,0.14)]' : 'border-line-soft enabled:hover:border-[#C9D9F5]'
      }`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-[12px] ${checked ? 'bg-primary text-white' : 'bg-primary-soft text-primary'}`}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 pr-5">
        <span className="text-[15px] font-extrabold">{title}</span>
        <span className="text-[12.5px] leading-snug text-ink-muted">{text}</span>
      </span>
      {checked && (
        <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-white">
          <CheckIcon size={12} />
        </span>
      )}
    </button>
  )
}

/** The teacher's sets; those this game cannot play (no questions of its kind) are shown but cannot be picked. */
function SetPicker({ sets, loading, pickedCode, usable, onPick, onClose }: {
  sets: QuestionSetSummaryResponse[]
  loading: boolean
  pickedCode?: string
  usable: (set: QuestionSetSummaryResponse) => number
  onPick: (code: string) => void
  onClose: () => void
}) {
  if (loading && sets.length === 0) return <p className="m-0 text-[14px] text-ink-soft">Đang tải bộ câu hỏi…</p>
  if (sets.length === 0) {
    return (
      <p className="m-0 rounded-[12px] bg-sun-pale px-4 py-3 text-[14px] leading-[1.5]">
        Cô chưa có bộ câu hỏi nào.{' '}
        <Link to="/question-sets" onClick={onClose} className="font-bold">
          Tạo bộ câu hỏi
        </Link>{' '}
        hoặc chọn “Soạn nội dung mới”.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[14px] font-bold text-ink-soft">Chọn bộ câu hỏi</span>
      <ul role="radiogroup" aria-label="Bộ câu hỏi" className="m-0 flex max-h-[260px] list-none flex-col gap-2 overflow-y-auto p-0 pr-1">
        {sets.map((set) => {
          const count = usable(set)
          const checked = set.code === pickedCode
          return (
            <li key={set.code}>
              <button
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={count === 0}
                onClick={() => onPick(set.code)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-[12px] border-2 bg-white px-2.5 py-2 text-left font-[inherit] text-ink disabled:cursor-not-allowed disabled:opacity-50 ${
                  checked ? 'border-primary' : 'border-line-soft enabled:hover:border-[#C9D9F5]'
                }`}
              >
                <img src={subjectArt(set.subject)} alt="" className="size-10 shrink-0 rounded-[10px]" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14.5px] font-bold">{set.title}</span>
                  <span className={`text-[12.5px] ${count ? 'text-ink-muted' : 'text-danger'}`}>
                    {subjectInfo(set.subject).label} ·{' '}
                    {count === 0
                      ? 'Không có câu dùng được cho trò này'
                      : count === set.questionCount
                        ? `${count} câu hỏi`
                        : `Dùng được ${count}/${set.questionCount} câu (câu trắc nghiệm)`}
                  </span>
                </span>
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? 'border-primary bg-primary text-white' : 'border-line'}`}
                >
                  {checked && <CheckIcon size={11} />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
