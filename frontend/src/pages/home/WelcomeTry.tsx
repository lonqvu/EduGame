import { useState } from 'react'
import { CloseIcon } from '@/components/ui/icons'
import type { GameType } from '@/types/game'

const DISMISSED_KEY = 'edugame.welcomeDismissed'

const TRIES: { type: GameType; name: string; text: string; art: string }[] = [
  { type: 'QUIZ', name: 'Trắc nghiệm', text: 'Các đội giành quyền trả lời', art: '/assets/games/card-quiz.svg' },
  { type: 'SPIN_WHEEL', name: 'Vòng quay may mắn', text: 'Gọi tên một bạn ngẫu nhiên', art: '/assets/games/card-spin-wheel.svg' },
  { type: 'GRID_BOARD', name: 'Lật ô thi đua', text: 'Lật ô, trả lời, ghi điểm', art: '/assets/games/card-grid-board.svg' },
]

function dismissedBefore(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * The first visit (no game yet): three games to try with one click, sample questions included, no class needed.
 * Gone once the teacher has a game, or closes it.
 */
export function WelcomeTry({ busy, onPlay }: { busy: string | null; onPlay: (type: GameType) => void }) {
  const [dismissed, setDismissed] = useState(dismissedBefore)
  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Private window: it shows again next visit.
    }
  }

  return (
    <section
      aria-label="Thử ngay một trò chơi"
      className="relative flex flex-col gap-4 rounded-[22px] bg-[linear-gradient(120deg,#E6F0FF_0%,#F3F8FF_55%,#FFF6DA_100%)] px-5 py-5 sm:px-7"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ẩn gợi ý"
        className="absolute top-3 right-3 flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-white/70 text-ink-soft hover:bg-white"
      >
        <CloseIcon size={18} />
      </button>
      <div className="flex flex-col gap-1 pr-10">
        <h2 className="m-0 text-[22px] leading-tight font-black">Lần đầu dùng Lớp vui? Thử ngay một trò chơi 👇</h2>
        <p className="m-0 text-[14.5px] text-ink-soft">Có sẵn câu hỏi mẫu, chưa cần tạo lớp hay soạn câu hỏi. Chỉ một lần bấm.</p>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
        {TRIES.map((t) => (
          <li key={t.type}>
            <button
              type="button"
              onClick={() => onPlay(t.type)}
              disabled={!!busy}
              aria-label={`Thử ${t.name}`}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-[16px] border-0 bg-white p-2.5 pr-4 text-left font-[inherit] text-ink shadow-[0_1px_3px_rgba(31,42,68,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(31,42,68,0.1)] disabled:cursor-wait"
            >
              <img src={t.art} alt="" className="aspect-[2/1] w-[96px] shrink-0 rounded-[10px]" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15.5px] font-black">{t.name}</span>
                <span className="truncate text-[13px] text-ink-soft">{t.text}</span>
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-black text-white group-hover:brightness-110">
                {busy === t.type ? '…' : '▶'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
