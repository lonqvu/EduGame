import { App, Button, Input, Modal } from 'antd'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import * as questionSetApi from '@/api/questionSetApi'
import { CheckIcon, FileTextIcon, SearchIcon } from '@/components/ui/icons'
import { editPath } from '@/game-engine/registry'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useQuestionSetStore } from '@/store/questionSetStore'
import type { GameType } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { isSetGame, KIND_LABELS, kindOf, type QuestionKind, setChoices, subjectArt } from '@/utils/questionSets'

/** Longest game name the dialog takes. */
export const MAX_GAME_NAME = 50
const ART = '/assets/question-sets/create-game.svg'

export interface NewGame {
  type: GameType
  /** "Trắc nghiệm" */
  name: string
}

interface CreateGameDialogProps {
  /** The game being created; none when closed. */
  game?: NewGame
  /** "Lớp 3A": suggested in the game's name (empty without a class) */
  className: string
  grade?: number
  onClose: () => void
}

/**
 * "Tạo trò chơi mới": the teacher names the game and chooses how to start, from a question set ("Dùng bộ câu hỏi có
 * sẵn", only for games that play sets) or with new content in the editor. Picking a set is the dialog's second step.
 */
export function CreateGameDialog(props: CreateGameDialogProps) {
  // Each opening starts afresh.
  return props.game ? <Dialog {...props} game={props.game} /> : null
}

type Start = 'set' | 'new'
const KIND_TABS: (QuestionKind | 'ALL')[] = ['ALL', 'MULTIPLE_CHOICE', 'SHORT_ANSWER', 'MIXED']
const TAB_LABELS: Record<QuestionKind | 'ALL', string> = { ...KIND_LABELS, ALL: 'Tất cả', MIXED: 'Hỗn hợp' }

