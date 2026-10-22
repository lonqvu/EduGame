import { App, Button, Input, Modal } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { playSample } from '@/api/gameApi'
import * as questionSetApi from '@/api/questionSetApi'
import { FileTextIcon, SearchIcon } from '@/components/ui/icons'
import { alsoPlayableAs, editPath, gameRegistry } from '@/game-engine/registry'
import { useClassStore } from '@/store/classStore'
import { useGameLibraryStore } from '@/store/gameLibraryStore'
import { useQuestionSetStore } from '@/store/questionSetStore'
import type { GameSummary, GameType } from '@/types/game'
import { apiErrorMessage } from '@/utils/apiError'
import { fold } from '@/utils/classrooms'
import { isSetGame, setChoices, subjectArt } from '@/utils/questionSets'

/** Longest game name the backend takes. */
export const MAX_GAME_NAME = 50
/** Show the search box from this many choices. */
const SEARCH_FROM = 6

interface QuestionSourceModalProps {
  open: boolean
  /** The game played: its type, or the one its items are played as (`?as=`). */
  mode: GameType
  /** "Rung chuông vàng" */
  kindName: string
  /** The game on the introduction now. */
  current: GameSummary
  onClose: () => void
}

/** One row of the list: the questions it plays, and how to switch to them. */
interface Source {
  key: string
  title: string
  detail: string
  /** An image, or an emoji. */
  art: string
  current?: boolean
  pick?: () => Promise<void>
}

/**
 * "Đổi câu hỏi" on the game introduction: one list of the questions the game can be played with (the sample, the
 * teacher's question sets, the games she wrote), each picked with one click and opened on this introduction in place
 * of the current one; or new questions, written or pasted in the editor.
 */
export function QuestionSourceModal(props: QuestionSourceModalProps) {
  // Each opening starts afresh.
  return props.open ? <Dialog {...props} /> : null
}

