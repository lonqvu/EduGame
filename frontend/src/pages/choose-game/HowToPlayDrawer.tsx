import { Drawer } from 'antd'
import { gameGuide, isGuideGame } from '@/game-engine/gameGuide'
import { gameRegistry } from '@/game-engine/registry'
import type { GameType } from '@/types/game'
import { TOOL_GUIDES } from '@/utils/toolGuides'

const STEP_COLORS = ['#3563E9', '#F28C28', '#2E9E6A', '#8B5CF6']

export interface HowToPlayGame {
  type: GameType
  name: string
  description: string
  art: string
}

interface HowToPlayDrawerProps {
  /** The game shown; none: closed. */
  game: HowToPlayGame | null
  /** "Chơi ngay" is opening it. */
  opening: boolean
  onClose: () => void
  onPlay: () => void
  /** "Dùng câu hỏi của cô", for games that use questions. */
  onWrite: () => void
}

/**
 * "Cách chơi" of a game card, for the teacher before the lesson: the card art (moving gently), what the class does in
 * a few steps, who plays and for how long, a tip, then play it with sample questions or with her own. A drawer on the
 * right; on a phone it comes up from the bottom.
 */
export function HowToPlayDrawer({ game, opening, onClose, onPlay, onWrite }: HowToPlayDrawerProps) {
  const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  const def = game ? gameRegistry[game.type] : null
  const guide = game && isGuideGame(game.type) ? gameGuide(game.type, undefined) : null
  const tool = game ? TOOL_GUIDES[game.type] : undefined
  const steps = guide?.steps ?? tool?.steps ?? []
  const tip = guide?.teacherNotes[0] ?? tool?.tip

  return (
    <Drawer
      open={!!game}
      onClose={onClose}
      placement={phone ? 'bottom' : 'right'}
      size={phone ? 'large' : 480}
      title={game ? `Cách chơi: ${game.name}` : ''}
      styles={{ body: { padding: 0 } }}
      footer={
        game &&
        def && (
          <div className="flex flex-col gap-2 py-1">
            <button
              type="button"
              onClick={onPlay}
              disabled={opening}
              aria-busy={opening}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border-0 bg-primary font-[inherit] text-[16px] font-extrabold text-white hover:brightness-110 disabled:cursor-wait"
            >
              {opening ? 'Đang mở…' : def.usesQuestions ? '▶ Chơi thử với câu hỏi mẫu' : '▶ Chơi ngay'}
            </button>
            {def.usesQuestions && (
              <button
                type="button"
                onClick={onWrite}
                className="h-11 w-full cursor-pointer rounded-[12px] border border-line bg-white font-[inherit] text-[15px] font-bold text-primary-ink hover:border-primary"
              >
                ✎ Dùng câu hỏi của cô
              </button>
            )}
          </div>
        )
      }
    >
      {game && def && (
        <div className="flex flex-col gap-5 p-5">
          <div className="overflow-hidden rounded-[18px] bg-projector">
            <img src={game.art} alt="" className="block aspect-[2/1] w-full motion-safe:animate-[guide-float_4s_ease-in-out_infinite]" />
          </div>
          <p className="m-0 text-[15.5px] leading-[1.55] text-ink">{guide?.goal ?? tool?.goal ?? game.description}</p>
          {steps.length > 0 && (
            <ol aria-label="Các bước chơi" className="m-0 flex list-none flex-col gap-3 p-0">
              {steps.map((step, i) => (
                <li key={step.title} className="flex items-start gap-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-[15px] font-black text-white"
                    style={{ background: STEP_COLORS[i % STEP_COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-col gap-0.5 pt-0.5">
                    <span className="text-[15.5px] font-extrabold">{step.title}</span>
                    <span className="text-[14px] leading-snug text-ink-soft">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2 text-[13.5px]">
            <span className="rounded-full bg-chip px-3 py-1 font-bold">👥 {def.players}</span>
            <span className="rounded-full bg-chip px-3 py-1 font-bold">⏱ {def.duration}</span>
            <span className="rounded-full bg-chip px-3 py-1 font-bold">{def.usesQuestions ? '📚 Cần câu hỏi (có sẵn câu mẫu)' : '✨ Không cần chuẩn bị'}</span>
          </div>
          {tip && (
            <p className="m-0 rounded-[14px] bg-sun-pale px-4 py-3 text-[14px] leading-snug">
              <b>💡 Mẹo:</b> {tip}
            </p>
          )}
        </div>
      )}
    </Drawer>
  )
}