function Dialog({ game, className, grade, onClose }: CreateGameDialogProps & { game: NewGame }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const createGame = useGameLibraryStore((s) => s.createGame)
  const sets = useQuestionSetStore((s) => s.sets)
  const setsStatus = useQuestionSetStore((s) => s.status)
  const loadSets = useQuestionSetStore((s) => s.load)

  const canUseSet = isSetGame(game.type)
  const [title, setTitle] = useState(`${game.name}${className ? ` – ${className}` : ''}`.slice(0, MAX_GAME_NAME))
  const [start, setStart] = useState<Start>(canUseSet ? 'set' : 'new')
  const [step, setStep] = useState<'start' | 'set'>('start')
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<QuestionKind | 'ALL'>('ALL')
  const [picked, setPicked] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (canUseSet) void loadSets()
  }, [canUseSet, loadSets])

  const name = title.trim()
  const choices = useMemo(
    () => (isSetGame(game.type) ? setChoices(sets, game.type, search, kind) : []),
    [sets, game.type, search, kind],
  )
  // The set picked, else (none yet, or filtered out) the first one the game can play.
  const chosen = choices.find((c) => c.set.code === picked && c.usable > 0) ?? choices.find((c) => c.usable > 0)

  const startNew = async () => {
    setBusy(true)
    try {
      navigate(editPath(await createGame(game.type, grade, name)))
      onClose()
    } catch (error) {
      message.error(apiErrorMessage(error))
      setBusy(false)
    }
  }

  const createFromSet = async () => {
    if (!chosen || !isSetGame(game.type)) return
    setBusy(true)
    try {
      const used = await questionSetApi.useQuestionSet(chosen.set.code, game.type, name)
      const skipped = used.skippedCount ? ` (bỏ qua ${used.skippedCount} câu tự luận)` : ''
      message.success(`Đã tạo “${name}” với ${used.questionCount} câu hỏi${skipped}. Cô xem lại rồi bấm Chơi nhé!`)
      void loadSets()
      navigate(editPath(used.gameCode))
      onClose()
    } catch (error) {
      message.error(apiErrorMessage(error))
      setBusy(false)
    }
  }

  const next = () => (start === 'set' ? setStep('set') : void startNew())

  return (
    <Modal
      open
      onCancel={onClose}
      width={step === 'start' ? 720 : 640}
      title={
        <DialogTitle
          icon={<FileTextIcon size={20} />}
          title={step === 'start' ? 'Tạo trò chơi mới' : 'Chọn bộ câu hỏi'}
          subtitle={step === 'start' ? `${game.name} • Tạo nội dung và bắt đầu chơi` : `${game.name} • ${name}`}
        />
      }
      footer={
        step === 'start' ? (
          <div className="flex justify-end gap-2.5">
            <Button size="large" onClick={onClose} className="min-w-[110px] rounded-[12px]">
              Hủy
            </Button>
            <Button
              size="large"
              type="primary"
              disabled={!name}
              loading={busy}
              onClick={next}
              className="min-w-[130px] rounded-[12px] font-extrabold"
            >
              Tiếp tục
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Button type="link" onClick={() => setStep('start')} className="mr-auto px-0 font-bold">
              ← Quay lại
            </Button>
            <Button size="large" onClick={onClose} className="min-w-[100px] rounded-[12px]">
              Hủy
            </Button>
            <Button
              size="large"
              type="primary"
              disabled={!chosen}
              loading={busy}
              onClick={() => void createFromSet()}
              className="min-w-[120px] rounded-[12px] font-extrabold"
            >
              Tạo game
            </Button>
          </div>
        )
      }
    >
      {step === 'start' ? (
        <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center">
          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-bold text-ink-soft">Tên trò chơi</span>
              <Input
                size="large"
                value={title}
                maxLength={MAX_GAME_NAME}
                showCount
                onChange={(e) => setTitle(e.target.value)}
                status={name ? undefined : 'error'}
                aria-label="Tên trò chơi"
                autoFocus
              />
              {!name && <span className="text-[13px] text-danger">Cô đặt tên cho trò chơi nhé.</span>}
            </label>
            <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
              <legend className="mb-2.5 p-0 text-[14px] font-bold text-ink-soft">Cô muốn bắt đầu như thế nào?</legend>
              <div role="radiogroup" aria-label="Cách bắt đầu" className="flex flex-col gap-2.5">
                {canUseSet && (
                  <StartOption
                    checked={start === 'set'}
                    onSelect={() => setStart('set')}
                    title="Dùng bộ câu hỏi có sẵn"
                    text="Chọn bộ câu hỏi phù hợp với trò chơi."
                  />
                )}
                <StartOption
                  checked={start === 'new'}
                  onSelect={() => setStart('new')}
                  title="Soạn nội dung mới"
                  text="Tạo câu hỏi trực tiếp trong trình soạn."
                />
              </div>
            </fieldset>
          </div>
          <img src={ART} alt="" aria-hidden="true" className="mx-auto hidden w-[200px] select-none sm:block" />
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 pt-2">
          <Input
            size="large"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<SearchIcon size={18} className="text-ink-muted" />}
            placeholder="Tìm theo tên bộ câu hỏi..."
            aria-label="Tìm bộ câu hỏi"
            className="rounded-[12px] text-[15px]"
          />
          <div role="tablist" aria-label="Loại câu hỏi" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]">
            {KIND_TABS.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={`h-9 shrink-0 cursor-pointer rounded-full border-0 px-4 font-[inherit] text-[14px] font-bold transition ${
                  kind === k ? 'bg-primary text-white shadow-[0_3px_8px_rgba(53,99,233,0.25)]' : 'bg-chip text-ink-soft hover:bg-primary-soft hover:text-primary-ink'
                }`}
              >
                {TAB_LABELS[k]}
              </button>
            ))}
          </div>
          <SetList
            status={setsStatus}
            choices={choices}
            chosen={chosen?.set.code}
            empty={sets.length === 0}
            onPick={setPicked}
            onRetry={() => void loadSets()}
          />
        </div>
      )}
    </Modal>
  )
}

function DialogTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <span className="flex items-start gap-3 pr-6">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-white">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[18px] leading-tight font-black">{title}</span>
        <span className="truncate text-[13.5px] font-normal text-ink-muted">{subtitle}</span>
      </span>
    </span>
  )
}