function Dialog({ mode, kindName, current, onClose }: QuestionSourceModalProps) {
  const setGame = isSetGame(mode) ? mode : undefined
  const navigate = useNavigate()
  const { message } = App.useApp()
  const games = useGameLibraryStore((s) => s.games)
  const loadGames = useGameLibraryStore((s) => s.loadGames)
  const createGame = useGameLibraryStore((s) => s.createGame)
  const sets = useQuestionSetStore((s) => s.sets)
  const setsStatus = useQuestionSetStore((s) => s.status)
  const loadSets = useQuestionSetStore((s) => s.load)
  const className = useClassStore((s) => s.className)
  const grade = useClassStore((s) => s.grade)
  const loadClass = useClassStore((s) => s.load)

  const [search, setSearch] = useState('')
  /** The row (or 'type' / 'paste') being opened. */
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void loadGames()
    void loadClass()
    if (setGame) void loadSets()
  }, [setGame, loadGames, loadClass, loadSets])

  /** The introduction of another game, in place of this one ("Quay lại" still leaves the game). */
  const open = (game: { id: string; type: GameType }, title: string) => {
    message.success(`Đã đổi sang: ${title}`)
    onClose()
    navigate(`/play/${game.id}${game.type === mode ? '' : `?as=${mode}`}`, { replace: true })
  }

  const sources = (): Source[] => {
    const unit = gameRegistry[mode].itemUnit
    const sample: Source = {
      key: 'sample',
      title: 'Câu hỏi mẫu',
      detail: 'Soạn sẵn để chơi thử',
      art: '✨',
      current: !!current.sample,
      pick: async () => open({ id: (await playSample(mode)).code, type: mode }, 'Câu hỏi mẫu'),
    }
    const mine: Source[] = current.sample ? [] : [{ key: current.id, title: current.title, detail: `${current.itemCount} ${unit}`, art: '📝', current: true }]
    const fromSets: Source[] = setGame
      ? setChoices(sets, setGame, '', 'ALL')
          .filter((c) => c.usable > 0)
          .map(({ set, usable }) => ({
            key: set.code,
            title: set.title,
            detail: `Bộ câu hỏi · ${usable} câu`,
            art: subjectArt(set.subject),
            pick: async () => {
              const used = await questionSetApi.useQuestionSet(set.code, setGame, `${kindName} – ${set.title}`.slice(0, MAX_GAME_NAME))
              if (used.skippedCount) message.info(`Trò chơi dùng ${used.questionCount} câu, bỏ qua ${used.skippedCount} câu tự luận.`)
              void loadSets() // the set's use count changed
              open({ id: used.gameCode, type: mode }, set.title)
            },
          }))
      : []
    const written: Source[] = games
      .filter((g) => !g.sample && g.id !== current.id && (g.type === mode || alsoPlayableAs(g.type).includes(mode)))
      .map((g) => ({
        key: g.id,
        title: g.title,
        detail: `Trò cô đã soạn · ${g.itemCount} ${gameRegistry[g.type].itemUnit}`,
        art: '📝',
        pick: async () => open(g, g.title),
      }))
    return [...mine, sample, ...fromSets, ...written]
  }
  const all = sources()

  const words = fold(search).split(/\s+/).filter(Boolean)
  const shown = all.filter((s) => words.every((w) => fold(s.title).includes(w)))

  const run = async (key: string, task: () => Promise<void>) => {
    if (busy) return
    setBusy(key)
    try {
      await task()
    } catch (error) {
      message.error(apiErrorMessage(error))
      setBusy(null)
    }
  }

  const write = (how: 'type' | 'paste') =>
    run(how, async () => {
      const code = await createGame(mode, grade, `${kindName} – ${className || newGameDay()}`.slice(0, MAX_GAME_NAME), how === 'type')
      onClose()
      navigate(editPath(code), { state: how === 'paste' ? { paste: true } : undefined })
    })

  return (
    <Modal
      open
      onCancel={onClose}
      width={620}
      style={{ top: 40 }}
      footer={null}
      title={
        <span className="flex items-start gap-3 pr-6">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-white">
            <FileTextIcon size={20} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[18px] leading-tight font-black">Chơi với câu hỏi nào?</span>
            <span className="truncate text-[13.5px] font-normal text-ink-muted">{kindName}</span>
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        <section aria-label="Chọn câu hỏi có sẵn" className="flex flex-col gap-3">
          <h3 className="m-0 text-[13px] font-extrabold tracking-wide text-ink-muted uppercase">Chọn câu hỏi có sẵn</h3>
          {all.length >= SEARCH_FROM && (
            <Input
              size="large"
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<SearchIcon size={18} className="text-ink-muted" />}
              placeholder="Tìm câu hỏi…"
              aria-label="Tìm câu hỏi"
              className="rounded-[12px] text-[15px]"
            />
          )}
          <ul aria-label="Câu hỏi có sẵn" className="m-0 flex max-h-[min(300px,40vh)] list-none flex-col gap-2 overflow-y-auto p-0 pr-1">
            {shown.map((source) => (
              <SourceRow key={source.key} source={source} busy={busy} onPick={(pick) => void run(source.key, pick)} />
            ))}
            {setGame && setsStatus === 'loading' && <li className="px-4 py-2 text-[14px] text-ink-muted">Đang tải bộ câu hỏi…</li>}
            {!shown.length && <li className="rounded-[14px] bg-surface-soft px-4 py-4 text-center text-[14.5px] text-ink-muted">Không tìm thấy câu hỏi phù hợp.</li>}
          </ul>
        </section>

        <section aria-label="Tạo câu hỏi mới" className="flex flex-col gap-3">
          <h3 className="m-0 text-[13px] font-extrabold tracking-wide text-ink-muted uppercase">Tạo câu hỏi mới</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CreateOption title="✎ Soạn câu hỏi" text="Gõ từng câu trong trình soạn" busy={busy === 'type'} disabled={!!busy} onClick={() => void write('type')} />
            <CreateOption title="📋 Dán từ Word / Excel" text="Đã có sẵn câu hỏi ở chỗ khác" busy={busy === 'paste'} disabled={!!busy} onClick={() => void write('paste')} />
          </div>
        </section>
      </div>
    </Modal>
  )
}

/** "21/10": names a game written from scratch when there is no class. */
function newGameDay(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function SourceRow({ source, busy, onPick }: { source: Source; busy: string | null; onPick: (pick: () => Promise<void>) => void }) {
  const { title, detail, art, current, pick } = source
  return (
    <li
      aria-label={title}
      aria-current={current || undefined}
      className={`flex items-center gap-3.5 rounded-[14px] border-2 px-3.5 py-2.5 ${current ? 'border-primary bg-primary-soft/40' : 'border-line-soft bg-white'}`}
    >
      {art.startsWith('/') ? (
        <img src={art} alt="" className="h-10 w-[46px] shrink-0 rounded-[10px] object-cover" />
      ) : (
        <span aria-hidden="true" className="flex h-10 w-[46px] shrink-0 items-center justify-center rounded-[10px] bg-surface-soft text-[20px]">
          {art}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-[15px] leading-snug font-extrabold">{title}</span>
        <span className="text-[13px] text-ink-muted">{detail}</span>
      </span>
      {current || !pick ? (
        <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[13px] font-extrabold text-white">Đang dùng</span>
      ) : (
        <Button
          type="primary"
          loading={busy === source.key}
          disabled={!!busy && busy !== source.key}
          onClick={() => onPick(pick)}
          aria-label={`Chọn ${title}`}
          className="h-10 shrink-0 rounded-[12px] px-5 font-extrabold"
        >
          Chọn
        </Button>
      )}
    </li>
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
