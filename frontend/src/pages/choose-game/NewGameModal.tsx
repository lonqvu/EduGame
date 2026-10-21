import { App, Button, Input, Modal } from 'antd'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import * as questionSetApi from '@/api/questionSetApi'
import { FileTextIcon, SearchIcon } from '@/components/ui/icons'
import { editPath, playPath } from '@/game-engine/registry'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useQuestionSetStore } from '@/store/questionSetStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { GameTemplate } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { enterFullscreen } from '@/utils/fullscreen'
import type { QuestionGameCode, QuestionSetSummaryResponse } from '@/types/api'
import { isSetGame, KIND_LABELS, kindOf, setChoices, subjectArt } from '@/utils/questionSets'

/** Longest game name the dialog takes. */
export const MAX_GAME_NAME = 50

interface NewGameModalProps {
  /** The game chosen; none: closed. */
  template: GameTemplate | null
  /** Grade new games are for (the class being taught). */
  grade?: number
  /** "Lớp 3A": suggested in the game's name. */
  className?: string
  onClose: () => void
}

/**
 * "Dùng câu hỏi của cô" on a game card: one dialog, "Chơi với câu hỏi nào?". A question set of the bank is played at
 * once (the game is made from it, named after it, and opens on the projector); or new content is written in the
 * editor, typed or pasted. No naming step: the name is made up and can be changed in the editor. Nothing is created
 * until the teacher picks, so closing here leaves no empty game behind.
 */
export function NewGameModal(props: NewGameModalProps) {
  // Each opening starts afresh.
  return props.template ? <Dialog {...props} template={props.template} /> : null
}

/** Show the search box from this many sets. */
const SEARCH_FROM = 6

function Dialog({ template, className, grade, onClose }: NewGameModalProps & { template: GameTemplate }) {
  const game = { type: template.type, name: template.name }
  /** The game as a set game, when it plays question sets. */
  const setGame: QuestionGameCode | undefined = isSetGame(game.type) ? game.type : undefined
  const navigate = useNavigate()
  const { message } = App.useApp()
  const fullscreenOnStart = useSettingsStore((s) => s.settings.display.fullscreenOnStart)
  const createGame = useGameLibraryStore((s) => s.createGame)
  const sets = useQuestionSetStore((s) => s.sets)
  const setsStatus = useQuestionSetStore((s) => s.status)
  const loadSets = useQuestionSetStore((s) => s.load)

  const [search, setSearch] = useState('')
  /** What is being made: a set's code, 'type' or 'paste'. */
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (setGame) void loadSets()
  }, [setGame, loadSets])

  const choices = useMemo(() => (setGame ? setChoices(sets, setGame, search, 'ALL') : []), [sets, setGame, search])

  const playSet = async (set: QuestionSetSummaryResponse) => {
    if (!setGame || busy) return
    // Asked inside the click: browsers only allow full screen right after a click.
    if (fullscreenOnStart) enterFullscreen()
    setBusy(set.code)
    try {
      const used = await questionSetApi.useQuestionSet(set.code, setGame, gameName(game.name, set.title))
      if (used.skippedCount) message.info(`Trò chơi dùng ${used.questionCount} câu, bỏ qua ${used.skippedCount} câu tự luận.`)
      void loadSets() // the set's use count changed
      onClose()
      navigate(playPath({ id: used.gameCode, type: game.type }))
    } catch (error) {
      message.error(apiErrorMessage(error))
      setBusy(null)
    }
  }

  const write = async (how: 'type' | 'paste') => {
    if (busy) return
    setBusy(how)
    try {
      const code = await createGame(game.type, grade, gameName(game.name, className || newGameDay()), how === 'type')
      onClose()
      navigate(editPath(code), { state: how === 'paste' ? { paste: true } : undefined })
    } catch (error) {
      message.error(apiErrorMessage(error))
      setBusy(null)
    }
  }

  return (
    <Modal
      open
      onCancel={onClose}
      width={660}
      style={{ top: 40 }}
      footer={null}
      title={<DialogTitle icon={<FileTextIcon size={20} />} title="Chơi với câu hỏi nào?" subtitle={game.name} />}
    >
      <div className="flex flex-col gap-5 pt-2">
        {setGame && (
          <section aria-label="Bộ câu hỏi của cô" className="flex flex-col gap-3">
            <h3 className="m-0 text-[13px] font-extrabold tracking-wide text-ink-muted uppercase">Bộ câu hỏi của cô</h3>
            {sets.length >= SEARCH_FROM && (
              <Input
                size="large"
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                prefix={<SearchIcon size={18} className="text-ink-muted" />}
                placeholder="Tìm bộ câu hỏi…"
                aria-label="Tìm bộ câu hỏi"
                className="rounded-[12px] text-[15px]"
              />
            )}
            <SetList
              status={setsStatus}
              choices={choices}
              busy={busy}
              empty={sets.length === 0}
              onPlay={(set) => void playSet(set)}
              onRetry={() => void loadSets()}
            />
          </section>
        )}
        <section aria-label="Tạo mới" className="flex flex-col gap-3">
          <h3 className="m-0 text-[13px] font-extrabold tracking-wide text-ink-muted uppercase">{setGame ? 'Hoặc tạo mới' : 'Tạo nội dung'}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CreateOption
              title="✎ Soạn câu hỏi"
              text="Gõ từng câu trong trình soạn"
              busy={busy === 'type'}
              disabled={!!busy}
              onClick={() => void write('type')}
            />
            <CreateOption
              title="📋 Dán từ Word / Excel"
              text="Đã có sẵn câu hỏi ở chỗ khác"
              busy={busy === 'paste'}
              disabled={!!busy}
              onClick={() => void write('paste')}
            />
          </div>
        </section>
      </div>
    </Modal>
  )
}