function StartOption({ checked, onSelect, title, text }: { checked: boolean; onSelect: () => void; title: string; text: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-3.5 rounded-[14px] border-2 px-4 py-3.5 text-left font-[inherit] text-ink transition ${
        checked ? 'border-primary bg-primary-soft/60' : 'border-line-soft bg-white hover:border-[#C9D9F5]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? 'border-primary bg-primary text-white' : 'border-line-strong bg-white'
        }`}
      >
        {checked && <CheckIcon size={14} />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15.5px] font-extrabold">{title}</span>
        <span className="text-[13.5px] text-ink-muted">{text}</span>
      </span>
    </button>
  )
}

interface SetListProps {
  status: string
  choices: ReturnType<typeof setChoices>
  chosen?: string
  /** The teacher has no set at all */
  empty: boolean
  onPick: (code: string) => void
  onRetry: () => void
}

/** The sets, those the game can play first; the others say so and cannot be picked. */
function SetList({ status, choices, chosen, empty, onPick, onRetry }: SetListProps) {
  if (status === 'error') {
    return (
      <p className="m-0 rounded-[14px] bg-surface-soft px-4 py-6 text-center text-[14.5px] text-ink-muted">
        Chưa tải được bộ câu hỏi.{' '}
        <button type="button" onClick={onRetry} className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] font-bold text-primary">
          Thử lại
        </button>
      </p>
    )
  }
  if (status !== 'ready') {
    return <p className="m-0 px-4 py-8 text-center text-[14.5px] text-ink-muted">Đang tải bộ câu hỏi…</p>
  }
  if (empty) {
    return (
      <p className="m-0 rounded-[14px] bg-surface-soft px-4 py-6 text-center text-[14.5px] text-ink-muted">
        Cô chưa có bộ câu hỏi nào. <Link to="/question-sets">Tạo bộ câu hỏi</Link> hoặc quay lại để soạn nội dung mới.
      </p>
    )
  }
  if (!choices.length) {
    return <p className="m-0 rounded-[14px] bg-surface-soft px-4 py-6 text-center text-[14.5px] text-ink-muted">Không có bộ câu hỏi nào phù hợp tìm kiếm.</p>
  }
  return (
    <ul role="radiogroup" aria-label="Bộ câu hỏi" className="m-0 flex max-h-[360px] list-none flex-col gap-2.5 overflow-y-auto p-0 pr-1">
      {choices.map(({ set, usable }) => {
        const fits = usable > 0
        const checked = set.code === chosen
        return (
          <li key={set.code}>
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={!fits}
              onClick={() => onPick(set.code)}
              className={`flex w-full cursor-pointer items-center gap-3.5 rounded-[14px] border-2 bg-white px-3.5 py-3 text-left font-[inherit] text-ink transition disabled:cursor-not-allowed ${
                checked ? 'border-primary bg-primary-soft/50' : 'border-line-soft enabled:hover:border-[#C9D9F5]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  checked ? 'border-primary bg-primary text-white' : fits ? 'border-line-strong' : 'border-line-soft bg-chip'
                }`}
              >
                {checked && <CheckIcon size={12} />}
              </span>
              <img src={subjectArt(set.subject)} alt="" className={`hidden h-10 w-[46px] shrink-0 rounded-[10px] object-cover sm:block ${fits ? '' : 'opacity-50 grayscale'}`} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`line-clamp-2 text-[15px] leading-snug font-extrabold ${fits ? '' : 'text-ink-muted'}`}>{set.title}</span>
                <span className="text-[13px] text-ink-muted">
                  {usable}/{set.questionCount} câu · {KIND_LABELS[kindOf(set)]}
                </span>
              </span>
              {fits ? (
                <span className="shrink-0 rounded-full bg-[#E3F6EA] px-2.5 py-1 text-[12.5px] font-bold text-success">Phù hợp</span>
              ) : (
                <span className="shrink-0 rounded-full bg-chip px-2.5 py-1 text-[12px] font-bold text-ink-muted">
                  Không phù hợp<span className="hidden sm:inline"> với trò chơi này</span>
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