/** "Trắc nghiệm – Toán 3: Bảng nhân 7", within the length a game name takes. */
function gameName(kind: string, what: string): string {
  return `${kind} – ${what}`.slice(0, MAX_GAME_NAME)
}

/** "21/10": names a game written from scratch when there is no class. */
function newGameDay(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
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

function CreateOption({ title, text, busy, disabled, onClick }: { title: string; text: string; busy: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className="flex cursor-pointer flex-col gap-1 rounded-[16px] border-2 border-line-soft bg-white px-4 py-4 text-left font-[inherit] text-ink transition enabled:hover:border-primary enabled:hover:bg-primary-soft/40 disabled:cursor-wait disabled:opacity-60"
    >
      <span className="text-[16px] font-extrabold">{busy ? 'Đang tạo…' : title}</span>
      <span className="text-[13.5px] text-ink-muted">{text}</span>
    </button>
  )
}

interface SetListProps {
  status: string
  choices: ReturnType<typeof setChoices>
  /** The set being made into a game. */
  busy: string | null
  /** The teacher has no set at all */
  empty: boolean
  onPlay: (set: QuestionSetSummaryResponse) => void
  onRetry: () => void
}

/** The sets, those the game can play first, each played with one click; the others say why they cannot be. */
function SetList({ status, choices, busy, empty, onPlay, onRetry }: SetListProps) {
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
    return <p className="m-0 px-4 py-6 text-center text-[14.5px] text-ink-muted">Đang tải bộ câu hỏi…</p>
  }
  if (empty) {
    return (
      <p className="m-0 rounded-[14px] bg-surface-soft px-4 py-5 text-center text-[14.5px] text-ink-muted">
        Cô chưa có bộ câu hỏi nào. Soạn câu hỏi bên dưới, hoặc <Link to="/question-sets">tạo bộ câu hỏi</Link> để dùng cho nhiều trò.
      </p>
    )
  }
  if (!choices.length) {
    return <p className="m-0 rounded-[14px] bg-surface-soft px-4 py-5 text-center text-[14.5px] text-ink-muted">Không có bộ câu hỏi nào phù hợp tìm kiếm.</p>
  }
  return (
    <ul aria-label="Bộ câu hỏi" className="m-0 flex max-h-[min(232px,32vh)] list-none flex-col gap-2 overflow-y-auto p-0 pr-1">
      {choices.map(({ set, usable }) => {
        const fits = usable > 0
        return (
          <li
            key={set.code}
            aria-label={set.title}
            className={`flex items-center gap-3.5 rounded-[14px] border-2 border-line-soft bg-white px-3.5 py-2.5 ${fits ? '' : 'bg-surface-soft'}`}
          >
            <img src={subjectArt(set.subject)} alt="" className={`hidden h-10 w-[46px] shrink-0 rounded-[10px] object-cover sm:block ${fits ? '' : 'opacity-50 grayscale'}`} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={`line-clamp-2 text-[15px] leading-snug font-extrabold ${fits ? '' : 'text-ink-muted'}`}>{set.title}</span>
              <span className="text-[13px] text-ink-muted">
                {fits ? `${usable}/${set.questionCount} câu · ${KIND_LABELS[kindOf(set)]}` : 'Chưa có câu trắc nghiệm cho trò này'}
              </span>
            </span>
            {fits && (
              <Button
                type="primary"
                loading={busy === set.code}
                disabled={!!busy && busy !== set.code}
                onClick={() => onPlay(set)}
                aria-label={`Chơi với ${set.title}`}
                className="h-10 shrink-0 rounded-[12px] px-4 font-extrabold"
              >
                ▶ Chơi
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
